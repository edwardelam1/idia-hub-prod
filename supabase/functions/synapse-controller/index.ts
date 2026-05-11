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

    // ====================================================================
    // ROUTING_GATEKEEPER — Like-for-Like compliance. Mirrors the Cashier.
    // Strict equality only. No defaults. No coercion.
    // ====================================================================
    console.info(`[BEGIN: ROUTING_GATEKEEPER]`);
    const routing = body?.routing;
    if (routing !== "fiat" && routing !== "on-chain") {
      console.error(
        `🚨 [FATAL STALL: ROUTING_GATEKEEPER] Missing/invalid routing. Received: ${routing ?? "undefined"}`,
      );
      throw new Error(
        `ROUTING_HARD_STOP: 'routing' must be exactly "fiat" or "on-chain". Received: ${routing ?? "undefined"}`,
      );
    }
    console.info(`[END: ROUTING_GATEKEEPER] Compliance rail locked: ${routing}`);

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

    // Strict Compliance Gate: No system fallbacks allowed.
    if (routing === "on-chain" && !activeWallet) {
      console.error(
        `🚨 [FATAL STALL: VALIDATING_INPUTS] Compliance Hard Stop: User ${userId} lacks a registered wallet for USDC routing. Fallbacks are strictly prohibited.`,
      );
      throw new Error("Strict Compliance Violation: Registered wallet required for on-chain USDC routing.");
    }

    if (activeWallet) {
      console.info(`[STATUS: VALIDATING_INPUTS] User wallet verified: ${activeWallet}`);
    } else {
      console.info(`[STATUS: VALIDATING_INPUTS] No wallet verified. Proceeding strictly under FIAT rail.`);
    }
    console.info(`[END: VALIDATING_INPUTS] Input validation secured.`);

    if (aca_record_ids.length === 0) throw new Error("No auditable lineage provided");

    // FLAT RATE: Every AI search that touches data costs exactly 1 CR ($0.75 fiat).
    // Record receipt is preserved for egress logging + downstream IDIA Life payout attribution,
    // but is decoupled from the fee itself.
    // ====================================================================
    // RESOLVE_DATA_OWNERS — Map consumed records to individuals for payout
    // ====================================================================
    console.info(
      `[BEGIN: RESOLVE_DATA_OWNERS] Interrogating database to map ${aca_record_ids.length} consumed records to original data owners.`,
    );
    const { data: consumedRecords, error: consumedError } = await adminClient
      .from("aca_records")
      .select("user_id")
      .in("id", aca_record_ids);

    if (consumedError) {
      console.error(
        `🚨 [FATAL STALL: RESOLVE_DATA_OWNERS] Database query failed. Code: ${consumedError.code}, Message: ${consumedError.message}`,
      );
      throw new Error(`Data owner resolution failed: ${consumedError.message}`);
    }

    if (!consumedRecords || consumedRecords.length === 0) {
      console.error(`🚨 [FATAL STALL: RESOLVE_DATA_OWNERS] Zero data owners resolved. Payout impossible.`);
      throw new Error("Payout rejected: No data owners resolved from provided records.");
    }

    const uniqueContributors = Array.from(new Set(consumedRecords.map((r) => r.user_id)))
      .filter(Boolean)
      .map((id) => ({ user_id: id }));

    console.info(
      `[END: RESOLVE_DATA_OWNERS] Mapped records to ${uniqueContributors.length} unique individual(s) for payout.`,
    );

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
    // [STAGE: RESULT_VERIFICATION] Verify DB integrity before settling.
    if (ledgerResult.error) throw new Error(`Ledger rejection: ${ledgerResult.error.message}`);
    if (egressResult.error) throw new Error(`Egress failure: ${egressResult.error.message}`);

    // [BEGIN: CASHIER_HANDOFF] Bridge validated intent to Circular Settlement.
    let onchainTxHash: string | null = null;
    if (routing === "on-chain") {
      // ================================================================
      // ON-CHAIN: pull USDC directly from buyer wallet via transferFrom.
      // No edge-to-edge HTTP hop — shared module runs in-process.
      // ================================================================
      console.info(`[BEGIN: ONCHAIN_CHARGE] Pulling $0.75 USDC from buyer ${activeWallet}`);
      const charge = await chargeBuyerUsdc({
        buyer_wallet: activeWallet,
        usd_amount: 0.75,
      });
      if (!charge.ok) {
        console.error(`🚨 [FATAL STALL: ONCHAIN_CHARGE] code=${charge.code}`);
        // Surface a structured 402-style payload so the UI can prompt approve()
        return new Response(
          JSON.stringify({
            success: false,
            error: charge.code,
            details: charge,
            spender: RELAYER_ADDRESS,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      onchainTxHash = charge.hash;
      console.info(`[END: ONCHAIN_CHARGE] hash=${charge.hash} block=${charge.block_number}`);

      // Update ledger entry with on-chain proof
      console.info(`[BEGIN: LEDGER_PROOF_LINK]`);
      await adminClient
        .from("synapse_credit_ledger")
        .update({ blockchain_tx_hash: charge.hash, status: "settled" })
        .eq("id", ledgerResult.data.id);
      console.info(`[END: LEDGER_PROOF_LINK]`);
    } else {
      // FIAT: original Circular Settlement pipeline (60/30/10 split).
      console.info(`[BEGIN: CASHIER_HANDOFF] Igniting Circular Settlement Pipeline (rail=fiat).`);
      const { error: cashierError } = await adminClient.functions.invoke("idia-circular-settlement", {
        body: {
          total_fiat_amount: 0.75,
          routing,
          buyer_id: userId,
          payment_reference: referenceId,
          contributing_users: [{ user_id: userId }],
        },
      });
      if (cashierError) {
        console.error(`🚨 [FATAL STALL: CASHIER_HANDOFF] Cashier rejected pulse: ${cashierError.message}`);
        throw new Error(`Circular Settlement Failed: ${cashierError.message}`);
      }
      console.info(`[END: CASHIER_HANDOFF] 60/30/10 Split deployed via fiat.`);
    }

    // [STAGE: FINAL_LINKING] Bind the egress log to the financial ledger entry
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
          gas_consumed: FLAT_FEE_CR,
          total_cr_deducted: FLAT_FEE_CR,
          fiat_equivalent_value: 0.75,
          onchain_tx_hash: onchainTxHash,
          rail: routing,
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
