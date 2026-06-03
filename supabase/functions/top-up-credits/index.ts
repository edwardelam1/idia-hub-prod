// supabase/functions/top-up-credits/index.ts
// Hardened payload contract: aligned with Hub and Life application financial structures.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import { chargeBuyerUsdc } from "../_shared/charge-usdc.ts";
import { isAddress } from "https://esm.sh/viem@2.9.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("[BOOT: top-up-credits] Synapse Hydration Engine v7 (Relayer Delegated Pull) online.");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.log("[BEGIN: INVOKE] top-up-credits");

  let stage = "INIT";
  try {
    stage = "PARSE_PAYLOAD";
    console.log(`[BEGIN: ${stage}]`);
    const body = await req.json().catch((e) => {
      throw new Error(`PAYLOAD_PARSE_FAILED: ${e?.message}`);
    });

    const user_id: string | undefined = body.user_id;
    const RATE_USD_PER_CR = 0.75;
    const rawUsd = Number(body.usd_amount ?? 0);
    const rawCredit = Number(body.credit_amount ?? body.amount ?? 0);
    // usd_amount is the on-chain truth. Derive credit_amount server-side when absent.
    const usd_amount = rawUsd > 0 ? rawUsd : rawCredit * RATE_USD_PER_CR;
    const credit_amount =
      rawCredit > 0 ? rawCredit : Math.round((usd_amount / RATE_USD_PER_CR) * 1e4) / 1e4;
    const user_wallet: string | undefined = body.user_wallet ?? body.recipient_address;
    const payment_method: string = (body.payment_method ?? "usdc").toLowerCase();

    const routing: string = (
      body.routing ?? (["usdc", "internal_usdc"].includes(payment_method) ? "on-chain" : "fiat")
    ).toLowerCase();

    const payment_reference: string = body.payment_reference || `PAY-${crypto.randomUUID().slice(0, 8)}`;
    const idempotency_key: string | undefined = body.idempotency_key;

    console.log(
      `[END: ${stage}] user_id=${user_id} credit_amount=${credit_amount} usd_amount=${usd_amount} routing=${routing} wallet=${user_wallet ?? "<none>"}`,
    );

    stage = "VALIDATION";
    console.log(`[BEGIN: ${stage}]`);
    if (!user_id || typeof user_id !== "string") {
      throw new Error(`VALIDATION_FAILED: user_id is missing or invalid. Received: ${user_id}`);
    }
    if (!Number.isFinite(usd_amount) || usd_amount <= 0) {
      throw new Error(`VALIDATION_FAILED: usd_amount must be > 0. Received: ${body.usd_amount}`);
    }
    if (!Number.isFinite(credit_amount) || credit_amount <= 0) {
      throw new Error(`VALIDATION_FAILED: derived credit_amount invalid. usd_amount=${usd_amount}`);
    }
    if (routing === "on-chain") {
      if (!user_wallet || typeof user_wallet !== "string" || !isAddress(user_wallet)) {
        throw new Error(`VALIDATION_FAILED: Valid buyer wallet identifier is missing for on-chain routing.`);
      }
    }
    if (!idempotency_key || typeof idempotency_key !== "string") {
      throw new Error(`VALIDATION_FAILED: idempotency_key is required for atomic settlement.`);
    }
    console.log(`[END: ${stage}] OK`);

    stage = "INIT_ADMIN_CLIENT";
    console.log(`[BEGIN: ${stage}]`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SECRET_KEY")!);
    console.log(`[END: ${stage}]`);

    stage = "IDEMPOTENCY_CHECK";
    console.log(`[BEGIN: ${stage}] key=${idempotency_key}`);
    const { data: existing, error: idemError } = await supabase
      .from("synapse_credit_ledger")
      .select("blockchain_tx_hash, amount, metadata")
      .eq("user_id", user_id)
      .filter("metadata->>idempotency_key", "eq", idempotency_key)
      .limit(1)
      .maybeSingle();

    if (idemError) {
      console.warn(`[WARNING: ${stage}] lookup failed: ${idemError.message}`);
    } else if (existing) {
      console.log(`[END: ${stage}] REPLAY hit. hash=${existing.blockchain_tx_hash}`);
      return new Response(
        JSON.stringify({
          success: true,
          replayed: true,
          hash: existing.blockchain_tx_hash,
          updated_balance: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    } else {
      console.log(`[END: ${stage}] no prior settlement.`);
    }

    let txHash: string = payment_reference;

    // 🚨 RELAYER DELEGATED PULL: The Relayer pays gas and executes transferFrom based on existing allowance
    if (routing === "on-chain") {
      stage = "SYNAPSE_BILLING_CHARGE";
      console.log(`[BEGIN: ${stage}] Relayer attempting to pull ${usd_amount} USDC from ${user_wallet}`);

      const chargeResult = await chargeBuyerUsdc({
        buyer_wallet: user_wallet!,
        usd_amount: usd_amount,
      });

      if (!chargeResult.ok) {
        // If this throws APPROVAL_REQUIRED, the blockchain is confirming the Relayer lacks allowance for this specific wallet.
        console.error(`🚨 [FATAL STALL: ${stage}] ${chargeResult.code}: ${chargeResult.message}`);
        throw new Error(`USDC_CHARGE_REJECTED: ${chargeResult.code}`);
      }

      txHash = chargeResult.hash!;
      console.log(`[END: ${stage}] Settlement verified on Base. Hash=${txHash}`);
    } else {
      console.log(`[SKIP: ONCHAIN_CHARGE] routing=${routing} wallet=${user_wallet}`);
    }

    stage = "LEDGER_INSERT";
    console.log(`[BEGIN: ${stage}]`);
    const { error: ledgerError } = await supabase.from("synapse_credit_ledger").insert({
      user_id: user_id,
      amount: credit_amount,
      transaction_type: "internal_deposit",
      entry_type: "deposit",
      status: "completed",
      blockchain_tx_hash: txHash,
      metadata: {
        class: "Synapse_Purchase",
        product_class: "SAAS_UTILITY_PURCHASE",
        fund: routing === "on-chain" ? "STABLECOIN_RESERVE" : "CORPORATE_REVENUE",
        usd_amount: usd_amount,
        rate_usd_per_cr: RATE_USD_PER_CR,
        payment_reference: payment_reference,
        routing: routing,
        user_wallet: user_wallet ?? null,
        idempotency_key,
      },
    });

    if (ledgerError) {
      throw new Error(`LEDGER_INSERT_FAILED: ${ledgerError.message}`);
    }
    console.log(`[END: ${stage}]`);

    stage = "COMPLIANCE_RAIL_LOCK";
    console.log(`[BEGIN: ${stage}] rail=${routing}`);
    if (routing === "fiat" || routing === "on-chain") {
      const { error: railError } = await supabase
        .from("profiles")
        .update({ compliance_rail: routing })
        .eq("user_id", user_id);
      if (railError) {
        console.error(`[WARNING: ${stage}] Failed to persist compliance_rail: ${railError.message}`);
      } else {
        console.log(`[END: ${stage}] Compliance rail locked: ${routing}`);
      }
    } else {
      console.warn(`[SKIP: ${stage}] Non-canonical routing="${routing}". Skipping rail persistence.`);
    }

    stage = "WALLET_HYDRATE";
    console.log(`[BEGIN: ${stage}] Initiating balance hydration for routing=${routing}`);
    let newBalance: number | null = null;

    if (routing === "fiat") {
      const targetColumn = "corporate_revenue";
      console.log(`[LOG: ${stage}] Fetching prior balance from column=${targetColumn}`);

      const { data: wallet, error: fetchError } = await supabase
        .from("wallets")
        .select(targetColumn)
        .eq("user_id", user_id)
        .maybeSingle();

      if (fetchError) {
        console.error(`🚨 [STALL DETECTED: ${stage}] Wallet fetch aborted: ${fetchError.message}`);
        throw new Error(`WALLET_FETCH_FAILED: ${fetchError.message}`);
      }

      const currentBalance = Number((wallet as any)?.[targetColumn]) || 0;
      newBalance = currentBalance + credit_amount;
      console.log(`[LOG: ${stage}] Calculation: Previous(${currentBalance}) + Inbound(${credit_amount}) = Target(${newBalance})`);

      console.log(`[LOG: ${stage}] Executing state upsert to guarantee persistence.`);
      const { error: upsertError } = await supabase
        .from("wallets")
        .upsert(
          {
            user_id: user_id,
            [targetColumn]: newBalance,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (upsertError) {
        console.error(`🚨 [STALL DETECTED: ${stage}] Wallet upsert aborted: ${upsertError.message}`);
        throw new Error(`WALLET_UPSERT_FAILED: ${upsertError.message}`);
      }

      console.log(`[END: ${stage}] fiat column=${targetColumn} newTotal=${newBalance} successfully committed.`);
    } else {
      console.log(`[SKIP: ${stage}] On-chain routing — USDC truth lives on Base.`);
    }

    console.log(`[END: INVOKE] success hash=${txHash}`);
    return new Response(JSON.stringify({ success: true, hash: txHash, updated_balance: newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error(`🚨 [FATAL EXCEPTION: ${stage}] System halted: ${error?.message}`);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error", failed_at: stage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
