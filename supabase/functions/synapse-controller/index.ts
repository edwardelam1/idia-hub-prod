import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getRoute } from "../_shared/payAppRouting.ts";
import { SECTOR_VALUES } from "../_shared/sectorValues.ts";
import { calculateDatasetRelevance, resolveCanonicalCategory } from "../_shared/buyer-affinity.ts";

import { corsFor, resolveCaller, denied } from "../_shared/edge-guard.ts";

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

  // Verify lineage set-wise via RPC. Row-returning `.in()` scans were capped at
  // 1000 rows by PostgREST, silently dropping consent hashes from the receipt.
  const stagedHashes = new Set<string>();
  console.info(`[PHASE_START: SynapseController.LineageVerify] hashes=${lineageHashes.length}`);
  try {
    const { data: verifyRows, error: verifyError } = await adminClient.rpc("verify_aca_hashes", {
      _hashes: lineageHashes,
    });
    if (verifyError) throw verifyError;
    const perVault: Record<string, number> = {};
    (verifyRows ?? []).forEach((row: { aca_hash_key: string; vault: string }) => {
      stagedHashes.add(row.aca_hash_key);
      perVault[row.vault] = (perVault[row.vault] ?? 0) + 1;
    });
    console.info(
      `[PHASE_END: SynapseController.LineageVerify] verified=${stagedHashes.size} breakdown=${JSON.stringify(perVault)}`,
    );
  } catch (verifyErr: any) {
    console.error(
      `[PHASE_END: SynapseController.LineageVerify] failed: ${verifyErr?.message ?? String(verifyErr)}\n${verifyErr?.stack ?? ""}`,
    );
  }

  const verifiedHashes = lineageHashes.filter((hash) => stagedHashes.has(hash));
  if (verifiedHashes.length === 0) {
    throw new Error("PROTOCOL_INTEGRITY_VIOLATION: Provided ACA references do not map to verified vault data");
  }

  const contributingUsers = Array.from(new Set(uniqueRecords.map((r) => r.platform_guid))).map((id) => ({ user_id: id }));
  return { contributingUsers, verifiedHashes };
}

