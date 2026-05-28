import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { createWalletClient, http, parseUnits, publicActions } from "https://esm.sh/viem@2.9.20";

// ══════════════════════════════════════════════════════════════════════
// 1. PROTOCOL CONSTANTS & SPLIT CONFIG
// ══════════════════════════════════════════════════════════════════════

const REVENUE_SPLIT = { CORPORATE: 0.6, WAR_CHEST: 0.1, DATA_YIELD: 0.3 };
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Network
const BASE_RPC_URL = Deno.env.get("BASE_RPC_URL") || "https://sepolia.base.org";

// Protocol contracts
const REGISTRY_ADDRESS = "0x463ce6d5B2E2c9D4bBE930f0CEBeF08b6Eb274F7";
const ESCROW_ECOSYSTEM = "0xDc93eca954fD2625001b2fb9E9A098914365ADe9";

// USDC on Base
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// System wallets
const SYSTEM_CASH_REGISTER = "0x649436db4d9352240d1132d9372293e5cc6af0e3";

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
    console.info(`[BEGIN: circular-settlement] Pulse detected.`);

    currentStep = "SUPABASE_CLIENT_INIT";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("IDIA_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey) throw new Error("Missing SUPABASE_URL or IDIA_SECRET_KEY.");
    const supabase = createClient(supabaseUrl, supabaseKey);

    currentStep = "VALIDATING_INPUTS";
    const payoutData = await req.json();
    const { total_fiat_amount, buyer_id, contributing_users, payment_reference, location_string } = payoutData;

    if (!total_fiat_amount || total_fiat_amount <= 0) throw new Error("Invalid total_fiat_amount.");
    if (!contributing_users || !Array.isArray(contributing_users) || contributing_users.length === 0) {
      throw new Error("Missing contributing_users.");
    }

    const executionLocation = location_string || "global";
    const ingestionReference = payment_reference || `SYN-${crypto.randomUUID().slice(0, 8)}`;

    currentStep = "CONFIGURING_BLOCKCHAIN";
    const rawKey = Deno.env.get("RELAYER_PRIVATE_KEY");
    if (!rawKey) throw new Error("RELAYER_PRIVATE_KEY missing.");
    const formattedKey = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;
    const account = privateKeyToAccount(formattedKey as `0x${string}`);

    const client = createWalletClient({
      account,
      chain: base,
      transport: http(BASE_RPC_URL),
    }).extend(publicActions);

    let masterNonce = await client.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    });

    // PHASE 1: CORPORATE SETTLEMENT (60%)
    currentStep = "PHASE_1_CORPORATE_SETTLEMENT";
    const corporateRevenue = total_fiat_amount * REVENUE_SPLIT.CORPORATE;

    const corporateHash = await client.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [SYSTEM_CASH_REGISTER, parseUnits(corporateRevenue.toFixed(6), 6)],
      account,
      nonce: masterNonce++,
    });

    // PHASE 2: REGIONAL ROUTING (10%)
    currentStep = "PHASE_2_REGIONAL_ROUTING";
    const regionalRevenue = total_fiat_amount * REVENUE_SPLIT.WAR_CHEST;

    console.info(`[BEGIN: Registry.getPoolByLocation] location=${executionLocation}`);
    const poolTarget = await client.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "getPoolByLocation",
      args: [executionLocation],
    });
    console.info(`[END: Registry.getPoolByLocation] resolved=${poolTarget}`);

    // Enforce Fallback Logic — route to Ecosystem Treasury escrow when no regional pool registered
    const usedFallback = !poolTarget || poolTarget === ZERO_ADDRESS;
    const finalRegionalAddress = usedFallback ? ESCROW_ECOSYSTEM : poolTarget;

    const regionalHash = await client.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [finalRegionalAddress as `0x${string}`, parseUnits(regionalRevenue.toFixed(6), 6)],
      account,
      nonce: masterNonce++,
    });

    // LEDGER HYDRATION
    await Promise.all([
      supabase.from("synapse_credit_ledger").insert({
        user_id: buyer_id,
        amount: corporateRevenue,
        entry_type: "revenue",
        transaction_type: "HUB_PROTOCOL_FEE",
        status: "completed",
        blockchain_tx_hash: corporateHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `60% Corporate Revenue: ${ingestionReference}`,
      }),
      supabase.from("synapse_credit_ledger").insert({
        user_id: buyer_id,
        amount: regionalRevenue,
        entry_type: "escrow",
        transaction_type: "ECOSYSTEM_WAR_CHEST",
        status: "completed",
        blockchain_tx_hash: regionalHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: usedFallback
          ? `10% Regional → Ecosystem Treasury (fallback): ${ingestionReference}`
          : `10% Regional Pool (${finalRegionalAddress}): ${ingestionReference}`,
      }),
    ]);

    // PHASE 3 & 5: ON-CHAIN ROYALTY & AUTONOMOUS IDIA PROPOSAL
    currentStep = "PHASE_3_AND_5_CONTRIBUTOR_DISTRIBUTION";
    const totalRoyaltyPool = total_fiat_amount * REVENUE_SPLIT.DATA_YIELD;
    const perContributorYield = totalRoyaltyPool / contributing_users.length;
    const contributorPayouts = [];
    const idiaAwardAmount = parseUnits("1", 18);

    for (const contributor of contributing_users) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", contributor.user_id)
        .single();

      const lifeWallet = profile?.wallet_address || "0xc490695880992ec99885e5cdd03aafb5c63b8c33";

      const yieldHash = await client.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [lifeWallet as `0x${string}`, parseUnits(perContributorYield.toFixed(6), 6)],
        account,
        nonce: masterNonce++,
      });

      const proposalHash = await client.writeContract({
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

      const yieldReceipt = await client.waitForTransactionReceipt({ hash: yieldHash });
      const yieldStatus = yieldReceipt.status === "success" ? "completed" : "failed";

      await supabase.from("synapse_credit_ledger").insert({
        user_id: contributor.user_id,
        amount: perContributorYield,
        entry_type: "deposit",
        transaction_type: "DATA_SALE_PAYOUT",
        status: yieldStatus,
        blockchain_tx_hash: yieldHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `Pro-rata yield for Ref: ${ingestionReference}`,
      });

      contributorPayouts.push({
        wallet: lifeWallet,
        yield_hash: yieldHash,
        proposal_hash: proposalHash,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    return new Response(
      JSON.stringify({
        success: true,
        corporateHash,
        regionalHash,
        payouts: contributorPayouts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error(`🚨 [FATAL STALL: ${currentStep}]: ${error.message}`);
    const isClientFault = currentStep === "VALIDATING_INPUTS";
    return new Response(JSON.stringify({ error: error.message, failed_at: currentStep }), {
      status: isClientFault ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
