import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { createWalletClient, http, parseUnits, publicActions } from "https://esm.sh/viem@2.9.20";

// ══════════════════════════════════════════════════════════════════════
// 1. PROTOCOL CONSTANTS & SPLIT CONFIG
// ══════════════════════════════════════════════════════════════════════

const REVENUE_SPLIT = { CORPORATE: 0.6, WAR_CHEST: 0.1, DATA_YIELD: 0.3 };

// Network
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const BASE_RPC_URL = Deno.env.get("BASE_RPC_URL") || BASE_SEPOLIA_RPC;

// Protocol contracts
const IDIA_TOKEN_ADDRESS = "0x137D913d89d0D6a5b2d1Db76173770C94d25387B";
const REGISTRY_ADDRESS = "0x463ce6d5B2E2c9D4bBE930f0CEBeF08b6Eb274F7";
const GLOBAL_WAR_CHEST = "0xd052C6F3846b4Fe56E579880Ec9ea2764ABDe708"; // Timelock fallback
const ESCROW_ECOSYSTEM = "0xDc93eca954fD2625001b2fb9E9A098914365ADe9";

// USDC on Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// System wallets
const SYSTEM_CASH_REGISTER = "0x649436db4d9352240d1132d9372293e5cc6af0e3";
const TREASURY_WALLET = "0xd816D83703764551A7F292dbC435669AA89631a7";

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

