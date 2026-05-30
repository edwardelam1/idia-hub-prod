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

async function resolveContributors(adminClient: any, ids: string[]) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validUuids = ids.filter((id) => uuidRegex.test(id));
  const stringHashes = ids.filter((id) => !uuidRegex.test(id));

  let records: any[] = [];
  if (validUuids.length > 0) {
    const { data } = await adminClient.from("user_aca_records").select("platform_guid").in("id", validUuids);
    if (data) records.push(...data);
  }
  if (stringHashes.length > 0) {
    const { data } = await adminClient
      .from("user_aca_records")
      .select("platform_guid")
      .in("aca_hash_key", stringHashes);
    if (data) records.push(...data);
  }
  return Array.from(new Set(records.map((r) => r.platform_guid))).map((id) => ({ user_id: id }));
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    const uniqueContributors = await resolveContributors(adminClient, aca_record_ids);

    // 3. CRYPTOGRAPHIC TOKEN GENERATION
    const timestamp = new Date().toISOString();
    const sortedIds = [...aca_record_ids].sort();
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
          aca_record_references: aca_record_ids,
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
    consumedReceipt = aca_record_ids;

    // 5. SETTLEMENT HANDOFF — raw fetch with forced graceful socket closure.
    // Why not supabase-js .invoke(): the SDK opens a keep-alive socket. When
    // this parent isolate is torn down, the orchestrator sends a TCP RST which
    // kills the child's EdgeRuntime.waitUntil() worker (EarlyDrop @ ~214ms).
    // Fix: explicit `Connection: close` + full body drain via await
    //      response.text() so the socket is closed gracefully before exit.
    const handoffStart = Date.now();
    const payoutData = {
      total_fiat_amount: fiatEquivalentValue,
      buyer_id: user_id,
      payment_reference: referenceId,
      contributing_users: uniqueContributors,
      location_string: normalizedLocationString,
      intent_metadata: { intent_type, sector: sectorLabel },
    };
    const settlementUrl = `${supabaseUrl}/functions/v1/idia-circular-settlement`;
    console.info(
      `[HANDOFF: settlement] raw-fetch initiated reference=${referenceId} buyer=${user_id} fiat=${fiatEquivalentValue} contributors=${uniqueContributors.length} url=${settlementUrl} ts=${handoffStart}`,
    );

    let handoffAccepted = false;
    try {
      const settlementRes = await fetch(settlementUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Edge-to-edge auth: same pattern best-friend-ai &
          // marketplace-bundle-access already use to clear the gateway.
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          // Force the runtime to NOT pool this socket. Combined with the
          // body drain below, this guarantees a graceful FIN before the
          // parent isolate exits — no TCP RST cascade.
          Connection: "close",
        },
        body: JSON.stringify(payoutData),
      });

      // CRITICAL: fully drain the response stream. If we skip this the Deno
      // runtime keeps the socket alive and the orchestrator's teardown sends
      // a TCP RST that murders the child's waitUntil() worker.
      const responseText = await settlementRes.text();
      const elapsedMs = Date.now() - handoffStart;

      if (!settlementRes.ok) {
        console.error(
          `🚨 [HANDOFF: settlement] non-2xx reference=${referenceId} status=${settlementRes.status} elapsed_ms=${elapsedMs} body=${responseText}. egress_logs intentionally left unlinked for audit.`,
        );
      } else {
        handoffAccepted = true;
        console.info(
          `[HANDOFF: settlement] ACCEPTED reference=${referenceId} status=${settlementRes.status} elapsed_ms=${elapsedMs} body=${responseText}`,
        );
      }
    } catch (handoffError: any) {
      console.error(
        `🚨 [HANDOFF: settlement] network failure reference=${referenceId} :: ${handoffError?.message ?? String(handoffError)}. egress_logs intentionally left unlinked for audit.`,
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
