// Edge function: vulture-notarization-relayer
// Batches vulture_ledger rows staged for notarization, builds a Merkle root over their
// sanitized_hash values and anchors ONLY that 32-byte root on Base (zero-value self-transaction
// from the relayer wallet, calldata = "IDVL" magic + root). No payload, tenant, node or CJIS
// metadata ever leaves the database (MOU §3.A.5). Rows move to status 'anchored' with
// tx_hash, batch_id, merkle_leaf_index and anchored_at.
// Callers: scheduled job (service key), internal secret, or super_admin/security_operator.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createPublicClient, createWalletClient, http } from "https://esm.sh/viem@2.9.20";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { corsFor, denied, resolveCaller } from "../_shared/edge-guard.ts";
import { anchorCalldata, merkleRoot } from "../_shared/vulture-cjis.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_LEAVES = 512;
const SCOPE = "VULTURE_NOTARY";

const rpcUrl = () => Deno.env.get("ALCHEMY_BASE_RPC_URL") ?? Deno.env.get("BASE_RPC_URL") ?? "https://mainnet.base.org";

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const runId = `notary_${crypto.randomUUID()}`;
  console.log(`[${SCOPE}][PHASE_START] run=${runId}`);
  const caller = await resolveCaller(req, SCOPE);
  if (!caller) return denied(req, 401);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const transport = http(rpcUrl());
  const publicClient = createPublicClient({ chain: base, transport });

  const anchorRows = async (batchId: string, txHash: string, blockNumber: bigint) => {
    const anchoredAt = new Date().toISOString();
    const { error: bErr } = await db.from("vulture_notarization_batches")
      .update({ status: "anchored", block_number: Number(blockNumber), error_message: null }).eq("id", batchId);
    if (bErr) throw bErr;
    const { error: rErr } = await db.from("vulture_ledger")
      .update({ status: "anchored", tx_hash: txHash, anchored_at: anchoredAt })
      .eq("batch_id", batchId).eq("status", "staged_for_notarization");
    if (rErr) throw rErr;
  };

  const failBatch = async (batchId: string, message: string) => {
    await db.from("vulture_notarization_batches").update({ status: "failed", error_message: message.slice(0, 500) }).eq("id", batchId);
    await db.from("vulture_ledger").update({ batch_id: null, merkle_leaf_index: null })
      .eq("batch_id", batchId).eq("status", "staged_for_notarization");
  };

  try {
    // ---- 1. Reconcile batches already broadcast in earlier runs ----
    console.log(`[${SCOPE}][PHASE_START] RECONCILE`);
    const { data: inflight, error: inErr } = await db.from("vulture_notarization_batches")
      .select("id, tx_hash").eq("status", "broadcast").limit(20);
    if (inErr) throw inErr;
    for (const b of inflight ?? []) {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: b.tx_hash as `0x${string}` });
        if (receipt.status === "success") await anchorRows(b.id, b.tx_hash!, receipt.blockNumber);
        else await failBatch(b.id, "anchor transaction reverted");
        console.log(`[${SCOPE}] reconciled batch=${b.id} status=${receipt.status}`);
      } catch (e) {
        console.log(`[${SCOPE}] batch=${b.id} still pending: ${(e as Error).message?.slice(0, 120)}`);
      }
    }
    console.log(`[${SCOPE}][PHASE_END] RECONCILE count=${inflight?.length ?? 0}`);

    // ---- 2. Collect the next batch (hashes only — payload is never selected) ----
    console.log(`[${SCOPE}][PHASE_START] COLLECT`);
    const { data: rows, error: rowsErr } = await db.from("vulture_ledger")
      .select("id, sanitized_hash")
      .eq("status", "staged_for_notarization").is("batch_id", null)
      .order("created_at", { ascending: true }).order("id", { ascending: true })
      .limit(MAX_LEAVES);
    if (rowsErr) throw rowsErr;
    console.log(`[${SCOPE}][PHASE_END] COLLECT leaves=${rows?.length ?? 0}`);
    if (!rows || rows.length === 0) {
      console.log(`[${SCOPE}][PHASE_END] run=${runId} nothing to anchor`);
      return respond({ ok: true, anchored: 0, reconciled: inflight?.length ?? 0 });
    }

    // ---- 3. Merkle root + batch claim ----
    console.log(`[${SCOPE}][PHASE_START] MERKLE`);
    const root = await merkleRoot(rows.map((r) => r.sanitized_hash));
    const { data: batch, error: batchErr } = await db.from("vulture_notarization_batches")
      .insert({ merkle_root: root, leaf_count: rows.length, status: "pending" }).select("id").single();
    if (batchErr) throw batchErr;
    for (let i = 0; i < rows.length; i++) {
      const { error } = await db.from("vulture_ledger").update({ batch_id: batch.id, merkle_leaf_index: i })
        .eq("id", rows[i].id).is("batch_id", null);
      if (error) { await failBatch(batch.id, `claim failed: ${error.message}`); throw error; }
    }
    console.log(`[${SCOPE}][PHASE_END] MERKLE batch=${batch.id} root=${root}`);

    // ---- 4. Broadcast under the relayer single-writer lock ----
    console.log(`[${SCOPE}][PHASE_START] LOCK`);
    let locked = false;
    for (let attempt = 0; attempt < 20 && !locked; attempt++) {
      const { data } = await db.rpc("acquire_relayer_lock", { run_id: runId, timeout_seconds: 180 });
      locked = data === true;
      if (!locked) await new Promise((r) => setTimeout(r, 2000));
    }
    if (!locked) {
      await failBatch(batch.id, "relayer busy — retry next run");
      console.log(`[${SCOPE}][PHASE_END] LOCK not acquired`);
      return respond({ ok: false, error: "Relayer busy; batch will retry." }, 202);
    }
    console.log(`[${SCOPE}][PHASE_END] LOCK`);

    let txHash: `0x${string}`;
    try {
      console.log(`[${SCOPE}][PHASE_START] BROADCAST`);
      const pk = Deno.env.get("RELAYER_PRIVATE_KEY");
      if (!pk) throw new Error("RELAYER_PRIVATE_KEY is not set");
      const account = privateKeyToAccount((pk.trim().startsWith("0x") ? pk.trim() : `0x${pk.trim()}`) as `0x${string}`);
      const wallet = createWalletClient({ chain: base, transport, account });
      const chainId = await publicClient.getChainId();
      if (chainId !== 8453) throw new Error(`RPC is not Base mainnet (chain ${chainId})`);
      const balance = await publicClient.getBalance({ address: account.address });
      if (balance === 0n) throw new Error(`Relayer ${account.address} has no ETH for gas`);
      txHash = await wallet.sendTransaction({ account, chain: base, to: account.address, value: 0n, data: anchorCalldata(root) });
      const { error: bcErr } = await db.from("vulture_notarization_batches")
        .update({ status: "broadcast", tx_hash: txHash, relayer_address: account.address }).eq("id", batch.id);
      if (bcErr) console.error(`[${SCOPE}] could not record broadcast: ${bcErr.message}`);
      console.log(`[${SCOPE}][PHASE_END] BROADCAST tx=${txHash}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[${SCOPE}][PHASE_END] BROADCAST failed: ${e instanceof Error ? e.stack : msg}`);
      await failBatch(batch.id, msg);
      return respond({ ok: false, error: "Anchor broadcast failed; batch will retry.", batch_id: batch.id }, 502);
    } finally {
      await db.rpc("release_relayer_lock", { run_id: runId });
    }

    // ---- 5. Confirm (bounded wait; unconfirmed batches are reconciled next run) ----
    console.log(`[${SCOPE}][PHASE_START] CONFIRM`);
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
      if (receipt.status === "success") {
        await anchorRows(batch.id, txHash, receipt.blockNumber);
        console.log(`[${SCOPE}][PHASE_END] CONFIRM block=${receipt.blockNumber}`);
        return respond({ ok: true, anchored: rows.length, batch_id: batch.id, merkle_root: root, tx_hash: txHash });
      }
      await failBatch(batch.id, "anchor transaction reverted");
      console.error(`[${SCOPE}][PHASE_END] CONFIRM reverted`);
      return respond({ ok: false, error: "Anchor transaction reverted.", tx_hash: txHash }, 502);
    } catch {
      console.log(`[${SCOPE}][PHASE_END] CONFIRM pending — will reconcile next run`);
      return respond({ ok: true, pending: true, batch_id: batch.id, merkle_root: root, tx_hash: txHash }, 202);
    }
  } catch (err) {
    console.error(`[${SCOPE}][FAULT] ${err instanceof Error ? err.stack : String(err)}`);
    return respond({ error: "Notarization run failed." }, 500);
  }
});
