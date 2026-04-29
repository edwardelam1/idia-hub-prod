import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { createWalletClient, http, parseUnits, publicActions } from "https://esm.sh/viem@2.9.20";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SYSTEM_CASH_REGISTER = "0x649436db4d9352240d1132d9372293e5cc6af0e3";
const REVENUE_SPLIT = { DATA_YIELD: 0.3, CORPORATE: 0.6, WAR_CHEST: 0.1 };

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PLUGGED: Added explicit type 'Request' to 'req'
serve(async (req: Request) => {
  let currentStep = "INIT";
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.info(`[BEGIN: circular-settlement] Pulse detected.`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    currentStep = "VALIDATING_INPUTS";
    console.info(`[BEGIN: ${currentStep}]`);
    const payoutData = await req.json();
    const { total_fiat_amount, buyer_id, contributing_users, payment_reference } = payoutData;

    if (!total_fiat_amount || total_fiat_amount <= 0) throw new Error("Invalid total_fiat_amount.");
    if (!contributing_users || !Array.isArray(contributing_users) || contributing_users.length === 0) {
      throw new Error("Missing or empty contributing_users array.");
    }
    console.info(
      `[END: ${currentStep}] Inputs verified. Amount: $${total_fiat_amount}, Contributors: ${contributing_users.length}`,
    );

    // ====================================================================
    // COMPLIANCE BLAST WALL: Like-for-Like routing gatekeeper.
    // Strict equality only — no defaults, no coercion, no lowercasing.
    // ====================================================================
    currentStep = "ROUTING_GATEKEEPER";
    console.info(`[BEGIN: ${currentStep}]`);
    const routing = payoutData?.routing;
    if (routing !== "fiat" && routing !== "on-chain") {
      console.error(`[FATAL STALL: ROUTING] Hard stop enforced. Explicit routing parameter missing or invalid.`);
      throw new Error(
        `ROUTING_HARD_STOP: 'routing' must be exactly "fiat" or "on-chain". Received: ${routing ?? "undefined"}`,
      );
    }
    console.info(`[END: ${currentStep}] routing=${routing}`);

    // Declared up-front so both routes can reference them in ledger inserts / response
    let ingestionHash: string = payment_reference || `FIAT-${crypto.randomUUID().slice(0, 8)}`;
    let account: any = null;
    let client: any = null;
    let masterNonce = 0;

    if (routing === "on-chain") {
      currentStep = "CONFIGURING_BLOCKCHAIN";
      console.info(`[BEGIN: ${currentStep}]`);

      const rawKey = Deno.env.get("RELAYER_PRIVATE_KEY");
      if (!rawKey) {
        throw new Error(
          "ENVIRONMENT_ERROR: RELAYER_PRIVATE_KEY secret is missing. Check your Supabase project settings.",
        );
      }

      // Compliance: Ensure 0x prefix and remove any accidental whitespace
      const formattedKey = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;

      try {
        account = privateKeyToAccount(formattedKey as `0x${string}`);
      } catch (keyErr: any) {
        throw new Error(
          `RELAYER_PRIVATE_KEY format error: ${keyErr.message}. Ensure the key is exactly 64 hex characters.`,
        );
      }
      client = createWalletClient({
        account,
        chain: base,
        transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org"),
      }).extend(publicActions);
      console.info(`[END: ${currentStep}] Blockchain client ready at address: ${account.address}`);

      currentStep = "FETCHING_MASTER_NONCE";
      console.info(`[BEGIN: ${currentStep}]`);
      masterNonce = await client.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      });
      console.info(`[END: ${currentStep}] Master Nonce secured: ${masterNonce}`);

      currentStep = "BROADCASTING_INGESTION";

      // Calculate the Net System Cut (60% Corporate + 10% War Chest = 70%)
      const systemRetainedRevenue = total_fiat_amount * (REVENUE_SPLIT.CORPORATE + REVENUE_SPLIT.WAR_CHEST);

      console.info(`[BEGIN: ${currentStep}] Treasury -> Register ($${systemRetainedRevenue.toFixed(6)})`);
      ingestionHash = await client.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        // 🚨 NET ROUTING FIX: Only send the 70% cut to the Cash Register
        args: [SYSTEM_CASH_REGISTER, parseUnits(systemRetainedRevenue.toFixed(6), 6)],
        account,
        nonce: masterNonce++,
      });
      const ingestionReceipt = await client.waitForTransactionReceipt({ hash: ingestionHash });
      if (ingestionReceipt.status !== "success") throw new Error(`[FATAL] Ingestion Reverted on-chain.`);
      console.info(`[END: ${currentStep}] Ingestion Confirmed. Hash: ${ingestionHash}`);

      console.info(`[NETWORK] Delaying 2.5s for sequencer to clear EIP-7702 delegated mempool...`);
      await new Promise((resolve) => setTimeout(resolve, 2500));
    } else {
      console.info(`[STATUS] Fiat routing explicitly detected. Ledger updated. Bypassing on-chain execution.`);
    }

    currentStep = "DISSEMINATING_YIELD_AND_SYNCING_DB";
    console.info(`[BEGIN: ${currentStep}] Calculating pro-rata yield distribution.`);
    const totalRoyaltyPool = total_fiat_amount * REVENUE_SPLIT.DATA_YIELD;
    const perContributorYield = totalRoyaltyPool / contributing_users.length;
    const contributorPayouts = [];

    // 🚨 SERVER-SIDE FIX 1: Charge the Buyer!
    console.info(`[BEGIN: DB_SYNC] Deducting Synapse Credits from Buyer: ${buyer_id}`);
    const { data: buyerWallet, error: buyerFetchError } = await supabase
      .from("wallets")
      .select("synapse_gas_credits")
      .eq("user_id", buyer_id)
      .single();

    if (!buyerFetchError && buyerWallet) {
      // Deduct the cost from their gas credits (preventing negative balances)
      const newCreditBalance = Math.max(0, buyerWallet.synapse_gas_credits - total_fiat_amount);
      await supabase.from("wallets").update({ synapse_gas_credits: newCreditBalance }).eq("user_id", buyer_id);
      console.info(`[END: DB_SYNC] Buyer charged. New Credit Balance: ${newCreditBalance}`);
    } else {
      console.error(`[STALL: DB_SYNC] Could not fetch buyer wallet to charge credits.`, buyerFetchError);
    }

    // 🚨 SERVER-SIDE FIX 2: Pay the Data Owners (On-Chain & Database)
    for (const contributor of contributing_users) {
      console.info(`[BEGIN: Step 6A] Payout for user ${contributor.user_id}`);

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", contributor.user_id)
        .single();

      const lifeWallet = profile?.wallet_address || "0xc490695880992ec99885e5cdd03aafb5c63b8c33";

      let yieldHash: string = ingestionHash;
      let yieldStatus: "completed" | "failed" = "completed";

      if (routing === "on-chain") {
        yieldHash = await client.writeContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "transfer",
          // Send exactly the 30% cut to the user's wallet
          args: [lifeWallet as `0x${string}`, parseUnits(perContributorYield.toFixed(6), 6)],
          account,
          nonce: masterNonce++,
        });
        const yieldReceipt = await client.waitForTransactionReceipt({ hash: yieldHash });
        yieldStatus = yieldReceipt.status === "success" ? "completed" : "failed";

        console.info(`[NETWORK] Delaying 2.5s for sequencer to clear EIP-7702 delegated mempool...`);
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      await supabase.from("synapse_credit_ledger").insert({
        user_id: contributor.user_id,
        amount: perContributorYield,
        entry_type: "deposit",
        transaction_type: "DATA_SALE_PAYOUT",
        status: yieldStatus,
        blockchain_tx_hash: yieldHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `Pro-rata yield for Ref: ${payment_reference} [${routing}]`,
      });

      // DB SYNC — Like-for-Like rail compliance.
      // - on-chain rail: credit USDC reservoir (idia_beta_balance) in micro-USDC scale.
      // - fiat rail:     credit fiat royalty bucket (cash_balance) in dollars.
      console.info(`[BEGIN: DB_SYNC] Crediting yield for ${contributor.user_id} on rail=${routing}`);
      if (routing === "on-chain") {
        const microDelta = Math.round(Number(perContributorYield) * 1_000_000);
        const { error: rpcErr } = await supabase.rpc("apply_usdc_delta", {
          p_user_id: contributor.user_id,
          p_micro_delta: microDelta,
          p_block_number: null,
        });
        if (rpcErr) console.error(`[ERROR: DB_SYNC] apply_usdc_delta: ${rpcErr.message}`);
        else console.info(`[END: DB_SYNC] +${microDelta} micro-USDC -> idia_beta_balance`);
      } else {
        const { data: contributorWallet } = await supabase
          .from("wallets")
          .select("cash_balance")
          .eq("user_id", contributor.user_id)
          .single();
        if (contributorWallet) {
          const updatedBalance = Number(contributorWallet.cash_balance || 0) + perContributorYield;
          await supabase
            .from("wallets")
            .update({ cash_balance: updatedBalance, updated_at: new Date().toISOString() })
            .eq("user_id", contributor.user_id);
          console.info(`[END: DB_SYNC] cash_balance -> $${updatedBalance}`);
        }
      }

      contributorPayouts.push({ wallet: lifeWallet, hash: yieldHash });
      console.info(`[END: Step 6A] Payout complete for ${contributor.user_id}. Hash: ${yieldHash}`);
    }
    console.info(`[END: ${currentStep}] Pro-rata yield fully dispersed and unified ledger synced.`);

    currentStep = "HYDRATING_PROTOCOL_REVENUE";
    console.info(`[BEGIN: ${currentStep}] Ledger reconciliation for 60/10 Split.`);

    const corporateRevenue = total_fiat_amount * REVENUE_SPLIT.CORPORATE;
    const escrowWarChest = total_fiat_amount * REVENUE_SPLIT.WAR_CHEST;

    await Promise.all([
      supabase.from("synapse_credit_ledger").insert({
        user_id: buyer_id,
        amount: corporateRevenue,
        entry_type: "revenue",
        transaction_type: "HUB_PROTOCOL_FEE",
        status: "completed",
        blockchain_tx_hash: ingestionHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `60% Corporate Revenue: ${payment_reference} [${routing}]`,
      }),
      supabase.from("synapse_credit_ledger").insert({
        user_id: buyer_id,
        amount: escrowWarChest,
        entry_type: "escrow",
        transaction_type: "ECOSYSTEM_WAR_CHEST",
        status: "completed",
        blockchain_tx_hash: ingestionHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `10% Ecosystem War Chest: ${payment_reference} [${routing}]`,
      }),
    ]);

    console.info(`[END: ${currentStep}] Revenue silos successfully hydrated.`);

    const responseBody =
      routing === "on-chain"
        ? { success: true, routing, ingestionHash, payouts: contributorPayouts }
        : { success: true, routing, ledger_only: true, contributors_credited: contributorPayouts.length };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error(`🚨 [FATAL STALL: ${currentStep}]: ${error.message}`);
    return new Response(
      JSON.stringify({
        error: error.message,
        failed_at: currentStep,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
