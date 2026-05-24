import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getRoute } from "../_shared/payAppRouting.ts";
import { SECTOR_VALUES } from "../_shared/sectorValues.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function calculateDynamicFee(
  adminClient: any,
  userId: string,
  subModuleId: string,
): Promise<{ feeCR: number; sectorLabel: string }> {
  console.info(`[BEGIN: FEE_CALCULATION_ENGINE] Module: ${subModuleId}`);

  try {
    // 1. Resolve Industry ID from shared Routing Map
    const route = getRoute(subModuleId);
    const sectorLabel = route?.industryId ?? "general";

    // 2. Fetch Buyer's interest battery
    const { data: profile } = await adminClient
      .from("business_interest_profiles")
      .select("interest_weights")
      .eq("business_id", userId)
      .single();

    // 3. Apply Weighting (Intersection: MarketBaseValue * BuyerStrategicWeight)
    const buyerWeight = profile?.interest_weights?.[sectorLabel] ?? 1.0;
    const marketBaseValue = SECTOR_VALUES[sectorLabel] ?? 1.0;
    const finalFee = Math.ceil(1 * marketBaseValue * buyerWeight);

    console.info(
      `[END: FEE_CALCULATION_ENGINE] Fee: ${finalFee} CR (Market: ${marketBaseValue}x | Buyer: ${buyerWeight}x)`,
    );
    return { feeCR: finalFee, sectorLabel };
  } catch (err: any) {
    console.error(`🚨 [FATAL STALL: FEE_CALCULATION_ENGINE] Exception: ${err.message}`);
    throw err;
  }
}

// ====================================================================
// MAIN EDGE FUNCTION
// ====================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let currentStage = "INITIALIZATION";
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      user_id,
      client_id = "BEST_FRIEND_AI_RECEIPT",
      intent_type = "MARKETPLACE RESEARCH",
      sub_module_id = "general",
      aca_record_ids: rawIds = [],
      metadata = {},
      country_of_origin = "US",
    } = body;

    const aca_record_ids = Array.isArray(rawIds) ? rawIds : [rawIds].filter(Boolean);
    const userId = user_id;

    if (!userId || userId === "00000000-0000-0000-0000-000000000000") throw new Error("Invalid user_id");
    if (aca_record_ids.length === 0) throw new Error("No auditable lineage provided");

    // 1. DYNAMIC FEE CALCULATION
    const { feeCR, sectorLabel } = await calculateDynamicFee(adminClient, userId, sub_module_id);
    const totalSynapseDeduction = -feeCR;
    const fiatEquivalent = feeCR * 0.75;

    // 2. DATA OWNER RESOLUTION
    const uniqueContributors = await resolveContributors(adminClient, aca_record_ids);

    // 3. CRYPTO & LEDGER GENERATION
    const timestamp = new Date().toISOString();
    const sortedIds = [...aca_record_ids].sort();
    const batchChecksum = await sha256(sortedIds.join("|"));
    const liabilityTokenHash = await sha256(`${client_id}|${timestamp}|${batchChecksum}`);
    const digiRampAnchorId = "0x" + (await sha256(`${liabilityTokenHash}|${timestamp}`));
    const referenceId = `SYN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // 4. ATOMIC LEDGER WRITE (Preserving full audit chain)
    const [ledgerResult, egressResult] = await Promise.all([
      adminClient
        .from("synapse_credit_ledger")
        .insert({
          user_id: userId,
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
          user_id: userId,
          client_id,
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

    if (ledgerResult.error || egressResult.error) throw new Error("Database Write Failed");

    // 5. SETTLEMENT HANDOFF
    await adminClient.functions.invoke("idia-circular-settlement", {
      body: {
        total_fiat_amount: fiatEquivalent,
        buyer_id: userId,
        payment_reference: referenceId,
        contributing_users: uniqueContributors,
        intent_metadata: { intent_type, sector: sectorLabel },
      },
    });

    await adminClient
      .from("egress_logs")
      .update({ synapse_ledger_entry_id: ledgerResult.data.id })
      .eq("id", egressResult.data.id);

    return new Response(JSON.stringify({ success: true, fee: feeCR }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});

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
