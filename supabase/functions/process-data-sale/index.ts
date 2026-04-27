// supabase/functions/process-data-sale/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { createWalletClient, http, parseUnits, publicActions } from "https://esm.sh/viem@2.9.20";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SYSTEM_CASH_REGISTER = "0x649436db4d9352240d1132d9372293e5cc6af0e3";
const REVENUE_SPLIT = { DATA_YIELD: 0.30 }; 

const ERC20_ABI = [{ 
  name: "transfer", type: "function", stateMutability: "nonpayable", 
  inputs: [{ name: "to", type: "address" }, { name: "value", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }] 
}] as const;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  let currentStep = "INIT";
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.info(`[BEGIN: process-data-sale] Pulse detected.`);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    // --- 1. PAYLOAD PARSING (Renamed to prevent collisions) ---
    currentStep = "PARSING_PAYLOAD";
    const payoutData = await req.json(); 
    const { total_fiat_amount, buyer_id, contributing_users, payment_reference } = payoutData;
    console.info(`[STATUS] Processing Ref: ${payment_reference}`);

    // --- 2. INFRASTRUCTURE SETUP ---
    currentStep = "CONFIGURING_BLOCKCHAIN";
    const account = privateKeyToAccount(Deno.env.get("PRIVATE_KEY") as `0x${string}`);
    const client = createWalletClient({ 
      account, 
      chain: base, 
      transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org") 
    }).extend(publicActions);

    // --- 3. STEP 4: UNBUFFERED PULL (Ingestion) ---
    currentStep = "BROADCASTING_INGESTION";
    console.info(`[BEGIN: Step 4] Ingestion: Treasury -> Register ($${total_fiat_amount})`);
    const ingestionHash = await client.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [SYSTEM_CASH_REGISTER, parseUnits(total_fiat_amount.toString(), 6)],
      account,
    });
    
    const ingestionReceipt = await client.waitForTransactionReceipt({ hash: ingestionHash });
    if (ingestionReceipt.status !== 'success') throw new Error(`Ingestion Reverted.`);
    console.info(`[END: Step 4] Ingestion Confirmed.`);

    // --- 4. STEP 6: DATA YIELD EGRESS (Payout) ---
    currentStep = "DISSEMINATING_YIELD";
    const royaltyPool = total_fiat_amount * REVENUE_SPLIT.DATA_YIELD;
    const contributorPayouts = [];

    for (const contributor of contributing_users) {
      console.info(`[BEGIN: Step 6] Payout for: ${contributor.user_id}`);
      
      const { data: profile } = await supabase.from('profiles').select('circle_wallet_address').eq('id', contributor.user_id).single();
      const lifeWallet = profile?.circle_wallet_address || "0xc490695880992ec99885e5cdd03aafb5c63b8c33";

      const yieldHash = await client.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [lifeWallet as `0x${string}`, parseUnits(royaltyPool.toFixed(6), 6)],
        account,
      });

      const yieldReceipt = await client.waitForTransactionReceipt({ hash: yieldHash });

      // Audit Log
      await supabase.from('synapse_credit_ledger').insert({
        user_id: contributor.user_id,
        amount: royaltyPool,
        entry_type: 'deposit',
        transaction_type: 'DATA_SALE_PAYOUT',
        status: yieldReceipt.status === 'success' ? 'completed' : 'failed',
        blockchain_tx_hash: yieldHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `Data Yield for Ref: ${payment_reference}`
      });

      contributorPayouts.push({ wallet: lifeWallet, hash: yieldHash });
      console.info(`[END: Step 6] Payout complete for ${contributor.user_id}`);
    }

    // --- 5. STEP 7: SILO HYDRATION (Revenue Split) ---
    currentStep = "HYDRATING_PROTOCOL_REVENUE";
    console.info(`[BEGIN: Step 7] 60/10 Split.`);

    const corporateRevenue = total_fiat_amount * 0.60;
    const escrowWarChest = total_fiat_amount * 0.10;

    await Promise.all([
      supabase.from('synapse_credit_ledger').insert({
        user_id: buyer_id,
        amount: corporateRevenue,
        entry_type: 'revenue',
        transaction_type: 'HUB_PROTOCOL_FEE',
        status: 'completed',
        blockchain_tx_hash: ingestionHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `60% Corporate Revenue: ${payment_reference}`
      }),
      supabase.from('synapse_credit_ledger').insert({
        user_id: buyer_id,
        amount: escrowWarChest,
        entry_type: 'escrow',
        transaction_type: 'ECOSYSTEM_WAR_CHEST',
        status: 'completed',
        blockchain_tx_hash: ingestionHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `10% Ecosystem War Chest: ${payment_reference}`
      })
    ]);

    console.info(`[END: Step 7] Silos Hydrated.`);
    return new Response(JSON.stringify({ success: true, ingestionHash, payouts: contributorPayouts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error: any) {
    console.error(`🚨 [FATAL STALL: ${currentStep}]: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message, failed_at: currentStep }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});