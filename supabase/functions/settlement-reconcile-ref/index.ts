// ══════════════════════════════════════════════════════════════════════
// settlement-reconcile-ref
// Read-only against chain, idempotent writes against DB.
// - Loads settlement_queue row by reference_id
// - Re-resolves each contributor's wallet_address via service-role
// - Queries Alchemy alchemy_getAssetTransfers for USDC + IDIA transfers
//   from the relayer to each wallet within a block window
// - Idempotently upserts synapse_credit_ledger rows keyed on
//   (blockchain_tx_hash, user_id, transaction_type)
// - Writes back status/last_error/completed_at/skipped_contributors
// ══════════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
// IDIA token address on Base (from src/config/contracts.ts). Optional — if
// unknown or not deployed, IDIA rows are simply skipped.
const IDIA_ADDRESS = Deno.env.get("IDIA_TOKEN_ADDRESS") ?? null;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function rpc(url: string, method: string, params: unknown[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(`RPC ${method} error: ${j.error.message}`);
  return j.result;
}

async function getAssetTransfers(
  url: string,
  fromAddress: string,
  toAddress: string,
  contracts: string[],
  fromBlockHex: string,
) {
  return await rpc(url, "alchemy_getAssetTransfers", [
    {
      fromAddress,
      toAddress,
      contractAddresses: contracts,
      category: ["erc20"],
      withMetadata: true,
      excludeZeroValue: true,
      fromBlock: fromBlockHex,
      toBlock: "latest",
      maxCount: "0x64",
    },
  ]);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const url = Deno.env.get("SUPABASE_URL");
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rpcUrl = Deno.env.get("ALCHEMY_BASE_RPC_URL");
  let relayer = Deno.env.get("LIFE_RELAYER_ADDRESS");
  if (!relayer) {
    // Derive from RELAYER_PRIVATE_KEY if the address secret isn't set explicitly.
    const rawKey = Deno.env.get("RELAYER_PRIVATE_KEY");
    if (rawKey) {
      const formattedKey = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;
      try {
        relayer = privateKeyToAccount(formattedKey as `0x${string}`).address;
      } catch (e: any) {
        return json(500, { error: `Cannot derive relayer address: ${e.message}` });
      }
    }
  }

  if (!url || !svc) return json(500, { error: "Missing Supabase env" });
  if (!rpcUrl) return json(500, { error: "Missing ALCHEMY_BASE_RPC_URL" });
  if (!relayer) return json(500, { error: "Missing LIFE_RELAYER_ADDRESS or RELAYER_PRIVATE_KEY" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const reference_id: string | undefined = body?.reference_id;
  const lookback_blocks: number = Number.isFinite(body?.lookback_blocks) ? body.lookback_blocks : 200_000;
  if (!reference_id) return json(400, { error: "reference_id required" });

  const supabase = createClient(url, svc, { auth: { persistSession: false } });

  // 1. Load queue row
  const { data: queueRow, error: queueErr } = await supabase
    .from("settlement_queue")
    .select("*")
    .eq("reference_id", reference_id)
    .maybeSingle();
  if (queueErr) return json(500, { error: `queue lookup: ${queueErr.message}` });
  if (!queueRow) return json(404, { error: `no settlement_queue row for ${reference_id}` });

  const payload = queueRow.payload ?? {};
  const buyer_id: string | undefined = payload.buyer_id;
  const contributors: Array<{ user_id: string }> = Array.isArray(payload.contributing_users)
    ? payload.contributing_users
    : [];
  const totalFiat: number = Number(payload.total_fiat_amount) || 0;
  const perYield = contributors.length > 0 ? (totalFiat * 0.3) / contributors.length : 0;

  // 2. Determine block window
  const latestHex: string = await rpc(rpcUrl, "eth_blockNumber", []);
  const latest = parseInt(latestHex, 16);
  const fromBlock = Math.max(0, latest - lookback_blocks);
  const fromBlockHex = "0x" + fromBlock.toString(16);

  const contracts = [USDC_ADDRESS];
  if (IDIA_ADDRESS) contracts.push(IDIA_ADDRESS);

  const matched: any[] = [];
  const missing: any[] = [];
  const alreadySettled: any[] = [];
  const skipped: Array<{ user_id: string; reason: string }> = [];

  for (const c of contributors) {
    // Resolve wallet via service-role
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", c.user_id)
      .maybeSingle();
    const wallet: string | null = profile?.wallet_address ?? null;
    if (!wallet) {
      skipped.push({ user_id: c.user_id, reason: "missing_wallet" });
      missing.push({ user_id: c.user_id, reason: "missing_wallet" });
      continue;
    }

    let transfers: any;
    try {
      transfers = await getAssetTransfers(rpcUrl, relayer, wallet, contracts, fromBlockHex);
    } catch (e: any) {
      missing.push({ user_id: c.user_id, wallet, reason: `rpc_error: ${e.message}` });
      continue;
    }
    const list: any[] = transfers?.transfers ?? [];
    if (list.length === 0) {
      missing.push({ user_id: c.user_id, wallet, reason: "no_onchain_transfer_found" });
      continue;
    }

    for (const t of list) {
      const txHash: string = t.hash;
      const value: number = Number(t.value ?? 0);
      const asset: string = t.asset ?? "";
      const isUsdc = String(t.rawContract?.address ?? "").toLowerCase() === USDC_ADDRESS.toLowerCase();
      const transaction_type = isUsdc ? "data_sale_payout" : "idia_royalty_yield";

      // Idempotency check
      const { data: existing } = await supabase
        .from("synapse_credit_ledger")
        .select("id")
        .eq("blockchain_tx_hash", txHash)
        .eq("user_id", c.user_id)
        .eq("transaction_type", transaction_type)
        .maybeSingle();
      if (existing) {
        alreadySettled.push({ user_id: c.user_id, wallet, tx: txHash, transaction_type });
        continue;
      }

      const { error: insErr } = await supabase.from("synapse_credit_ledger").insert({
        user_id: c.user_id,
        amount: 0,
        entry_type: "onchain_payout",
        transaction_type,
        status: "completed",
        blockchain_tx_hash: txHash,
        is_settled: true,
        settled_at: new Date().toISOString(),
        description: `Reconciled ${asset} for Ref: ${reference_id}`,
        metadata: {
          onchain_amount: value,
          asset,
          wallet,
          reference_id,
        },
      });
      if (insErr) {
        missing.push({ user_id: c.user_id, wallet, tx: txHash, reason: `insert_error: ${insErr.message}` });
        continue;
      }
      matched.push({ user_id: c.user_id, wallet, tx: txHash, transaction_type, amount: value });
    }
  }

  // Write back queue status
  const anyMatched = matched.length > 0 || alreadySettled.length > 0;
  const anyMissing = missing.length > 0 || skipped.length > 0;
  const status = anyMatched && !anyMissing ? "completed" : anyMatched ? "partial" : "failed";

  await supabase
    .from("settlement_queue")
    .update({
      status,
      completed_at: new Date().toISOString(),
      last_error: anyMissing ? JSON.stringify({ missing: missing.slice(0, 20) }) : null,
      skipped_contributors: skipped.length > 0 ? skipped : null,
    })
    .eq("reference_id", reference_id);

  return json(200, {
    reference_id,
    buyer_id,
    contributor_count: contributors.length,
    per_contributor_yield_usdc: perYield,
    block_window: { from: fromBlockHex, to: "latest", latest },
    matched,
    already_settled: alreadySettled,
    missing,
    skipped,
    queue_status: status,
  });
});