// supabase/functions/top-up-credits/index.ts
// Hardened payload contract: aligned with Hub and Life application financial structures.
//
// v8 — ASYNC SETTLEMENT. The HTTP response no longer waits on a blockchain
// receipt. Phase 1 (fast, in-request): validate, preflight allowance/balance,
// dispatch transferFrom, write a `pending` ledger row. Phase 2 (background via
// EdgeRuntime.waitUntil): await the receipt and flip the row to completed /
// failed. Clients poll the ledger by idempotency_key, which survives Chromium
// mobile tab throttling and Brave's termination of long-hanging sockets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import { dispatchBuyerUsdcCharge, confirmUsdcCharge } from "../_shared/charge-usdc.ts";
import { isAddress } from "https://esm.sh/viem@2.9.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("[BOOT: top-up-credits] Synapse Hydration Engine v8 (Async Relayer Pull) online.");

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
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    console.log(`[END: ${stage}]`);

    stage = "IDEMPOTENCY_CHECK";
    console.log(`[BEGIN: ${stage}] key=${idempotency_key}`);
    const { data: existing, error: idemError } = await supabase
      .from("synapse_credit_ledger")
      .select("id, status, blockchain_tx_hash, amount, metadata")
      .eq("user_id", user_id)
      .filter("metadata->>idempotency_key", "eq", idempotency_key)
      .limit(1)
      .maybeSingle();

    if (idemError) {
      console.warn(`[WARNING: ${stage}] lookup failed: ${idemError.message}`);
    } else if (existing) {
      console.log(`[END: ${stage}] REPLAY hit. status=${existing.status} hash=${existing.blockchain_tx_hash}`);
      return new Response(
        JSON.stringify({
          success: true,
          replayed: true,
          status: existing.status,
          hash: existing.blockchain_tx_hash,
          updated_balance: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    } else {
      console.log(`[END: ${stage}] no prior settlement.`);
    }

    const baseMetadata = {
      class: "Synapse_Purchase",
      product_class: "SAAS_UTILITY_PURCHASE",
      fund: routing === "on-chain" ? "STABLECOIN_RESERVE" : "CORPORATE_REVENUE",
      usd_amount: usd_amount,
      rate_usd_per_cr: RATE_USD_PER_CR,
      payment_reference: payment_reference,
      routing: routing,
      user_wallet: user_wallet ?? null,
      idempotency_key,
    };

    // ==========================================================
    // ON-CHAIN RAIL — dispatch now, confirm in the background.
    // ==========================================================
    if (routing === "on-chain") {
      stage = "SYNAPSE_BILLING_DISPATCH";
      console.log(`[BEGIN: ${stage}] Relayer dispatching ${usd_amount} USDC pull from ${user_wallet}`);

      const dispatchResult = await dispatchBuyerUsdcCharge({
        buyer_wallet: user_wallet!,
        usd_amount: usd_amount,
      });

      if (!dispatchResult.ok) {
        console.error(`🚨 [REJECTED: ${stage}] ${dispatchResult.code}: ${dispatchResult.message}`);
        throw new Error(`USDC_CHARGE_REJECTED: ${dispatchResult.code}`);
      }

      const txHash = dispatchResult.hash!;
      console.log(`[END: ${stage}] dispatched hash=${txHash}`);

      stage = "LEDGER_INSERT_PENDING";
      console.log(`[BEGIN: ${stage}]`);
      const { data: pendingRow, error: pendingError } = await supabase
        .from("synapse_credit_ledger")
        .insert({
          user_id: user_id,
          amount: credit_amount,
          transaction_type: "internal_deposit",
          entry_type: "deposit",
          status: "pending",
          blockchain_tx_hash: txHash,
          metadata: { ...baseMetadata, settlement_phase: "dispatched" },
        })
        .select("id")
        .single();

      if (pendingError) {
        throw new Error(`LEDGER_INSERT_FAILED: ${pendingError.message}`);
      }
      const ledgerId = pendingRow!.id as string;
      console.log(`[END: ${stage}] pending ledger row=${ledgerId}`);

      // ---- Phase 2: background receipt confirmation ----
      const confirmTask = (async () => {
        console.log(`[BEGIN: BACKGROUND_CONFIRM] ledger=${ledgerId} hash=${txHash}`);
        try {
          const confirmation = await confirmUsdcCharge(txHash);
          if (confirmation.ok) {
            const { error: upErr } = await supabase
              .from("synapse_credit_ledger")
              .update({
                status: "completed",
                metadata: { ...baseMetadata, settlement_phase: "confirmed" },
              })
              .eq("id", ledgerId);
            if (upErr) {
              console.error(`🚨 [BACKGROUND_CONFIRM] status update failed: ${upErr.message}`);
            } else {
              console.log(`[END: BACKGROUND_CONFIRM] ledger=${ledgerId} marked completed.`);
            }

            const { error: railError } = await supabase
              .from("profiles")
              .update({ compliance_rail: "on-chain" })
              .eq("user_id", user_id);
            if (railError) console.warn(`[BACKGROUND_CONFIRM] compliance_rail skip: ${railError.message}`);
          } else {
            console.error(`🚨 [BACKGROUND_CONFIRM] ${confirmation.code}: ${confirmation.message}`);
            await supabase
              .from("synapse_credit_ledger")
              .update({
                status: "failed",
                metadata: {
                  ...baseMetadata,
                  settlement_phase: "failed",
                  failure_code: confirmation.code,
                  failure_reason: confirmation.message,
                },
              })
              .eq("id", ledgerId);
          }
        } catch (bgErr: any) {
          console.error(`🚨 [BACKGROUND_CONFIRM] unhandled: ${bgErr?.message ?? String(bgErr)}`);
          await supabase
            .from("synapse_credit_ledger")
            .update({
              status: "failed",
              metadata: {
                ...baseMetadata,
                settlement_phase: "failed",
                failure_code: "BACKGROUND_EXCEPTION",
                failure_reason: bgErr?.message ?? String(bgErr),
              },
            })
            .eq("id", ledgerId);
        }
      })();

      // deno-lint-ignore no-explicit-any
      const runtime = (globalThis as any).EdgeRuntime;
      if (runtime?.waitUntil) {
        runtime.waitUntil(confirmTask);
      } else {
        // Local/dev fallback — do not block the response.
        confirmTask.catch(() => {});
      }

      console.log(`[END: INVOKE] dispatched hash=${txHash} status=pending`);
      return new Response(
        JSON.stringify({ success: true, status: "pending", hash: txHash, updated_balance: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // ==========================================================
    // FIAT RAIL — settles synchronously, no chain wait involved.
    // ==========================================================
    stage = "LEDGER_INSERT";
    console.log(`[BEGIN: ${stage}]`);
    const txHash = payment_reference;
    const { error: ledgerError } = await supabase.from("synapse_credit_ledger").insert({
      user_id: user_id,
      amount: credit_amount,
      transaction_type: "internal_deposit",
      entry_type: "deposit",
      status: "completed",
      blockchain_tx_hash: txHash,
      metadata: { ...baseMetadata, settlement_phase: "confirmed" },
    });

    if (ledgerError) {
      throw new Error(`LEDGER_INSERT_FAILED: ${ledgerError.message}`);
    }
    console.log(`[END: ${stage}]`);

    stage = "COMPLIANCE_RAIL_LOCK";
    const { error: railError } = await supabase
      .from("profiles")
      .update({ compliance_rail: "fiat" })
      .eq("user_id", user_id);
    if (railError) {
      console.error(`[WARNING: ${stage}] Failed to persist compliance_rail: ${railError.message}`);
    }

    stage = "WALLET_HYDRATE";
    console.log(`[BEGIN: ${stage}] fiat balance hydration`);
    const targetColumn = "corporate_revenue";
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
    const newBalance = currentBalance + credit_amount;

    const { error: upsertError } = await supabase.from("wallets").upsert(
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
    console.log(`[END: ${stage}] fiat newTotal=${newBalance} committed.`);

    console.log(`[END: INVOKE] success hash=${txHash}`);
    return new Response(
      JSON.stringify({ success: true, status: "completed", hash: txHash, updated_balance: newBalance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error(`🚨 [FATAL EXCEPTION: ${stage}] System halted: ${error?.message}`);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error", failed_at: stage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
