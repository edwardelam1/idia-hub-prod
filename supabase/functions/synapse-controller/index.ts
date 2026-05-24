import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { chargeBuyerUsdc } from "../_shared/charge-usdc.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string) {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const rawIds = body.aca_record_ids || [];
    const aca_record_ids = Array.isArray(rawIds) ? rawIds : [rawIds].filter(Boolean);

    const {
      user_id,
      client_id = "BEST_FRIEND_AI_RECEIPT",
      intent_type = "MARKETPLACE RESEARCH",
      country_of_origin = "US",
    } = body;

    const userId = user_id;
    if (!userId || userId === "00000000-0000-0000-0000-000000000000") {
      throw new Error("Rejected: Invalid or missing user_id in payload");
    }

    console.info(`[BEGIN: VALIDATING_INPUTS] Interrogating profile for User ID: ${userId}`);

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("wallet_address")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error(`🚨 [FATAL STALL: VALIDATING_INPUTS] Database query failed: ${profileError.message}`);
      throw new Error(`Profile interrogation failed: ${profileError.message}`);
    }

    const activeWallet = profile?.wallet_address;

    // Execute charge via standard Synapse Deduction
    const chargeResult = await chargeBuyerUsdc({
      buyer_wallet: activeWallet,
      usd_amount: 0.75,
    });

    if (!chargeResult.ok) {
      console.error(`🚨 [FATAL STALL: ON-CHAIN_USDC_CHARGE] Code: ${chargeResult.code}`);
      throw new Error(`ON_CHAIN_CHARGE_REJECTED: ${chargeResult.code}`);
    }

    if (!aca_record_ids || aca_record_ids.length === 0) {
      console.error(`🚨 [FATAL STALL: INPUT_GATE] No auditable lineage provided by Best Friend AI.`);
      throw new Error("No auditable lineage provided");
    }

    const FLAT_FEE_CR = 1;
    const totalSynapseDeduction = -FLAT_FEE_CR;

    console.info(`[BEGIN: RESOLVE_DATA_OWNERS] Mapping ${aca_record_ids.length} records to data owners.`);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuids = aca_record_ids.filter((id: string) => uuidRegex.test(id));
    const stringHashes = aca_record_ids.filter((id: string) => !uuidRegex.test(id));

    let consumedRecords: any[] = [];

    if (validUuids.length > 0) {
      const { data: uuidData, error: uuidError } = await adminClient
        .from("user_aca_records")
        .select("platform_guid")
        .in("id", validUuids);
      if (uuidError) throw new Error(`Data owner UUID resolution failed: ${uuidError.message}`);
      if (uuidData) consumedRecords.push(...uuidData);
    }

    if (stringHashes.length > 0) {
      const { data: hashData, error: hashError } = await adminClient
        .from("user_aca_records")
        .select("platform_guid")
        .in("aca_hash_key", stringHashes);
      if (hashError) throw new Error(`Data owner Hash resolution failed: ${hashError.message}`);
      if (hashData) consumedRecords.push(...hashData);
    }

    if (consumedRecords.length === 0) {
      throw new Error("Payout rejected: No data owners resolved.");
    }

    const uniqueContributors = Array.from(new Set(consumedRecords.map((r) => r.platform_guid)))
      .filter(Boolean)
      .map((id) => ({ user_id: id }));

    const timestamp = new Date().toISOString();
    const sortedIds = [...aca_record_ids].sort();
    const batchChecksum = await sha256(sortedIds.join("|"));
    const liabilityTokenHash = await sha256(`${client_id}|${timestamp}|${batchChecksum}`);
    const digiRampAnchorId = "0x" + (await sha256(`${liabilityTokenHash}|${timestamp}`));
    const referenceId = `SYN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const [ledgerResult, egressResult] = await Promise.all([
      adminClient
        .from("synapse_credit_ledger")
        .insert({
          user_id: userId,
          amount: totalSynapseDeduction,
          entry_type: "usage",
          transaction_type: "fee",
          status: "settled",
          description: `Synapse Gas: ${intent_type} [Flat 1 CR]`,
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
        })
        .select("id")
        .single(),
    ]);

    if (ledgerResult.error) throw new Error(`Ledger rejection: ${ledgerResult.error.message}`);
    if (egressResult.error) throw new Error(`Egress failure: ${egressResult.error.message}`);

    console.info(`[BEGIN: CASHIER_PAYOUT_HANDOFF] Igniting Circular Settlement.`);

    const { error: cashierError } = await adminClient.functions.invoke("idia-circular-settlement", {
      body: {
        total_fiat_amount: 0.75,
        buyer_id: userId,
        payment_reference: referenceId,
        contributing_users: uniqueContributors,
      },
    });

    if (cashierError) {
      throw new Error(`Circular Settlement Payout Failed: ${cashierError.message}`);
    }

    await adminClient
      .from("egress_logs")
      .update({ synapse_ledger_entry_id: ledgerResult.data.id })
      .eq("id", egressResult.data.id);

    return new Response(
      JSON.stringify({
        success: true,
        liability_token_hash: liabilityTokenHash,
        financials: {
          gas_consumed: FLAT_FEE_CR,
          total_cr_deducted: FLAT_FEE_CR,
          fiat_equivalent_value: 0.75,
        },
        audit: {
          records_processed: aca_record_ids.length,
          intent: intent_type,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error(`🚨 [TOP-LEVEL FATAL] ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
