import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { createWalletClient, http, parseUnits, publicActions, keccak256, toHex } from "https://esm.sh/viem@2.9.20";

// ══════════════════════════════════════════════════════════════════════
// 1. PROTOCOL CONSTANTS
// ══════════════════════════════════════════════════════════════════════

const REVENUE_SPLIT = { DATA_YIELD: 0.3, CORPORATE: 0.6, WAR_CHEST: 0.1 };

// Network
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const BASE_MAINNET_RPC = "https://mainnet.base.org";
const BASE_RPC_URL = Deno.env.get("BASE_RPC_URL") || BASE_SEPOLIA_RPC;

// Protocol contracts (Base Sepolia — testnet)
const IDIA_TOKEN_ADDRESS = "0x137D913d89d0D6a5b2d1Db76173770C94d25387B";
const REGISTRY_ADDRESS = "0x463ce6d5B2E2c9D4bBE930f0CEBeF08b6Eb274F7";
const LIABILITY_RECEIPT_ADDRESS = "0x9e1CD33c2534dbeb0E82db7A0366A483fC9bD6DE";
const GLOBAL_WAR_CHEST = "0xd052C6F3846b4Fe56E579880Ec9ea2764ABDe708"; // Timelock as fallback
const POOL_FACTORY_ADDRESS = "0x60EA2012dd55B6E828c1ec3085821dA9d6658630";

// USDC on Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// System wallets
const SYSTEM_CASH_REGISTER = "0x649436db4d9352240d1132d9372293e5cc6af0e3";
const TREASURY_WALLET = "0xd816D83703764551A7F292dbC435669AA89631a7";

// Escrow addresses (for token distribution after data purchase)
const ESCROW_ECOSYSTEM = "0xDc93eca954fD2625001b2fb9E9A098914365ADe9";

// ══════════════════════════════════════════════════════════════════════
// 2. ABIs
// ══════════════════════════════════════════════════════════════════════

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

