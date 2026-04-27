// supabase/functions/top-up-credits/index.ts

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Hardcoded ABI saves us from importing Viem's massive constants library
const ERC20_ABI = [{ 
  name: "transfer", type: "function", stateMutability: "nonpayable", 
  inputs: [{ name: "to", type: "address" }, { name: "value", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }] 
}];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("⚡ [Pre-Flight]: Unified Full Hydration Engine Booting...");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  console.log("🚨 [START]: Invocation received. Initializing core parameters...");

  try {
    // 1. DYNAMIC IMPORTS (Prevents Deno Edge memory timeout)
    console.log("🚨 [EXECUTION]: Loading Supabase Client...");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.42.7");

    // 2. PARSING & NORMALIZING PAYLOAD
    const body = await req.json();
    
    // Supports both the old Worldpay payload and the new On-Chain payload
    const user_id = body.user_id;
    const amount = Number(body.amount || body.credit_amount || 0);
    const routing = body.routing || "fiat"; 
    const recipient_address = body.recipient_address;
    const usd_amount = body.usd_amount || amount;
    const payment_reference = body.payment_reference || `PAY-${crypto.randomUUID().slice(0, 8)}`;

    console.log(`🚨 [EXECUTION]: Payload parsed. User: ${user_id} | Amount: ${amount} | Routing: ${routing}`);

    if (!user_id || amount <= 0) {
      throw new Error("Invalid parameters: missing valid user_id or amount.");
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let txHash = payment_reference;

    // --- ROUTE A: ON-CHAIN USDC SETTLEMENT ---
    if (routing === "on-chain") {
      console.log("🚨 [EXECUTION]: On-Chain routing detected. Dynamically loading Viem...");
      const { createWalletClient, http, parseUnits, isAddress, getAddress } = await import("https://esm.sh/viem@2.9.20");
      const { privateKeyToAccount } = await import("https://esm.sh/viem@2.9.20/accounts");
      const { base } = await import("https://esm.sh/viem@2.9.20/chains");

      if (!recipient_address || !isAddress(recipient_address)) {
        throw new Error(`Invalid recipient address format: ${recipient_address}`);
      }
      
      const safeAddress = getAddress(recipient_address);
      let rawPk = Deno.env.get("PRIVATE_KEY") || "";
      if (!rawPk.startsWith("0x")) rawPk = "0x" + rawPk;
      
      const account = privateKeyToAccount(rawPk as `0x${string}`);
      const client = createWalletClient({
        account,
        chain: base,
        transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org")
      });

      console.log(`🚨 [EXECUTION]: Broadcasting ${amount} USDC to Base Mainnet...`);
      const parsedAmount = parseUnits(amount.toString(), 6);
      
      txHash = await client.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [safeAddress, parsedAmount],
        chain: base,
        account,
      });
      console.log(`🚨 [EXECUTION]: On-Chain Transfer Success! Hash: ${txHash}`);
    }

    // --- ROUTE B/COMMON: LEDGER & HYDRATION ---
    console.log("🚨 [EXECUTION]: Securing Synapse Credit Ledger Audit Trail...");
    
    const { error: ledgerError } = await supabase.from("synapse_credit_ledger").insert({
      user_id, 
      amount: -amount, // Matches your verified DEBIT enum structure
      transaction_type: "INTERNAL_DEPOSIT", 
      entry_type: "DEBIT", 
      status: "completed", 
      tx_hash: txHash,
      metadata: { 
        class: "Synapse_Purchase", 
        fund: "CORPORATE_REVENUE",
        usd_amount: usd_amount,
        payment_reference: payment_reference,
        routing: routing
      }
    });
    
    if (ledgerError) {
      console.error(`🚨 [LEDGER STALL]: ${ledgerError.message}`);
      throw new Error(`Ledger Error: ${ledgerError.message}`);
    }

    console.log("🚨 [EXECUTION]: Ledger secured. Hydrating CORPORATE_REVENUE column...");
    
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('corporate_revenue')
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      console.error(`🚨 [FETCH STALL]: ${fetchError.message}`);
      throw new Error(`Wallet Fetch Error: ${fetchError.message}`);
    }

    const newRev = (Number(wallet?.corporate_revenue) || 0) + amount;
    
    const { error: updateError } = await supabase.from('wallets').update({ 
      corporate_revenue: newRev, 
      updated_at: new Date().toISOString()
    }).eq('user_id', user_id);
    
    if (updateError) {
      console.error(`🚨 [UPDATE STALL]: ${updateError.message}`);
      throw new Error(`Wallet Update Error: ${updateError.message}`);
    }

    console.log(`🚨 [END]: Full Hydration Settlement Complete. Corporate Revenue: ${newRev}`);

    return new Response(JSON.stringify({ 
      success: true, 
      hash: txHash, 
      revenue_total: newRev 
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error: any) {
    console.error(`🚨 [FATAL EXCEPTION]: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }, 
      status: 400 
    });
  }
});