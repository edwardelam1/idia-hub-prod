import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Parse payload immediately to get the user_id (Bypasses strict getUser auth for MVP)
    const body = await req.json();
    const {
      user_id,
      client_id,
      aca_record_ids = [],
      intent_type = "RESEARCH",
      query_complexity = 1.0,
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

    const SYSTEM_FALLBACK_WALLET = "0xc490695880992ec99885e5cdd03aafb5c63b8c33";
    const activeWallet = profile?.wallet_address || SYSTEM_FALLBACK_WALLET;

    if (activeWallet === SYSTEM_FALLBACK_WALLET) {
      console.warn(
        `⚠️ [WARNING: VALIDATING_INPUTS] User ${userId} lacks a registered wallet. Rerouting to System Fallback.`,
      );
    } else {
      console.info(`[STATUS: VALIDATING_INPUTS] User wallet verified: ${activeWallet}`);
    }
    console.info(`[END: VALIDATING_INPUTS] Active wallet secured.`);

    if (aca_record_ids.length === 0) throw new Error("No auditable lineage provided");

    // FLAT RATE: Every AI search that touches data costs exactly 1 CR ($0.75 fiat).
    // Record receipt is preserved for egress logging + downstream IDIA Life payout attribution,
    // but is decoupled from the fee itself.
    const FLAT_FEE_CR = 1;
    const totalSynapseDeduction = -FLAT_FEE_CR;

    // 2. CRYPTOGRAPHIC TOKEN GENERATION
    const timestamp = new Date().toISOString();
    const sortedIds = [...aca_record_ids].sort();
    const batchChecksum = await sha256(sortedIds.join("|"));
    const liabilityTokenHash = await sha256(`${client_id}|${timestamp}|${batchChecksum}`);
    const digiRampAnchorId = "0x" + (await sha256(`${liabilityTokenHash}|${timestamp}`));

    // 3. ATOMIC LEDGER AND EGRESS WRITE
    const referenceId = `SYN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const [ledgerResult, egressResult] = await Promise.all([
      adminClient
        .from("synapse_credit_ledger")
        .insert({
          user_id: userId,
          amount: totalSynapseDeduction,
          entry_type: "USAGE",
          transaction_type: "FEE",
          status: "SETTLED",
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
    console.info(`[BEGIN: CASHIER_HANDOFF] Igniting Circular Settlement Pipeline...`);
    // [BEGIN: CASHIER_HANDOFF]
    console.info(`[BEGIN: CASHIER_HANDOFF] Bridging validated intent to Circular Settlement...`);
    
    // Extract the explicit routing from the incoming UI payload
    const { routing } = body; 

    const cashierUrl = `${supabaseUrl}/functions/v1/idia-circular-settlement`;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const cashierResponse = await fetch(cashierUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`, 
        'apikey': anonKey 
      },
    // Leverage the adminClient SDK to auto-generate perfect Gateway headers
    const { data: cashierData, error: cashierError } = await adminClient.functions.invoke("idia-circular-settlement", {
      body: {
        total_fiat_amount: 0.75,
        routing: routing,
        buyer_id: userId,
        payment_reference: referenceId,
        contributing_users: [{ user_id: userId }],
      },
    });

    if (cashierError) {
      console.error(`🚨 [FATAL STALL: CASHIER_HANDOFF] Cashier rejected pulse: ${cashierError.message}`);
      throw new Error(`Circular Settlement Failed: ${cashierError.message}`);
    }
    console.info(`[END: CASHIER_HANDOFF] 60/30/10 Split successfully deployed to Base.`);
    if (ledgerResult.error) throw new Error(`Ledger rejection: ${ledgerResult.error.message}`);
    if (egressResult.error) throw new Error(`Egress failure: ${egressResult.error.message}`);

    // Bind the egress log to the financial ledger entry
    await adminClient
      .from("egress_logs")
      .update({ synapse_ledger_entry_id: ledgerResult.data.id })
      .eq("id", egressResult.data.id);

    // 4. RETURN FINANCIALS AND AUDIT PAYLOAD
    return new Response(
      JSON.stringify({
        success: true,
        liability_token_hash: liabilityTokenHash,
        financials: {
          gas_consumed: 1,
          minting_fee: 0,
          total_cr_deducted: 1,
          fiat_equivalent_value: 0.75,
        },
        audit: {
          records_processed: aca_record_ids.length,
          intent: intent_type,
          complexity_multiplier: 1.0,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
