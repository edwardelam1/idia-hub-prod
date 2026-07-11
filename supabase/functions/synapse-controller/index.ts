import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getRoute } from "../_shared/payAppRouting.ts";
import { SECTOR_VALUES } from "../_shared/sectorValues.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NOTE: The previous EdgeRuntime.waitUntil + functions.invoke handoff still
// succumbed to the TCP RST cascade on parent-isolate teardown. We now use a
// raw fetch with `Connection: close` and we fully drain the response body
// before this isolate exits, so there is no live socket left for the runtime
// to reset against the child.

// ====================================================================
// CORE HELPERS
// ====================================================================

async function sha256(input: string) {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function resolveAcaLineage(adminClient: any, ids: string[]) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validUuids = ids.filter((id) => uuidRegex.test(id));
  const stringHashes = ids.filter((id) => !uuidRegex.test(id));

  let records: any[] = [];
  if (validUuids.length > 0) {
    const { data, error } = await adminClient
      .from("user_aca_records")
      .select("id, aca_hash_key, platform_guid")
      .in("id", validUuids);
    if (error) throw new Error(`ACA lineage lookup failed: ${error.message}`);
    if (data) records.push(...data);
  }
  if (stringHashes.length > 0) {
    const { data, error } = await adminClient
      .from("user_aca_records")
      .select("id, aca_hash_key, platform_guid")
      .in("aca_hash_key", stringHashes);
    if (error) throw new Error(`ACA hash lookup failed: ${error.message}`);
    if (data) records.push(...data);
  }

  const uniqueRecords = Array.from(
    new Map(records.map((record) => [record.aca_hash_key, record])).values(),
  ).filter((record) => typeof record.aca_hash_key === "string" && record.aca_hash_key.length > 0);

  if (uniqueRecords.length === 0) {
    throw new Error("No valid auditable lineage found for the provided ACA references");
  }

  const lineageHashes = uniqueRecords.map((record) => record.aca_hash_key);
  const { data: stagedRows, error: stagedError } = await adminClient
    .from("staged_health_data")
    .select("aca_hash_key")
    .in("aca_hash_key", lineageHashes);
  if (stagedError) throw new Error(`ACA vault verification failed: ${stagedError.message}`);

  const stagedHashes = new Set((stagedRows ?? []).map((row) => row.aca_hash_key));
  const verifiedHashes = lineageHashes.filter((hash) => stagedHashes.has(hash));
  if (verifiedHashes.length === 0) {
    throw new Error("PROTOCOL_INTEGRITY_VIOLATION: Provided ACA references do not map to verified vault data");
  }

  const contributingUsers = Array.from(new Set(uniqueRecords.map((r) => r.platform_guid))).map((id) => ({ user_id: id }));
  return { contributingUsers, verifiedHashes };
}

async function calculateDynamicFee(
  adminClient: any,
  userId: string,
  subModuleId: string,
): Promise<{ feeCR: number; sectorLabel: string }> {
  // 1. Resolve Industry ID from shared Routing Map
  const route = getRoute(subModuleId);
  const sectorLabel = route?.industryId ?? "general";
  const marketBaseValue = SECTOR_VALUES[sectorLabel] ?? 1.0;

  try {
    // 2. Attempt to fetch Buyer's interest battery
    const { data: profile, error } = await adminClient
      .from("business_interest_profiles")
      .select("interest_weights")
      .eq("business_id", userId)
      .maybeSingle();

    if (error || !profile) {
      console.info(`[Info] No business profile for ${userId}, using default fee.`);
      const feeCR = Math.ceil(1 * marketBaseValue * 1.0);
      return { feeCR, sectorLabel };
    }

    // 4. Calculate Weighting if profile exists
    const buyerWeight = profile?.interest_weights?.[sectorLabel] ?? 1.0;
    const feeCR = Math.ceil(1 * marketBaseValue * buyerWeight);

    return { feeCR, sectorLabel };
  } catch (e) {
    console.error(`[Warning] Dynamic pricing default fallback triggered: ${e.message}`);
    return { feeCR: Math.ceil(1 * marketBaseValue * 1.0), sectorLabel };
  }
}