/** Volume factor: consumption scales the charge sub-linearly with record count. */
function recordVolumeFactor(recordCount: number): number {
  const safeCount = Number.isFinite(recordCount) && recordCount > 0 ? recordCount : 1;
  return Math.max(1, Math.log10(1 + safeCount));
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

/**
 * Conversational Best Friend AI turns are billed as a flat 1.00 CR per chat,
 * regardless of how many records the answer touched.
 */
const FLAT_CHAT_FEE_CR = 1.0;
const FLAT_FEE_INTENTS = new Set([
  "BEST_FRIEND_AI_CHAT",
  "MARKETPLACE_RESEARCH",
  "ACA_CATALOG_LOOKUP",
  "ACA_FILE_INSPECT",
]);

async function calculateDynamicFee(
  adminClient: any,
  userId: string,
  subModuleId: string,
  datasetJurisdiction = "USA",
  datasetCadence: "STREAMING" | "INTRADAY" | "BATCH" = "BATCH",
  recordCount = 1,
  intentType = "",
): Promise<{ feeCR: number; sectorLabel: string; buyerWeight: number; recordFactor: number }> {
  if (FLAT_FEE_INTENTS.has(intentType)) {
    const flatSector = getRoute(subModuleId)?.industryId ?? "general";
    console.log(
      `[SYNAPSE_CONTROLLER:FLAT_CHAT_FEE] intent=${intentType} fee=${FLAT_CHAT_FEE_CR} CR records=${recordCount}`,
    );
    return { feeCR: FLAT_CHAT_FEE_CR, sectorLabel: flatSector, buyerWeight: 1.0, recordFactor: 1 };
  }
  // 1. Resolve Industry ID from shared Routing Map
  const route = getRoute(subModuleId);
  const sectorLabel = route?.industryId ?? "general";
  const marketBaseValue = SECTOR_VALUES[sectorLabel] ?? 1.0;
  const recordFactor = round4(recordVolumeFactor(recordCount));
  const priceOf = (weight: number) =>
    Math.max(0.01, round4(marketBaseValue * weight * recordFactor));

  try {
    // 2. Fetch the buyer's diagnostic profile vector (server-calculated weights)
    const { data: vectorData, error: vectorError } = await adminClient
      .from("buyer_profile_vectors")
      .select("role, jurisdiction, latency_requirement, weights")
      .eq("user_id", userId)
      .maybeSingle();

    if (vectorError) throw vectorError;

    if (!vectorData) {
      console.warn(`[SYNAPSE_CONTROLLER:VECTOR_MISSING] No vector for ${userId}. Default weight 1.0`);
      return { feeCR: priceOf(1.0), sectorLabel, buyerWeight: 1.0, recordFactor };
    }

    const canonicalCat = resolveCanonicalCategory(`${sectorLabel} ${subModuleId ?? ""}`);
    const { relevance, breakdown } = calculateDatasetRelevance(
      {
        userId,
        role: vectorData.role,
        jurisdiction: vectorData.jurisdiction,
        latencyRequirement: vectorData.latency_requirement,
        weights: vectorData.weights,
      },
      canonicalCat,
      datasetJurisdiction,
      datasetCadence,
    );

    console.log(
      `[SYNAPSE_CONTROLLER:VECTOR_APPLIED] cat=${canonicalCat} weight=${relevance} base=${breakdown.baseWeight} juris=${breakdown.jurisdictionFactor} lat=${breakdown.latencyFactor} records=${recordCount} factor=${recordFactor}`,
    );

    return { feeCR: priceOf(relevance), sectorLabel, buyerWeight: relevance, recordFactor };
  } catch (e: any) {
    console.error(
      `[SYNAPSE_CONTROLLER:VECTOR_LOOKUP_ERROR] Fallback to 1.0: ${e?.message ?? String(e)}\n${e?.stack ?? ""}`,
    );
    return { feeCR: priceOf(1.0), sectorLabel, buyerWeight: 1.0, recordFactor };
  }
}


// ====================================================================
// MAIN EDGE FUNCTION
// ====================================================================

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.log("[SynapseController][AUTH][STEP_START]");
  const caller = await resolveCaller(req, "SynapseController", { allowPlainUsers: true });
  if (!caller) {
    console.log("[SynapseController][AUTH][STEP_END] rejected");
    return denied(req, 401);
  }
  console.log(`[SynapseController][AUTH][STEP_END] caller=${caller.kind}`);

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
    // Signed-in users without an elevated role may only bill themselves.
    if (caller.kind === "user" && caller.userId !== user_id) {
      console.log("[SynapseController][AUTH][STEP_END] user attempted to bill another account — rejected");
      return denied(req, 403);
    }

    const aca_record_ids = Array.isArray(rawIds) ? rawIds : [rawIds].filter(Boolean);
    if (aca_record_ids.length === 0) throw new Error("No auditable lineage provided");

    // 1. DATA OWNER RESOLUTION (must precede pricing: volume drives the fee)
    const { contributingUsers, verifiedHashes } = await resolveAcaLineage(adminClient, aca_record_ids);

    // 2. DYNAMIC PRICING CALL
    const { feeCR, sectorLabel, buyerWeight, recordFactor } = await calculateDynamicFee(
      adminClient,
      user_id,
      sub_module_id,
      body?.jurisdiction ?? "USA",
      body?.cadence ?? "BATCH",
      verifiedHashes.length,
      intent_type,
    );
    console.log(
      `[SYNAPSE_CONTROLLER:FEE_RESOLVED] ${feeCR} CR @ weight ${buyerWeight} × records ${verifiedHashes.length} (factor ${recordFactor})`,
    );

    const totalSynapseDeduction = -feeCR;
    const fiatEquivalentValue = feeCR * 0.75;

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
          metadata: {
            buyer_weight: buyerWeight,
            sector_label: sectorLabel,
            record_factor: recordFactor,
            consumed_record_count: verifiedHashes.length,
          },
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
          data_points_count: verifiedHashes.length,
          metadata: {
            ...metadata,
            sectorLabel,
            sector_label: sectorLabel,
            buyer_weight: buyerWeight,
            record_factor: recordFactor,
            consumed_record_count: verifiedHashes.length,
          },
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

    // 7. UNIFIED ACTIVITY INDEX — generic receipt row. First-party clients
    // enrich this same idempotent row with their complete visible input/result.
    console.info("[PHASE_START: SynapseController.ActivityHistory] Indexing receipt.");
    const source = client_id.includes("BEST_FRIEND")
      ? "best_friend"
      : client_id.includes("MARKETPLACE")
        ? "marketplace"
        : "trading_desk";
    const { error: activityError } = await adminClient.from("activity_history").upsert(
      {
        user_id,
        source,
        action: intent_type,
        title: metadata?.bundle_title ?? intent_type.replaceAll("_", " "),
        input_payload: metadata ?? {},
        result_payload: {
          reference_id: referenceId,
          consumed_records: verifiedHashes,
          settlement_status: handoffAccepted ? "queued" : "stalled",
        },
        status: handoffAccepted ? "completed" : "stalled",
        records_consumed: verifiedHashes.length,
        synapse_credit_cost: feeCR,
        egress_log_id: egressResult.data.id,
        synapse_ledger_entry_id: ledgerResult.data.id,
        reference_id: referenceId,
        idempotency_key: referenceId,
      },
      { onConflict: "user_id,idempotency_key" },
    );
    if (activityError) {
      console.error(
        `[PHASE_END: SynapseController.ActivityHistory] Failed: ${activityError.message}\n${activityError.stack ?? ""}`,
      );
    } else {
      console.info("[PHASE_END: SynapseController.ActivityHistory] Receipt indexed.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        fee: feeCR,
        reference_id: referenceId,
        egress_log_id: egressResult.data.id,
        liability_token_hash: liabilityTokenHash,
        digiramp_anchor_id: digiRampAnchorId,
        synapse_ledger_entry_id: ledgerResult.data.id,
        consumed_records: consumedReceipt,
        settlement_status: "queued",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("[SynapseController][ERROR] global", error?.message, { operatorId, records: consumedReceipt.length });
    // Only pass through user-actionable messages; mask internals.
    const raw = String(error?.message ?? "");
    const safe = /insufficient|Rejected:|Invalid user_id|No auditable lineage/i.test(raw)
      ? raw.slice(0, 200)
      : "Request could not be completed.";
    return new Response(
      JSON.stringify({ error: safe }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