const REGISTRY_ABI = [
  {
    name: "getPoolByLocation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "location", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const ESCROW_ABI = [
  {
    name: "proposeDistribution",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ name: "proposalId", type: "uint256" }],
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
    console.info(`[BEGIN: circular-settlement] Pulse detected. Initializing settlement architecture.`);

    currentStep = "SUPABASE_CLIENT_INIT";
    console.info(`[TRACE: ${currentStep}] Instantiating Supabase client with IDIA_SECRET_KEY.`);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("IDIA_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing SUPABASE_URL or IDIA_SECRET_KEY environment variables.");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.info(`[END: ${currentStep}] Supabase client ready.`);

    currentStep = "VALIDATING_INPUTS";
    console.info(`[BEGIN: ${currentStep}] Validating request payload.`);
    const payoutData = await req.json();
    const { total_fiat_amount, buyer_id, contributing_users, payment_reference, location_string } = payoutData;

    if (!total_fiat_amount || total_fiat_amount <= 0) throw new Error("Invalid total_fiat_amount.");
    if (!contributing_users || !Array.isArray(contributing_users) || contributing_users.length === 0) {
      throw new Error("Missing or empty contributing_users array.");
    }

    // Default location to 'Global' if not provided by the payload
    const executionLocation = location_string || "global";

    console.info(
      `[END: ${currentStep}] Inputs verified. Amount: $${total_fiat_amount}, Contributors: ${contributing_users.length}, Location: ${executionLocation}`,
    );

    currentStep = "ROUTING_GATEKEEPER";
    console.info(`[BEGIN: ${currentStep}] Checking system compliance parameters.`);
    const routing = payoutData?.routing;
    if (routing !== "fiat" && routing !== "on-chain") {
      console.error(`[FATAL STALL: ROUTING] Hard stop enforced. Invalid routing parameter.`);
      throw new Error(`ROUTING_HARD_STOP: 'routing' must be exactly "fiat" or "on-chain".`);
    }
    console.info(`[END: ${currentStep}] Gatekeeper passed. Routing set to: ${routing}`);

    let account: any = null;
    let client: any = null;
    let masterNonce = 0;
    let corporateHash = "N/A";
    let regionalHash = "N/A";

    const ingestionReference = payment_reference || `FIAT-${crypto.randomUUID().slice(0, 8)}`;

    if (routing === "on-chain") {
      currentStep = "CONFIGURING_BLOCKCHAIN";
      console.info(`[BEGIN: ${currentStep}] Securing Treasury wallet and network connections.`);

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
        transport: http(BASE_RPC_URL),
      }).extend(publicActions);

      console.info(`[TRACE: ${currentStep}] Fetching master nonce to prevent transaction collisions...`);
      masterNonce = await client.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      });
      console.info(`[END: ${currentStep}] Blockchain client ready. Starting Nonce: ${masterNonce}`);

      // ====================================================================
      // PHASE 1: CORPORATE SETTLEMENT (60%)
      // ====================================================================
      currentStep = "PHASE_1_CORPORATE_SETTLEMENT";
      const corporateRevenue = total_fiat_amount * REVENUE_SPLIT.CORPORATE;
      console.info(`[BEGIN: ${currentStep}] Treasury -> System Register ($${corporateRevenue.toFixed(6)})`);

      corporateHash = await client.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [SYSTEM_CASH_REGISTER, parseUnits(corporateRevenue.toFixed(6), 6)],
        account,
        nonce: masterNonce++,
      });
      console.info(`[TRACE: ${currentStep}] Sent Corporate USDC. Hash: ${corporateHash}`);

      // ====================================================================
      // PHASE 2: REGIONAL ROUTING (10%)
      // ====================================================================
      currentStep = "PHASE_2_REGIONAL_ROUTING";
      const regionalRevenue = total_fiat_amount * REVENUE_SPLIT.WAR_CHEST;
      console.info(`[BEGIN: ${currentStep}] Resolving Regional Pool for location: ${executionLocation}`);

      // Read contracts do not cost gas or nonces
      const poolTarget = await client.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "getPoolByLocation",
        args: [executionLocation],
      });

      const finalRegionalAddress =
        poolTarget && poolTarget !== "0x0000000000000000000000000000000000000000" ? poolTarget : GLOBAL_WAR_CHEST;

      console.info(`[TRACE: ${currentStep}] Target resolved to: ${finalRegionalAddress}. Initiating transfer...`);

      regionalHash = await client.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [finalRegionalAddress as `0x${string}`, parseUnits(regionalRevenue.toFixed(6), 6)],
        account,
        nonce: masterNonce++,
      });
      console.info(`[END: ${currentStep}] Sent Regional USDC. Hash: ${regionalHash}`);

      // Delay to clear Mempool before hitting Phase 3
      console.info(`[NETWORK] Delaying 2.5s to clear sequencer mempool congestion...`);
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    // ====================================================================
    // LEDGER HYDRATION (PHASES 1 & 2)
    // ====================================================================
    currentStep = "HYDRATING_PROTOCOL_REVENUE";
    console.info(`[BEGIN: ${currentStep}] Synchronizing DB Ledgers for Corporate and Ecosystem cuts.`);

    const corporateRevenueSplit = total_fiat_amount * REVENUE_SPLIT.CORPORATE;
    const escrowWarChestSplit = total_fiat_amount * REVENUE_SPLIT.WAR_CHEST;

    await Promise.all([
      supabase.from("synapse_credit_ledger").insert({
        user_id: buyer_id,
        amount: corporateRevenueSplit,
        entry_type: "revenue",
        transaction_type: "HUB_PROTOCOL_FEE",
        status: "completed",
        blockchain_tx_hash: corporateHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `60% Corporate Revenue: ${ingestionReference} [${routing}]`,
      }),
      supabase.from("synapse_credit_ledger").insert({
        user_id: buyer_id,
        amount: escrowWarChestSplit,
        entry_type: "escrow",
        transaction_type: "ECOSYSTEM_WAR_CHEST",
        status: "completed",
        blockchain_tx_hash: regionalHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `10% Regional/War Chest: ${ingestionReference} [${routing}]`,
      }),
    ]);
    console.info(`[END: ${currentStep}] Revenue silos successfully hydrated.`);

    // ====================================================================
    // PHASE 3 & 5: ON-CHAIN ROYALTY & AUTONOMOUS IDIA PROPOSAL
    // ====================================================================
    currentStep = "PHASE_3_AND_5_CONTRIBUTOR_DISTRIBUTION";
    console.info(`[BEGIN: ${currentStep}] Calculating pro-rata yield for ${contributing_users.length} contributors.`);

    const totalRoyaltyPool = total_fiat_amount * REVENUE_SPLIT.DATA_YIELD;
    const perContributorYield = totalRoyaltyPool / contributing_users.length;
    const contributorPayouts = [];

    // Assuming 1 IDIA token awarded per successful data consumption
    const idiaAwardAmount = parseUnits("1", 18);

    for (const contributor of contributing_users) {
      console.info(`[BEGIN: Payout] Processing user ${contributor.user_id}`);

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", contributor.user_id)
        .single();

      const lifeWallet = profile?.wallet_address || "0xc490695880992ec99885e5cdd03aafb5c63b8c33";

      let yieldHash: string = "N/A";
      let proposalHash: string = "N/A";
      let yieldStatus: "completed" | "failed" = "completed";

      if (routing === "on-chain") {
        // --- PHASE 3: ON-CHAIN USDC PAYOUT ---
        console.info(`[TRACE: Payout] Transferring ${perContributorYield.toFixed(6)} USDC to ${lifeWallet}...`);
        yieldHash = await client.writeContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [lifeWallet as `0x${string}`, parseUnits(perContributorYield.toFixed(6), 6)],
          account,
          nonce: masterNonce++,
        });

        // --- PHASE 5: DAO PROPOSAL INJECTION ---
        console.info(`[TRACE: Payout] Emitting IDIA distribution proposal to Escrow for Automated Approver...`);
        proposalHash = await client.writeContract({
          address: ESCROW_ECOSYSTEM,
          abi: ESCROW_ABI,
          functionName: "proposeDistribution",
          args: [
            lifeWallet as `0x${string}`,
            idiaAwardAmount,
            `Automated royalty yield proposal: Ref ${ingestionReference}`,
          ],
          account,
          nonce: masterNonce++,
        });

        // Waiting for the yield transaction to confirm state
        const yieldReceipt = await client.waitForTransactionReceipt({ hash: yieldHash });
        yieldStatus = yieldReceipt.status === "success" ? "completed" : "failed";

        console.info(`[NETWORK] Delaying 1.5s between loop iterations to ease sequencer pressure...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
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
        description: `Pro-rata yield for Ref: ${ingestionReference} [${routing}]`,
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
      }

      contributorPayouts.push({
        wallet: lifeWallet,
        yield_hash: yieldHash,
        proposal_hash: proposalHash,
      });
      console.info(
        `[END: Payout] Operations complete for ${contributor.user_id}. Yield TX: ${yieldHash} | Proposal TX: ${proposalHash}`,
      );
    }
    console.info(`[END: ${currentStep}] Global execution finished successfully.`);

    const responseBody =
      routing === "on-chain"
        ? { success: true, routing, corporateHash, regionalHash, payouts: contributorPayouts }
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
