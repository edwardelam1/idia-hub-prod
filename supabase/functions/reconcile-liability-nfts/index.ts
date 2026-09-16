// Reconciles on-chain Liability Receipt NFTs with Hub egress receipts.
//
// The IDIA Liability Receipt contract mints an NFT to the data buyer's wallet
// for each settled purchase. Each mint carries `synapseReceiptId`, which is the
// 0x-prefixed liability token hash written on the matching egress_logs row.
// This function reads the buyer's minted receipts from Base mainnet and writes
// the token id / tx state back onto the matching egress rows.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createPublicClient, http } from "https://esm.sh/viem@2.9.20";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { PROTOCOL } from "../_shared/contracts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIABILITY_RECEIPT_ABI = [
  {
    name: "getReceiptsByBuyer",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "buyer", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getReceipt",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "dataBuyer", type: "address" },
          { name: "acaHashes", type: "bytes32[]" },
          { name: "purchaseAmount", type: "uint256" },
          { name: "synapseReceiptId", type: "bytes32" },
          { name: "dataBundleRef", type: "string" },
          { name: "mintedAt", type: "uint256" },
          { name: "blockNumber", type: "uint256" },
        ],
      },
    ],
  },
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let phase = "INIT";
  try {
    phase = "AUTH";
    console.info(`[PHASE_START: ReconcileNFT.${phase}]`);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Authentication required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the caller's JWT with the service-role client so this does not
    // depend on which anon/publishable key env var happens to be present.
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      console.error(`[PHASE_END: ReconcileNFT.AUTH] rejected: ${userError?.message ?? "no user on token"}`);
      throw new Error("Invalid authentication token");
    }
    const userId = userData.user.id;
    console.info(`[PHASE_END: ReconcileNFT.AUTH] user=${userId.slice(0, 8)}`);

    phase = "WALLET";
    console.info(`[PHASE_START: ReconcileNFT.${phase}]`);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("wallet_address")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    const wallet = (profile?.wallet_address ?? "").trim();
    if (!wallet.startsWith("0x")) {
      console.info(`[PHASE_END: ReconcileNFT.WALLET] no wallet on profile — nothing to reconcile`);
      return new Response(JSON.stringify({ success: true, wallet: null, matched: 0, receipts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.info(`[PHASE_END: ReconcileNFT.WALLET] wallet=${wallet}`);

    phase = "CHAIN_READ";
    console.info(`[PHASE_START: ReconcileNFT.${phase}]`);
    const rpcUrl = Deno.env.get("ALCHEMY_BASE_RPC_URL") ?? "https://mainnet.base.org";
    const client = createPublicClient({ chain: base, transport: http(rpcUrl) });

    const tokenIds = (await client.readContract({
      address: PROTOCOL.liabilityReceipt as `0x${string}`,
      abi: LIABILITY_RECEIPT_ABI,
      functionName: "getReceiptsByBuyer",
      args: [wallet as `0x${string}`],
    })) as bigint[];
    console.info(`[PHASE_END: ReconcileNFT.CHAIN_READ] tokens=${tokenIds.length}`);

    phase = "MATCH";
    console.info(`[PHASE_START: ReconcileNFT.${phase}]`);
    const byLiabilityHash = new Map<string, { tokenId: string; mintedAt: string | null }>();
    for (const tokenId of tokenIds.slice(-200)) {
      try {
        const receipt = (await client.readContract({
          address: PROTOCOL.liabilityReceipt as `0x${string}`,
          abi: LIABILITY_RECEIPT_ABI,
          functionName: "getReceipt",
          args: [tokenId],
        })) as {
          synapseReceiptId: `0x${string}`;
          mintedAt: bigint;
        };
        const hash = (receipt.synapseReceiptId ?? "").toString().replace(/^0x/, "").toLowerCase();
        if (!hash || /^0+$/.test(hash)) continue;
        byLiabilityHash.set(hash, {
          tokenId: tokenId.toString(),
          mintedAt: receipt.mintedAt > 0n ? new Date(Number(receipt.mintedAt) * 1000).toISOString() : null,
        });
      } catch (e) {
        const err = e as Error;
        console.error(`[ERROR: ReconcileNFT.MATCH] token ${tokenId}: ${err.message}\n${err.stack ?? ""}`);
      }
    }
    console.info(`[PHASE_END: ReconcileNFT.MATCH] resolved=${byLiabilityHash.size}`);

    phase = "PERSIST";
    console.info(`[PHASE_START: ReconcileNFT.${phase}]`);
    let matched = 0;
    if (byLiabilityHash.size > 0) {
      const { data: rows, error: rowsError } = await admin
        .from("egress_logs")
        .select("id, liability_token_hash, nft_token_id")
        .eq("user_id", userId)
        .in("liability_token_hash", Array.from(byLiabilityHash.keys()));
      if (rowsError) throw rowsError;

      for (const row of rows ?? []) {
        const mint = byLiabilityHash.get((row.liability_token_hash ?? "").toLowerCase());
        if (!mint || row.nft_token_id === mint.tokenId) continue;
        const { error: updateError } = await admin
          .from("egress_logs")
          .update({
            nft_token_id: mint.tokenId,
            nft_minted: true,
            nft_minted_at: mint.mintedAt,
            on_chain_status: "MINTED",
          })
          .eq("id", row.id);
        if (updateError) {
          console.error(`[ERROR: ReconcileNFT.PERSIST] ${row.id}: ${updateError.message}`);
          continue;
        }
        matched += 1;
      }
    }
    console.info(`[PHASE_END: ReconcileNFT.PERSIST] updated=${matched}`);

    return new Response(
      JSON.stringify({
        success: true,
        wallet,
        contract: PROTOCOL.liabilityReceipt,
        on_chain_tokens: tokenIds.length,
        updated: matched,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const err = e as Error;
    console.error(`[CRITICAL FAILURE: ReconcileNFT.${phase}] ${err.message}\n${err.stack ?? ""}`);
    return new Response(JSON.stringify({ error: err.message, failed_at: phase }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