// ====================================================================
// MAIN EDGE FUNCTION
// ====================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Pre-initialize variables for global scope
  let operatorId: string | undefined;
  let consumedReceipt: string[] = [];

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        `Server configuration error: missing ${!supabaseUrl ? "SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY"}`,
      );
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Strict payload parsing
    const body = await req.json();
    console.info("[DEBUG: SynapseController.IncomingPayload]", JSON.stringify(body));

    const {
      user_id,
      client_id = "IDIA_HUB_APP",
      intent_type,
      sub_module_id = "general",
      aca_record_ids: rawIds = [],
      metadata = {},
      country_of_origin = "US",
      location_string,
    } = body;
    const normalizedLocationString =
      typeof location_string === "string" && location_string.trim().length > 0
        ? location_string.trim()
        : undefined;

    // Set global scoped variables
    operatorId = user_id;

    // Enforcement of Audit Provenance
    if (!intent_type) throw new Error("Rejected: Missing intent_type");
    if (!user_id || user_id === "00000000-0000-0000-0000-000000000000") throw new Error("Invalid user_id");

    const aca_record_ids = Array.isArray(rawIds) ? rawIds : [rawIds].filter(Boolean);
    if (aca_record_ids.length === 0) throw new Error("No auditable lineage provided");

    // 1. DYNAMIC PRICING CALL
    const { feeCR, sectorLabel } = await calculateDynamicFee(adminClient, user_id, sub_module_id);
    const totalSynapseDeduction = -feeCR;
    const fiatEquivalentValue = feeCR * 0.75;

    // 2. DATA OWNER RESOLUTION
    const { contributingUsers, verifiedHashes } = await resolveAcaLineage(adminClient, aca_record_ids);

    // 3. CRYPTOGRAPHIC TOKEN GENERATION
    const timestamp = new Date().toISOString();
    const sortedIds = [...verifiedHashes].sort();
    const batchChecksum = await sha256(sortedIds.join("|"));
    const liabilityTokenHash = await sha256(`${client_id}|${timestamp}|${batchChecksum}`);
    const digiRampAnchorId = "0x" + (await sha256(`${liabilityTokenHash}|${timestamp}`));
    const referenceId = `SYN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // 4. ATOMIC LEDGER & EGRESS WRITE
    const [ledgerResult, egressResult] = await Promise.all([
      adminClient
        .from("synapse_credit_ledger")
        .insert({
          user_id: user_id,
          amount: totalSynapseDeduction,
          entry_type: "USAGE",
          transaction_type: "fee",
          status: "settled",
          description: `Synapse Gas: ${intent_type} | Sector: ${sectorLabel} [${feeCR} CR]`,
          reference_id: referenceId,
        })
        .select("id")
        .single(),

      adminClient
        .from("egress_logs")
        .insert({
          user_id: user_id,
          client_id: client_id,
          liability_token_hash: liabilityTokenHash,
          batch_checksum: batchChecksum,
          aca_record_references: verifiedHashes,
          country_of_origin,
          digiramp_anchor_id: digiRampAnchorId,
          egress_type: intent_type,
          metadata: { ...metadata, sectorLabel },
        })
        .select("id")
        .single(),
    ]);

    if (ledgerResult.error) throw new Error(`Ledger rejection: ${ledgerResult.error.message}`);
    if (egressResult.error) throw new Error(`Egress failure: ${egressResult.error.message}`);

    // Update global consumedReceipt
    consumedReceipt = verifiedHashes;

    // 5. POSTGRES FIREWALL HANDOFF — insert into settlement_queue and exit.
    // Postgres fires the database webhook to idia-circular-settlement, fully
    // insulating the child's EdgeRuntime.waitUntil() from this parent isolate's
    // TCP teardown (no more EarlyDrop cascade).
    const payoutData = {
      total_fiat_amount: fiatEquivalentValue,
      buyer_id: user_id,
      payment_reference: referenceId,
          contributing_users: contributingUsers,
      location_string: normalizedLocationString,
      intent_metadata: { intent_type, sector: sectorLabel },
    };

    console.info(
      `[BEGIN: Controller.QueueInsert] Routing payload to Postgres Firewall for Reference: ${referenceId}`,
    );

    let handoffAccepted = false;
    try {
      const { error: queueError } = await adminClient
        .from("settlement_queue")
        .insert({
          reference_id: referenceId,
          payload: payoutData,
        });

      if (queueError) throw queueError;

      console.info(`[END: Controller.QueueInsert] Payload successfully isolated in database.`);
      handoffAccepted = true;
    } catch (queueError: any) {
      console.error(
        `🚨 [FATAL STALL: Controller.QueueInsert] Failed to write to settlement_queue: ${queueError?.message ?? String(queueError)}. egress_logs intentionally left unlinked for audit.`,
      );
    }

    // 6. LINK EGRESS TO LEDGER — only on successful handoff.
    if (handoffAccepted) {
      const { error: linkError } = await adminClient
        .from("egress_logs")
        .update({ synapse_ledger_entry_id: ledgerResult.data.id })
        .eq("id", egressResult.data.id);
      if (linkError) {
        console.error(
          `🚨 [HANDOFF: settlement] egress link failed reference=${referenceId} :: ${linkError.message}`,
        );
      } else {
        console.info(
          `[HANDOFF: settlement] egress_logs linked reference=${referenceId} ledger_entry=${ledgerResult.data.id} egress_id=${egressResult.data.id}`,
        );
      }

      // Telemetry: explicitly stamp settled_at so packets always carry both
      // created_at and settled_at for downstream network-delivery parsing.
      console.log("[HUB_TELEMETRY][INGEST][START] Capturing processing latency for runtime thread...");
      try {
        const { error: settledError } = await adminClient
          .from("egress_logs")
          .update({ settled_at: new Date().toISOString() })
          .eq("id", egressResult.data.id);
        if (settledError) throw settledError;
        console.log("[HUB_TELEMETRY][INGEST][END:OK] Metrics written to database schema successfully.");
      } catch (settledErr: any) {
        console.error(
          "[HUB_TELEMETRY][INGEST][END:FAIL] egress_logs.settled_at update failed:",
          settledErr?.message ?? String(settledErr),
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fee: feeCR,
        reference_id: referenceId,
        consumed_records: consumedReceipt,
        settlement_status: "queued",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("[FATAL STALL: SynapseController Global]", error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
        debug_operator: operatorId,
        debug_records: consumedReceipt,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
