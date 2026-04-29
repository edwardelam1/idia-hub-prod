// supabase/functions/top-up-credits/index.ts
// Hardened payload contract: aligned with SynapseTopUp.tsx frontend.

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const ERC20_ABI = [{
  name: "transfer", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "to", type: "address" }, { name: "value", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }],
}];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("[BOOT: top-up-credits] Hydration Engine v3 online.");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.log("[BEGIN: INVOKE] top-up-credits");

  let stage = "INIT";
  try {
    stage = "IMPORT_SDK";
    console.log(`[BEGIN: ${stage}]`);
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.42.7");
    console.log(`[END: ${stage}]`);

    stage = "PARSE_PAYLOAD";
    console.log(`[BEGIN: ${stage}]`);
    const body = await req.json().catch((e) => {
      throw new Error(`PAYLOAD_PARSE_FAILED: ${e?.message}`);
    });
    // Accept BOTH naming schemes (frontend sends user_wallet+payment_method+credit_amount)
    const user_id: string | undefined = body.user_id;
    const credit_amount = Number(body.credit_amount ?? body.amount ?? 0);
    const usd_amount = Number(body.usd_amount ?? credit_amount * 0.75 ?? 0);
    const user_wallet: string | undefined = body.user_wallet ?? body.recipient_address;
    const payment_method: string = (body.payment_method ?? "usdc").toLowerCase();
    const routing: string = (body.routing ?? (payment_method === "usdc" ? "on-chain" : "fiat")).toLowerCase();
    const payment_reference: string = body.payment_reference || `PAY-${crypto.randomUUID().slice(0, 8)}`;
    console.log(`[END: ${stage}] user_id=${user_id} credit_amount=${credit_amount} usd_amount=${usd_amount} routing=${routing} wallet=${user_wallet ?? "<none>"}`);

    stage = "VALIDATION";
    console.log(`[BEGIN: ${stage}]`);
    if (!user_id || typeof user_id !== "string") {
      throw new Error(`VALIDATION_FAILED: user_id is missing or invalid. Received: ${user_id}`);
    }
    if (!Number.isFinite(credit_amount) || credit_amount <= 0) {
      throw new Error(`VALIDATION_FAILED: credit_amount must be > 0. Received: ${body.credit_amount ?? body.amount}`);
    }
    if (routing === "on-chain") {
      if (!user_wallet || typeof user_wallet !== "string" || !user_wallet.startsWith("0x")) {
        throw new Error(`VALIDATION_FAILED: Buyer wallet address is missing or invalid for on-chain routing. Received: ${user_wallet}`);
      }
    }
    console.log(`[END: ${stage}] OK`);

    stage = "INIT_ADMIN_CLIENT";
    console.log(`[BEGIN: ${stage}]`);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    console.log(`[END: ${stage}]`);

    let txHash: string = payment_reference;

    if (routing === "on-chain") {
      stage = "ONCHAIN_BROADCAST";
      console.log(`[BEGIN: ${stage}] Loading viem...`);
      const { createWalletClient, http, parseUnits, isAddress, getAddress } = await import("https://esm.sh/viem@2.9.20");
      const { privateKeyToAccount } = await import("https://esm.sh/viem@2.9.20/accounts");
      const { base } = await import("https://esm.sh/viem@2.9.20/chains");

      if (!isAddress(user_wallet!)) {
        throw new Error(`VALIDATION_FAILED: user_wallet failed checksum. Received: ${user_wallet}`);
      }
      const safeAddress = getAddress(user_wallet!);

      let rawPk = Deno.env.get("PRIVATE_KEY") || "";
      if (!rawPk) throw new Error("CONFIG_MISSING: PRIVATE_KEY env var is not set.");
      if (!rawPk.startsWith("0x")) rawPk = "0x" + rawPk;

      const account = privateKeyToAccount(rawPk as `0x${string}`);
      const client = createWalletClient({
        account,
        chain: base,
        transport: http(Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org"),
      });

      console.log(`[${stage}] Broadcasting ${credit_amount} USDC -> ${safeAddress}`);
      txHash = await client.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [safeAddress, parseUnits(credit_amount.toString(), 6)],
        chain: base,
        account,
      });
      console.log(`[END: ${stage}] hash=${txHash}`);
    } else {
      console.log(`[SKIP: ONCHAIN_BROADCAST] routing=${routing}`);
    }

    stage = "LEDGER_INSERT";
    console.log(`[BEGIN: ${stage}]`);
    const { error: ledgerError } = await supabase.from("synapse_credit_ledger").insert({
      user_id,
      amount: -credit_amount,
      transaction_type: "INTERNAL_DEPOSIT",
      entry_type: "DEBIT",
      status: "completed",
      tx_hash: txHash,
      metadata: {
        class: "Synapse_Purchase",
        fund: "CORPORATE_REVENUE",
        usd_amount,
        payment_reference,
        routing,
        user_wallet: user_wallet ?? null,
      },
    });
    if (ledgerError) {
      throw new Error(`LEDGER_INSERT_FAILED: ${ledgerError.message}`);
    }
    console.log(`[END: ${stage}]`);

    stage = "WALLET_HYDRATE";
    console.log(`[BEGIN: ${stage}]`);
    const { data: wallet, error: fetchError } = await supabase
      .from("wallets")
      .select("corporate_revenue")
      .eq("user_id", user_id)
      .single();
    if (fetchError) throw new Error(`WALLET_FETCH_FAILED: ${fetchError.message}`);

    const newRev = (Number(wallet?.corporate_revenue) || 0) + credit_amount;
    const { error: updateError } = await supabase
      .from("wallets")
      .update({ corporate_revenue: newRev, updated_at: new Date().toISOString() })
      .eq("user_id", user_id);
    if (updateError) throw new Error(`WALLET_UPDATE_FAILED: ${updateError.message}`);
    console.log(`[END: ${stage}] newRev=${newRev}`);

    console.log(`[END: INVOKE] success hash=${txHash}`);
    return new Response(
      JSON.stringify({ success: true, hash: txHash, revenue_total: newRev }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error(`🚨 [FATAL: ${stage}] ${error?.message}`);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unknown error", failed_at: stage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
