// Edge function: protocol-webhook-dispatcher
// Runs hourly (after the hourly Base anchor run). It:
//   1. retries pending webhook deliveries that are due,
//   2. emits receipt.anchored_l2 for Identity Verification receipts whose ACA hash is anchored,
//   3. emits telemetry.spatial_event for Vulture batches anchored on Base.
// Event keys make every emission idempotent, so re-runs never resend a delivered event.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsFor, denied, resolveCaller } from "../_shared/edge-guard.ts";
import { attemptDelivery, emitEvent } from "../_shared/protocol-webhooks.ts";

const LOOKBACK = new Date(Date.now() - 7 * 86400_000).toISOString();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  const t = `WebhookDispatch.${crypto.randomUUID().slice(0, 8)}`;
  console.log(`[PHASE_START: ${t}.Run]`);
  try {
    const caller = await resolveCaller(req, t);
    if (!caller || (caller.kind !== "service" && caller.kind !== "internal" && caller.kind !== "privileged_user")) return denied(req, 401);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    console.log(`[PHASE_START: ${t}.Retries]`);
    const { data: due, error: dErr } = await db.from("api_webhook_deliveries")
      .select("id, attempts, payload, api_webhooks!inner(url, secret, status)")
      .eq("status", "pending").lte("next_attempt_at", new Date().toISOString()).limit(200);
    if (dErr) throw new Error(`due lookup: ${dErr.message}`);
    let retried = 0;
    for (const d of due ?? []) {
      // deno-lint-ignore no-explicit-any
      const h = (d as any).api_webhooks;
      if (h?.status !== "active") continue;
      await attemptDelivery(db, d, h, t);
      retried++;
    }
    console.log(`[PHASE_END: ${t}.Retries] retried=${retried}`);

    console.log(`[PHASE_START: ${t}.Subscribers]`);
    const { data: hooks, error: hErr } = await db.from("api_webhooks").select("owner_id, events").eq("status", "active");
    if (hErr) throw new Error(`hooks lookup: ${hErr.message}`);
    const receiptOwners = [...new Set((hooks ?? []).filter((h) => h.events.includes("receipt.anchored_l2")).map((h) => h.owner_id))];
    const telemetryOwners = [...new Set((hooks ?? []).filter((h) => h.events.includes("telemetry.spatial_event")).map((h) => h.owner_id))];
    console.log(`[PHASE_END: ${t}.Subscribers] receipt=${receiptOwners.length} telemetry=${telemetryOwners.length}`);

    let emitted = 0;
    for (const owner of receiptOwners) {
      console.log(`[PHASE_START: ${t}.Receipts] owner=${owner}`);
      const { data: rows, error } = await db.from("lidd_extraction_events").select("id, aca_hash_key")
        .eq("extractor_id", owner).not("aca_hash_key", "is", null).gte("created_at", LOOKBACK).limit(1000);
      if (error) { console.error(`[${t}.Receipts] ${error.message}`); continue; }
      for (const r of rows ?? []) {
        const aca = String(r.aca_hash_key);
        await emitEvent(db, owner, "receipt.anchored_l2", `receipt:${r.id}`, {
          liability_receipt_id: r.id, status: "anchored_l2",
          blockchain_proof: { network: "base_mainnet", aca_hash: aca.startsWith("0x") ? aca : `0x${aca}` },
        }, t);
        emitted++;
      }
      console.log(`[PHASE_END: ${t}.Receipts] rows=${rows?.length ?? 0}`);
    }

    for (const owner of telemetryOwners) {
      console.log(`[PHASE_START: ${t}.Batches] owner=${owner}`);
      const { data: rows, error } = await db.from("vulture_ledger").select("id, record_count, sanitized_hash, tx_hash, anchored_at")
        .eq("tenant_id", owner).eq("status", "anchored").gte("anchored_at", LOOKBACK).limit(1000);
      if (error) { console.error(`[${t}.Batches] ${error.message}`); continue; }
      for (const r of rows ?? []) {
        await emitEvent(db, owner, "telemetry.spatial_event", `batch:${r.id}`, {
          batch_id: r.id, status: "sanitized_and_anchored", records_processed: r.record_count,
          sanitized_hash: r.sanitized_hash, l2_anchor: r.tx_hash ? { network: "base_mainnet", transaction_hash: r.tx_hash, anchored_at: r.anchored_at, explorer_url: `https://basescan.org/tx/${r.tx_hash}` } : null,
        }, t);
        emitted++;
      }
      console.log(`[PHASE_END: ${t}.Batches] rows=${rows?.length ?? 0}`);
    }

    return new Response(JSON.stringify({ ok: true, retried, considered: emitted }), { headers: { ...corsFor(req), "Content-Type": "application/json" } });
  } catch (err) {
    console.error(`[${t}.Fault] ${err instanceof Error ? err.stack : String(err)}`);
    return new Response(JSON.stringify({ error: "internal_error", trace_id: t }), { status: 500, headers: { ...corsFor(req), "Content-Type": "application/json" } });
  } finally {
    console.log(`[PHASE_END: ${t}.Run]`);
  }
});
