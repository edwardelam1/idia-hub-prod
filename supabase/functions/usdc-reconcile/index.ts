// supabase/functions/usdc-reconcile/index.ts
// Polls Base RPC for USDC balanceOf() on every tracked wallet and corrects DB drift.
// Run on a 5-min cron as a safety net for missed Alchemy webhooks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BALANCE_OF_SELECTOR = "0x70a08231"; // keccak256("balanceOf(address)")[:4]

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("[BOOT: usdc-reconcile] online");

function encodeBalanceOf(address: string): string {
  const a = address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  return BALANCE_OF_SELECTOR + a;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.log("[BEGIN: INVOKE] usdc-reconcile");
  let stage = "INIT";

  try {
    stage = "CONFIG";
    const rpcUrl = Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";

    stage = "INIT_ADMIN";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    stage = "FETCH_WALLETS";
    const { data: wallets, error: wErr } = await supabase
      .from("wallets")
      .select("user_id, wallet_address, idia_beta_balance")
      .ilike("wallet_address", "0x%")
      .limit(500);
    if (wErr) throw new Error(`WALLETS_FETCH_FAILED: ${wErr.message}`);
    console.log(`[STATUS] tracking ${wallets?.length ?? 0} wallets`);

    if (!wallets || wallets.length === 0) {
      return new Response(JSON.stringify({ ok: true, checked: 0, drift: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batched JSON-RPC for speed
    stage = "RPC_BATCH";
    const batch = wallets
      .filter((w) => /^0x[0-9a-fA-F]{40}$/.test(String(w.wallet_address)))
      .map((w, i) => ({
        jsonrpc: "2.0",
        id: i,
        method: "eth_call",
        params: [{ to: USDC, data: encodeBalanceOf(String(w.wallet_address)) }, "latest"],
      }));

    const rpcResp = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!rpcResp.ok) throw new Error(`RPC_HTTP_${rpcResp.status}`);
    const rpcResults = await rpcResp.json();

    let checked = 0;
    let drift = 0;
    for (let i = 0; i < batch.length; i++) {
      checked++;
      const w = wallets[i];
      const r = rpcResults.find((x: any) => x.id === i);
      const hex = r?.result;
      if (!hex || hex === "0x") continue;
      const onchainMicro = BigInt(hex);
      const dbMicro = BigInt(w.idia_beta_balance ?? 0);
      if (onchainMicro === dbMicro) continue;

      drift++;
      console.warn(
        `[RECONCILE_DRIFT] user=${w.user_id} db=${dbMicro.toString()} onchain=${onchainMicro.toString()}`,
      );
      const { error: setErr } = await supabase.rpc("set_usdc_balance", {
        p_user_id: w.user_id,
        p_micro_balance: Number(onchainMicro),
        p_block_number: null,
      });
      if (setErr) console.error(`[ERROR: SET_BALANCE] ${setErr.message}`);
    }

    console.log(`[END: INVOKE] checked=${checked} drift=${drift}`);
    return new Response(JSON.stringify({ ok: true, checked, drift }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`🚨 [FATAL: ${stage}] ${err?.message}`);
    return new Response(JSON.stringify({ error: err?.message ?? "unknown", failed_at: stage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