const LIABILITY_RECEIPT_ABI = [
  {
    name: "mintReceipt",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dataBuyer", type: "address" },
      { name: "acaHashes", type: "bytes32[]" },
      { name: "purchaseAmount", type: "uint256" },
      { name: "synapseReceiptId", type: "bytes32" },
      { name: "dataBundleRef", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
] as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ══════════════════════════════════════════════════════════════════════
// 3. MAIN EXECUTION HANDLER
// ══════════════════════════════════════════════════════════════════════

serve(async (req: Request) => {
  let currentStep = "INIT";
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    console.info(`[BEGIN: circular-settlement] Pulse detected. Treasury Subsidization Model active.`);

    currentStep = "SUPABASE_CLIENT_INIT";
    console.info(`[TRACE: ${currentStep}] Instantiating Supabase client with IDIA_SECRET_KEY.`);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("IDIA_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing SUPABASE_URL or IDIA_SECRET_KEY environment variables.");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.info(`[END: ${currentStep}] Supabase client ready.`);

    currentStep = "FETCH_RPC_CONFIG";
    console.info(`[BEGIN: ${currentStep}] Fetching RPC network configuration.`);
    let rpcUrl = "https://mainnet.base.org";
    const { data: config, error: rpcError } = await supabase
      .from("system_configs")
      .select("value")
      .eq("key", "BASE_RPC_URL")
      .maybeSingle();

    if (rpcError)
      console.warn(
        `[WARN: ${currentStep}] Failed to pull RPC URL from DB, defaulting to fallback. Error: ${rpcError.message}`,
      );
    if (config?.value) rpcUrl = config.value.trim();
    console.info(`[END: ${currentStep}] RPC locked onto: ${rpcUrl}`);

    currentStep = "VALIDATING_INPUTS";
    console.info(`[BEGIN: ${currentStep}] Validating request payload.`);
    const payoutData = await req.json();
    const { total_fiat_amount, buyer_id, contributing_users, payment_reference } = payoutData;

    if (!total_fiat_amount || total_fiat_amount <= 0) throw new Error("Invalid total_fiat_amount.");
    if (!contributing_users || !Array.isArray(contributing_users) || contributing_users.length === 0) {
      throw new Error("Missing or empty contributing_users array.");
    }
    console.info(
      `[END: ${currentStep}] Inputs verified. Amount: $${total_fiat_amount}, Contributors: ${contributing_users.length}`,
    );

    currentStep = "ROUTING_GATEKEEPER";
    console.info(`[BEGIN: ${currentStep}] Checking system compliance parameters.`);
    const routing = payoutData?.routing;
    if (routing !== "fiat" && routing !== "on-chain") {
      console.error(`[FATAL STALL: ROUTING] Hard stop enforced. Invalid routing parameter.`);
      throw new Error(`ROUTING_HARD_STOP: 'routing' must be exactly "fiat" or "on-chain".`);
    }
    console.info(`[END: ${currentStep}] Gatekeeper passed. Routing set to: ${routing}`);

    let ingestionHash: string = payment_reference || `FIAT-${crypto.randomUUID().slice(0, 8)}`;
    let liabilityReceiptHash: string = "N/A";
    let account: any = null;
    let client: any = null;
    let masterNonce = 0;

    // We initialize the blockchain client universally so we can issue Liability Receipts even if USDC isn't moving
    currentStep = "CONFIGURING_BLOCKCHAIN";
    console.info(`[BEGIN: ${currentStep}] Securing Treasury wallet.`);

    const rawKey = Deno.env.get("RELAYER_PRIVATE_KEY");
    if (!rawKey) throw new Error("ENVIRONMENT_ERROR: RELAYER_PRIVATE_KEY secret is missing.");
    const formattedKey = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;

    try {
      account = privateKeyToAccount(formattedKey as `0x${string}`);
    } catch (keyErr: any) {
      throw new Error(`RELAYER_PRIVATE_KEY format error: ${keyErr.message}`);
    }

    client = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrl),
    }).extend(publicActions);
    console.info(`[END: ${currentStep}] Blockchain client ready at address: ${account.address}`);

    currentStep = "FETCHING_MASTER_NONCE";
    console.info(`[TRACE: ${currentStep}] Calling client.getTransactionCount...`);
    masterNonce = await client.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    });
    console.info(`[END: ${currentStep}] Master Nonce secured: ${masterNonce}`);

    if (routing === "on-chain") {
      currentStep = "BROADCASTING_INGESTION";
      const systemRetainedRevenue = total_fiat_amount * (REVENUE_SPLIT.CORPORATE + REVENUE_SPLIT.WAR_CHEST);

      console.info(`[BEGIN: ${currentStep}] Treasury -> Register ($${systemRetainedRevenue.toFixed(6)})`);
      console.info(`[TRACE: ${currentStep}] Writing contract for corporate USDC transfer...`);
      ingestionHash = await client.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [SYSTEM_CASH_REGISTER, parseUnits(systemRetainedRevenue.toFixed(6), 6)],
        account,
        nonce: masterNonce++,
      });

      console.info(`[TRACE: ${currentStep}] Awaiting transaction confirmation...`);
      const ingestionReceipt = await client.waitForTransactionReceipt({ hash: ingestionHash });
      if (ingestionReceipt.status !== "success") throw new Error(`[FATAL] Ingestion Reverted on-chain.`);
      console.info(`[END: ${currentStep}] Ingestion Confirmed. Hash: ${ingestionHash}`);

      console.info(`[NETWORK] Delaying 2.5s for sequencer to clear EIP-7702 delegated mempool...`);
      await new Promise((resolve) => setTimeout(resolve, 2500));
    } else {
      console.info(`[STATUS] Fiat routing explicitly detected. Bypassing on-chain corporate split execution.`);
    }

    currentStep = "DISSEMINATING_YIELD_AND_SYNCING_DB";
    console.info(`[BEGIN: ${currentStep}] Calculating pro-rata yield distribution.`);
    const totalRoyaltyPool = total_fiat_amount * REVENUE_SPLIT.DATA_YIELD;
    const perContributorYield = totalRoyaltyPool / contributing_users.length;
    const contributorPayouts = [];

    console.info(`[TRACE: DB_SYNC] Fetching Synapse Credits for Buyer: ${buyer_id}`);
    const { data: buyerWallet, error: buyerFetchError } = await supabase
      .from("wallets")
      .select("synapse_gas_credits")
      .eq("user_id", buyer_id)
      .single();

    if (buyerFetchError || !buyerWallet) {
      throw new Error(`STALL: Could not fetch buyer wallet to charge credits. Error: ${buyerFetchError?.message}`);
    }

    if (buyerWallet.synapse_gas_credits < total_fiat_amount) {
      throw new Error(
        `INSUFFICIENT_FUNDS: Buyer requires ${total_fiat_amount} credits, but only has ${buyerWallet.synapse_gas_credits}.`,
      );
    }

    const newCreditBalance = buyerWallet.synapse_gas_credits - total_fiat_amount;
    console.info(`[TRACE: DB_SYNC] Updating buyer wallet with new balance...`);
    await supabase.from("wallets").update({ synapse_gas_credits: newCreditBalance }).eq("user_id", buyer_id);
    console.info(`[END: DB_SYNC] Buyer charged successfully. New Credit Balance: ${newCreditBalance}`);

    for (const contributor of contributing_users) {
      console.info(`[BEGIN: Payout] Processing user ${contributor.user_id}`);
      console.info(`[TRACE: Payout] Fetching contributor wallet address...`);

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", contributor.user_id)
        .single();

      const lifeWallet = profile?.wallet_address || "0xc490695880992ec99885e5cdd03aafb5c63b8c33";

      let yieldHash: string = ingestionHash;
      let yieldStatus: "completed" | "failed" = "completed";

      if (routing === "on-chain") {
        console.info(`[TRACE: Payout] Executing on-chain royalty transfer to ${lifeWallet}...`);
        yieldHash = await client.writeContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [lifeWallet as `0x${string}`, parseUnits(perContributorYield.toFixed(6), 6)],
          account,
          nonce: masterNonce++,
        });

        console.info(`[TRACE: Payout] Awaiting yield transaction confirmation...`);
        const yieldReceipt = await client.waitForTransactionReceipt({ hash: yieldHash });
        yieldStatus = yieldReceipt.status === "success" ? "completed" : "failed";

        console.info(`[NETWORK] Delaying 2.5s for sequencer to clear mempool...`);
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      console.info(`[TRACE: Payout] Recording to Synapse Credit Ledger...`);
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

      if (routing === "fiat") {
        console.info(`[TRACE: DB_SYNC] Crediting fiat royalty silo for ${contributor.user_id}`);
        const { data: contributorWallet } = await supabase
          .from("wallets")
          .select("cash_balance, total_earned")
          .eq("user_id", contributor.user_id)
          .single();

        if (contributorWallet) {
          const newCash = Number(contributorWallet.cash_balance || 0) + perContributorYield;
          const newEarned = Number(contributorWallet.total_earned || 0) + perContributorYield;
          await supabase
            .from("wallets")
            .update({ cash_balance: newCash, total_earned: newEarned, updated_at: new Date().toISOString() })
            .eq("user_id", contributor.user_id);
          console.info(`[END: DB_SYNC] Fiat silo synced. cash_balance=$${newCash}`);
        }
      } else {
        console.info(`[SKIP: DB_SYNC] On-chain routing — USDC truth lives on Base, fiat silo sync bypassed.`);
      }

      contributorPayouts.push({ wallet: lifeWallet, hash: yieldHash });
      console.info(`[END: Payout] Payout complete for ${contributor.user_id}. Hash: ${yieldHash}`);
    }
    console.info(`[END: ${currentStep}] Pro-rata yield fully dispersed and unified ledger synced.`);

    // ====================================================================
    // PHASE 4: LIABILITY RECEIPT MINTING
    // ====================================================================
    currentStep = "MINTING_LIABILITY_RECEIPT";
    console.info(`[BEGIN: ${currentStep}] Initiating Data Buyer Receipt. Fetching buyer profile...`);

    const { data: buyerProfile } = await supabase.from("profiles").select("wallet_address").eq("id", buyer_id).single();

    const dataBuyerAddress = buyerProfile?.wallet_address || SYSTEM_CASH_REGISTER;
    const purchaseAmountUSDC = parseUnits(total_fiat_amount.toFixed(6), 6);

    // Hash the payment reference to create a bytes32 synapse ID constraint
    const synapseReceiptId = keccak256(toHex(payment_reference || "UNKNOWN"));
    const dataBundleRef = `bundle-${payment_reference || "ref"}`;

    // Map existing aca_hashes from contributors or fallback to hashed user IDs to prevent null exceptions
    const acaHashes = contributing_users.map((c: any) => (c.aca_hash ? c.aca_hash : keccak256(toHex(c.user_id))));

    console.info(`[TRACE: ${currentStep}] Calling smart contract mintReceipt() for buyer ${dataBuyerAddress}...`);
    try {
      liabilityReceiptHash = await client.writeContract({
        address: LIABILITY_RECEIPT_ADDRESS,
        abi: LIABILITY_RECEIPT_ABI,
        functionName: "mintReceipt",
        args: [
          dataBuyerAddress as `0x${string}`,
          acaHashes as `0x${string}`[],
          purchaseAmountUSDC,
          synapseReceiptId,
          dataBundleRef,
        ],
        account,
        nonce: masterNonce++,
      });

      console.info(`[TRACE: ${currentStep}] Awaiting block confirmation for receipt minting...`);
      const receiptTx = await client.waitForTransactionReceipt({ hash: liabilityReceiptHash });

      if (receiptTx.status !== "success") {
        throw new Error(`LIABILITY_RECEIPT_REVERTED: TX ${liabilityReceiptHash}`);
      }
      console.info(`[END: ${currentStep}] Liability Receipt successfully minted. Hash: ${liabilityReceiptHash}`);
    } catch (mintError: any) {
      console.error(`[FATAL: ${currentStep}] Liability receipt protocol failed. Error: ${mintError.message}`);
      throw mintError;
    }

    // ====================================================================
    // LEDGER RECONCILIATION
    // ====================================================================
    currentStep = "HYDRATING_PROTOCOL_REVENUE";
    console.info(`[BEGIN: ${currentStep}] Ledger reconciliation for 60/10 Split.`);

    const corporateRevenue = total_fiat_amount * REVENUE_SPLIT.CORPORATE;
    const escrowWarChest = total_fiat_amount * REVENUE_SPLIT.WAR_CHEST;

    console.info(`[TRACE: ${currentStep}] Initiating parallel Synapse Ledger inserts...`);
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

    // ====================================================================
    // PHASE 6: EGRESS (AUDIT) LOGGING
    // ====================================================================
    currentStep = "EGRESS_AUDIT_LOGGING";
    console.info(`[BEGIN: ${currentStep}] Writing execution to Egress Audit UI.`);
    try {
      const auditPayload = {
        transaction_ref: payment_reference,
        buyer_id: buyer_id,
        routing_type: routing,
        total_fiat_amount: total_fiat_amount,
        corporate_ingestion_hash: ingestionHash,
        liability_receipt_hash: liabilityReceiptHash,
        contributor_count: contributorPayouts.length,
        timestamp: new Date().toISOString(),
      };
      console.info(`[TRACE: ${currentStep}] Sending payload to egress_logs table...`);
      // Assuming your DB has an egress_logs table. If the schema differs, modify table name below.
      await supabase.from("egress_logs").insert([auditPayload]);
      console.info(`[END: ${currentStep}] Egress UI updated securely.`);
    } catch (egressError: any) {
      // Logging an error but explicitly NOT throwing so the primary transaction success isn't blocked.
      console.error(`[FATAL: ${currentStep}] Egress transmission failed: ${egressError.message}`);
    }

    currentStep = "FINAL_RESPONSE";
    console.info(`[BEGIN: ${currentStep}] Compiling client response payload.`);
    const responseBody =
      routing === "on-chain"
        ? { success: true, routing, liabilityReceiptHash, ingestionHash, payouts: contributorPayouts }
        : {
            success: true,
            routing,
            liabilityReceiptHash,
            ledger_only: true,
            contributors_credited: contributorPayouts.length,
          };

    console.info(`[END: circular-settlement] Execution finalized seamlessly.`);
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
