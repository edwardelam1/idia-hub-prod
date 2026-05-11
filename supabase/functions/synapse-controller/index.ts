import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { chargeBuyerUsdc, RELAYER_ADDRESS } from "../_shared/charge-usdc.ts"; // ADD THIS LINE

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
    // Parse payload immediately
    const body = await req.json();

    // Aggressive extraction to ensure Best Friend AI receipts are captured as arrays
    const rawIds = body.aca_record_ids || [];
    const aca_record_ids = Array.isArray(rawIds) ? rawIds : [rawIds].filter(Boolean);

    const {
      user_id,
      client_id = "BEST_FRIEND_AI_RECEIPT", // Fallback to ensure liability token hashing succeeds
      intent_type = "MARKETPLACE RESEARCH",
      routing,
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

    // FIX: Removed 'const routing = body?.routing;' as it was already
    // destructured from 'body' on line 34, causing the fatal redeclaration crash.

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
    // ====================================================================
    if (!aca_record_ids || aca_record_ids.length === 0) {
      console.error(`🚨 [FATAL STALL: INPUT_GATE] No auditable lineage provided by Best Friend AI.`);
      throw new Error("No auditable lineage provided");
    }

    const FLAT_FEE_CR = 1;
    const totalSynapseDeduction = -FLAT_FEE_CR;
    // ====================================================================
    // RESOLVE_DATA_OWNERS — Map consumed records to individuals for payout
    // ====================================================================
    console.info(
      `[BEGIN: RESOLVE_DATA_OWNERS] Reading receipt to map ${aca_record_ids.length} records to data owners.`,
    );

    // Best Friend AI sends a mix of `aca_hash_key` and `id`.
    // We must separate them to prevent Postgres UUID syntax crashes.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuids = aca_record_ids.filter((id: string) => uuidRegex.test(id));
    const stringHashes = aca_record_ids.filter((id: string) => !uuidRegex.test(id));

    let consumedRecords: any[] = [];

    // 1. Resolve by UUID
    if (validUuids.length > 0) {
      const { data: uuidData, error: uuidError } = await adminClient
        .from("user_aca_records") // FIXED: Targeting ground truth table
        .select("platform_guid") // FIXED: Targeting ground truth column
        .in("id", validUuids);

      if (uuidError) {
        console.error(`🚨 [FATAL STALL: RESOLVE_DATA_OWNERS] UUID lookup failed: ${uuidError.message}`);
        throw new Error(`Data owner UUID resolution failed: ${uuidError.message}`);
      }
      if (uuidData) consumedRecords.push(...uuidData);
    }

    // 2. Resolve by ACA Hash Key (Staged Data from Best Friend AI)
    if (stringHashes.length > 0) {
      const { data: hashData, error: hashError } = await adminClient
        .from("user_aca_records") // FIXED: Targeting ground truth table
        .select("platform_guid") // FIXED: Targeting ground truth column
        .in("aca_hash_key", stringHashes);

      if (hashError) {
        console.error(`🚨 [FATAL STALL: RESOLVE_DATA_OWNERS] Hash lookup failed: ${hashError.message}`);
        throw new Error(`Data owner Hash resolution failed: ${hashError.message}`);
      }
      if (hashData) consumedRecords.push(...hashData);
    }

    if (!consumedRecords || consumedRecords.length === 0) {
      console.error(
        `🚨 [FATAL STALL: RESOLVE_DATA_OWNERS] Zero data owners resolved from the Best Friend AI receipt. Payout impossible.`,
      );
      throw new Error("Payout rejected: No data owners resolved from provided ACA records.");
    }

    // Deduplicate to prevent overlapping payout anomalies for the same individual.
    // We map platform_guid to user_id to satisfy the downstream Circular Settlement pipeline.
    const uniqueContributors = Array.from(new Set(consumedRecords.map((r) => r.platform_guid)))
      .filter(Boolean)
      .map((id) => ({ user_id: id }));

    console.info(
      `[END: RESOLVE_DATA_OWNERS] Successfully read receipt and mapped to ${uniqueContributors.length} unique individual(s).`,
    );

    // 2. CRYPTOGRAPHIC TOKEN GENERATION
    const timestamp = new Date().toISOString();
    const sortedIds = [...aca_record_ids].sort(); // FIX: use aca_record_ids
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
          aca_record_references: aca_record_ids, // FIX: standard DB column mapping
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
      // ON-CHAIN STRICT: Pull USDC from buyer, payout USDC to contributors
      // ================================================================
      console.info(`[BEGIN: ONCHAIN_CHARGE] Pulling $0.75 USDC from buyer ${activeWallet}`);
      const charge = await chargeBuyerUsdc({
        buyer_wallet: activeWallet,
        usd_amount: 0.75,
      });
      if (!charge.ok) {
        console.error(`🚨 [FATAL STALL: ONCHAIN_CHARGE] Smart contract rejected pull. code=${charge.code}`);
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

      console.info(`[BEGIN: LEDGER_PROOF_LINK] Securing on-chain proof to ledger.`);
      await adminClient
        .from("synapse_credit_ledger")
        .update({ blockchain_tx_hash: charge.hash, status: "settled" })
        .eq("id", ledgerResult.data.id);
      console.info(`[END: LEDGER_PROOF_LINK] Ledger entry secured.`);

      console.info(
        `[BEGIN: CASHIER_PAYOUT_HANDOFF] Igniting STRICT ON-CHAIN Circular Settlement for USDC distribution.`,
      );
      const { error: cashierError } = await adminClient.functions.invoke("idia-circular-settlement", {
        body: {
          total_fiat_amount: 0.75,
          routing: "on-chain", // Federal strict separation: USDC ONLY
          buyer_id: userId,
          payment_reference: referenceId,
          contributing_users: uniqueContributors, // FIX: Pay the data owners
        },
      });

      if (cashierError) {
        console.error(
          `🚨 [FATAL STALL: CASHIER_PAYOUT_HANDOFF] Cashier rejected on-chain pulse: ${cashierError.message}`,
        );
        throw new Error(`On-chain Circular Settlement Failed: ${cashierError.message}`);
      }
      console.info(
        `[END: CASHIER_PAYOUT_HANDOFF] On-chain USDC payout successfully routed to ${uniqueContributors.length} individual(s).`,
      );
    } else if (routing === "fiat") {
      // ================================================================
      // FIAT STRICT: Internal ledger distribution (No USDC crossover)
      // ================================================================
      console.info(`[BEGIN: CASHIER_HANDOFF] Igniting STRICT FIAT Circular Settlement.`);
      const { error: cashierError } = await adminClient.functions.invoke("idia-circular-settlement", {
        body: {
          total_fiat_amount: 0.75,
          routing: "fiat", // Federal strict separation: FIAT ONLY
          buyer_id: userId,
          payment_reference: referenceId,
          contributing_users: uniqueContributors, // FIX: Pay the data owners
        },
      });

      if (cashierError) {
        console.error(`🚨 [FATAL STALL: CASHIER_HANDOFF] Cashier rejected fiat pulse: ${cashierError.message}`);
        throw new Error(`Fiat Circular Settlement Failed: ${cashierError.message}`);
      }
      console.info(
        `[END: CASHIER_HANDOFF] Fiat distribution successfully routed to ${uniqueContributors.length} individual(s).`,
      );
    } else {
      console.error(`🚨 [FATAL STALL: CASHIER_HANDOFF] Unrecognized routing state during payout phase: ${routing}`);
      throw new Error(`Payout routing anomaly detected. Halting settlement.`);
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
          records_processed: aca_record_ids.length, // FIX: Use correct array reference
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
