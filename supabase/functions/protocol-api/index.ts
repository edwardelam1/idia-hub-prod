// Edge function: protocol-api
// Public IDIA Protocol API (v1). Routes:
//   GET  /v1/auth/provision-status
//   POST /v1/utility/validate               (Identity Verification Utility, atomic charge, Idempotency-Key)
//   GET  /v1/utility/receipts/{receipt_id}
//   POST /v1/vulture/ingest                 (forwards to mesh-telemetry-intake — same sanitize/ledger path)
//   GET  /v1/vulture/verify/{batch_id}      (offline-verifiable Merkle inclusion proof)
//   GET  /v1/billing/balance                (live Synapse Credit balance + rate cards)
//   POST /v1/webhooks · GET /v1/webhooks · DELETE /v1/webhooks/{id} · POST /v1/webhooks/test
// Every response carries X-RateLimit-* headers (fixed 60 s window per key); over-limit → 429.
// X-IDIA-Environment: sandbox validates exactly like production but charges nothing and stores nothing.
// Auth: IDIA key in `x-api-key` (or `Authorization: Bearer <idia key>`). Utility routes take
// Identity Verification keys; Vulture routes take mesh node keys. All data is live — no samples.
import { createClient } from "npm:@supabase/supabase-js@2";
import { availableCredits, chargeServiceUsage, resolveServiceAccess, round4, usageCost } from "../_shared/service-provisioning.ts";
import { merkleProof } from "../_shared/vulture-cjis.ts";
import { WEBHOOK_EVENTS, buildEvent, emitEvent, newWebhookSecret, sendSigned } from "../_shared/protocol-webhooks.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IDENTITY_VAULT_URL = "https://thebigidia.com/_functions/resolveIdentityGuid";
const RESOLUTION_URL = "https://hub.thebigidia.com/billing";
export const MAX_TARGETS = 1000;
const HASH_RE = /^[a-f0-9]{64}$/;
export const RATE_LIMIT_PER_MIN = 120;
const MAX_VULTURE_RECORDS = 500;
const MAX_VULTURE_BYTES = 5 * 1024 * 1024;
const TARGET_TYPES = new Set(["hashed_ip", "hashed_maid", "hashed_email", "hashed_phone", "hashed_identifier"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization, apikey, x-client-info, idempotency-key, x-idia-environment",
  "Access-Control-Expose-Headers": "x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset, retry-after, idempotent-replayed",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });
const apiError = (status: number, code: string, message: string, trace: string, details?: unknown, resolution_url?: string) =>
  json({ error: { code, message, ...(details ? { details } : {}), ...(resolution_url ? { resolution_url } : {}), trace_id: trace } }, status);

async function sha256Hex(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const maskGuid = (g: string) => (g.length > 8 ? `${g.slice(0, 4)}***${g.slice(-4)}` : "***");
const hex0x = (h: string | null | undefined) => (h ? (h.startsWith("0x") ? h : `0x${h}`) : null);

function presentedKey(req: Request) {
  const x = req.headers.get("x-api-key");
  if (x) return x.trim();
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  // A Supabase JWT in Authorization is gateway routing, not an IDIA credential.
  return bearer && bearer.split(".").length !== 3 ? bearer : "";
}

// deno-lint-ignore no-explicit-any
type Db = any;

async function ownerFromUtilityKey(db: Db, key: string, t: string) {
  console.log(`[PHASE_START: ${t}.UtilityKeyAuth]`);
  const { data, error } = await db.from("api_keys").select("id, user_id").eq("key_hash", await sha256Hex(key))
    .eq("status", "active").eq("environment", "lidd").maybeSingle();
  if (error) throw new Error(`key lookup: ${error.message}`);
  console.log(`[PHASE_END: ${t}.UtilityKeyAuth] found=${!!data}`);
  if (data) await db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return (data?.user_id as string | undefined) ?? null;
}

async function ownerFromAnyKey(db: Db, key: string, t: string) {
  console.log(`[PHASE_START: ${t}.AnyKeyAuth]`);
  const hash = await sha256Hex(key);
  const { data: node, error: nErr } = await db.from("mesh_nodes").select("tenant_id, status").eq("token_hash", hash).maybeSingle();
  if (nErr) throw new Error(`node lookup: ${nErr.message}`);
  if (node) {
    console.log(`[PHASE_END: ${t}.AnyKeyAuth] kind=mesh_node status=${node.status}`);
    return node.status === "active" ? (node.tenant_id as string | null) : null;
  }
  const { data: k, error: kErr } = await db.from("api_keys").select("user_id").eq("key_hash", hash).eq("status", "active").maybeSingle();
  if (kErr) throw new Error(`key lookup: ${kErr.message}`);
  console.log(`[PHASE_END: ${t}.AnyKeyAuth] kind=api_key found=${!!k}`);
  return (k?.user_id as string | undefined) ?? null;
}

const isSandbox = (req: Request) => (req.headers.get("x-idia-environment") ?? "").trim().toLowerCase() === "sandbox";

async function maybeEmitCreditDepleted(db: Db, owner: string, remaining: number, t: string) {
  const { data: hooks } = await db.from("api_webhooks").select("credit_threshold")
    .eq("owner_id", owner).eq("status", "active").contains("events", ["wallet.credit_depleted"]);
  const threshold = Math.max(0, ...(hooks ?? []).map((h: { credit_threshold: number | null }) => Number(h.credit_threshold ?? 0)));
  if (!hooks?.length || remaining >= threshold) return;
  const day = new Date().toISOString().slice(0, 10);
  await emitEvent(db, owner, "wallet.credit_depleted", `credit_depleted:${day}`,
    { synapse_credits_available: remaining, threshold: round4(threshold), currency: "CRD" }, t);
}

// ---------------- Routes ----------------

async function provisionStatus(db: Db, key: string, t: string) {
  const owner = await ownerFromAnyKey(db, key, t);
  if (!owner) return apiError(401, "invalid_api_key", "Invalid or revoked API key.", t);
  const [utility, vulture, balance] = await Promise.all([
    resolveServiceAccess(db, owner, "utility", t),
    resolveServiceAccess(db, owner, "vulture", t),
    availableCredits(db, owner, t),
  ]);
  const view = (a: typeof utility) => ({ provisioned: a.allowed, rate_cr: round4(a.rate), organization_id: a.businessId, organization_name: a.businessName });
  return json({
    status: "success",
    services: { identity_verification: view(utility), vulture: view(vulture) },
    wallet: { synapse_credits_available: round4(balance) },
  });
}

async function utilityValidate(req: Request, db: Db, key: string, t: string) {
  const owner = await ownerFromUtilityKey(db, key, t);
  if (!owner) return apiError(401, "invalid_api_key", "Invalid or revoked Identity Verification key.", t);

  const idem = (req.headers.get("idempotency-key") ?? "").trim();
  if (!idem || idem.length > 128) return apiError(400, "idempotency_key_required", "Send an Idempotency-Key header (UUID recommended, max 128 chars).", t);

  console.log(`[PHASE_START: ${t}.IdempotencyReplay]`);
  const { data: prior } = await db.from("protocol_api_requests").select("status_code, response")
    .eq("owner_id", owner).eq("endpoint", "utility.validate").eq("idempotency_key", idem).maybeSingle();
  console.log(`[PHASE_END: ${t}.IdempotencyReplay] replay=${!!prior}`);
  if (prior && !isSandbox(req)) return json(prior.response, prior.status_code, { "Idempotent-Replayed": "true" });

  const access = await resolveServiceAccess(db, owner, "utility", t);
  if (!access.allowed) return apiError(403, "not_provisioned", "The Identity Verification Utility is not provisioned for your organization.", t);

  console.log(`[PHASE_START: ${t}.PayloadValidate]`);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const targets = Array.isArray(body?.targets) ? body!.targets as unknown[] : null;
  const targetType = String(body?.target_type ?? "");
  const algorithm = String(body?.hash_algorithm ?? "sha256").toLowerCase();
  const campaignId = typeof body?.campaign_id === "string" ? body.campaign_id.slice(0, 128) : null;
  if (!targets || targets.length === 0) return apiError(400, "invalid_request", "'targets' must be a non-empty array.", t);
  if (targets.length > MAX_TARGETS) return apiError(413, "batch_too_large", `Maximum ${MAX_TARGETS} targets per call.`, t);
  if (!TARGET_TYPES.has(targetType)) return apiError(400, "invalid_target_type", `target_type must be one of ${[...TARGET_TYPES].join(", ")}.`, t);
  if (algorithm !== "sha256") return apiError(400, "unsupported_hash_algorithm", "Only sha256 is supported.", t);
  const normalized = targets.map((x) => (typeof x === "string" ? x.trim().toLowerCase().replace(/^0x/, "") : ""));
  const bad = normalized.findIndex((h) => !HASH_RE.test(h));
  if (bad >= 0) return apiError(400, "invalid_target_hash", `targets[${bad}] must be 64 lowercase hex characters (no 0x prefix).`, t);
  console.log(`[PHASE_END: ${t}.PayloadValidate] targets=${normalized.length} type=${targetType}`);

  if (isSandbox(req)) {
    // Sandbox: identical validation, but the Identity Vault is not queried, nothing is billed or stored.
    console.log(`[PHASE_START: ${t}.Sandbox] targets=${normalized.length}`);
    const available = round4(await availableCredits(db, owner, t));
    console.log(`[PHASE_END: ${t}.Sandbox]`);
    return json({
      status: "success",
      environment: "sandbox",
      sandbox_mode: true,
      meta: { total_targets: normalized.length, opted_in: 0, opted_out_default_deny: normalized.length },
      billing: { rate_per_target: round4(access.rate), synapse_credits_deducted: 0, remaining_balance: available, would_cost_if_all_authorized: usageCost(access.rate, normalized.length) },
      results: normalized.map((h) => ({ target_hash: h, consent_status: "denied", guid: null, liability_receipt_id: null })),
      note: "Sandbox does not query the Identity Vault; every target returns denied and no receipt is issued.",
    });
  }

  const vaultKey = Deno.env.get("WIX_SECURE_API_KEY");
  const results: { target_hash: string; consent_status: "authorized" | "denied"; guid: string | null; liability_receipt_id: string | null }[] = [];
  const matches: { index: number; guid: string }[] = [];
  console.log(`[PHASE_START: ${t}.VaultResolution]`);
  for (const [i, hash] of normalized.entries()) {
    let guid: string | null = null;
    try {
      const res = await fetch(IDENTITY_VAULT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${vaultKey}` },
        body: JSON.stringify({ identifier: hash, identifier_type: targetType, hash_algorithm: "sha256" }),
      });
      if (res.ok) {
        const v = await res.json();
        // Default-Deny: authorized only on an explicit match that the vault does not mark as non-consented.
        if (v?.isMatch && v?.guid && v?.consent !== false) guid = String(v.guid);
      } else console.error(`[${t}.VaultLookup] target=${i} HTTP ${res.status}`);
    } catch (e) {
      console.error(`[${t}.VaultLookup.Fault] target=${i} ${e instanceof Error ? e.stack : String(e)}`);
    }
    results.push({ target_hash: hash, consent_status: guid ? "authorized" : "denied", guid: null, liability_receipt_id: null });
    if (guid) matches.push({ index: i, guid });
  }
  console.log(`[PHASE_END: ${t}.VaultResolution] authorized=${matches.length}`);

  let deducted = 0;
  if (matches.length > 0) {
    const charge = await chargeServiceUsage(db, {
      userId: owner, service: "utility", units: matches.length, reference: `protocol_api:validate:${owner}:${idem}`,
      description: `Identity Verification API (${matches.length} authorized${campaignId ? `, ${campaignId}` : ""}) [${access.rate} CR]`,
    }, t);
    if (charge.status === "insufficient_credits") {
      const required = usageCost(access.rate, matches.length);
      const available = round4(await availableCredits(db, owner, t));
      return apiError(402, "insufficient_funds", "Synapse Credit balance is insufficient to process this batch.", t,
        { required_credits: required, available_credits: available, shortfall: round4(Math.max(required - available, charge.shortfall ?? 0)) }, RESOLUTION_URL);
    }
    if (charge.status === "error" || charge.status === "not_provisioned") {
      return apiError(500, "billing_failed", "Billing could not be completed; no targets were charged.", t);
    }
    deducted = round4(charge.amount ?? 0);

    console.log(`[PHASE_START: ${t}.StageReceipts] rows=${matches.length}`);
    const { data: rows, error } = await db.from("lidd_extraction_events").insert(matches.map((m) => ({
      extractor_id: owner, citizen_guid: m.guid, synapse_credit_cost: access.rate,
      payment_status: "paid", aca_hash_key: null, extraction_timestamp: new Date().toISOString(),
    }))).select("id, citizen_guid");
    if (error) throw new Error(`stage receipts: ${error.message}`);
    console.log(`[PHASE_END: ${t}.StageReceipts]`);
    matches.forEach((m, k) => {
      results[m.index].guid = m.guid;
      results[m.index].liability_receipt_id = rows?.[k]?.id ?? null;
    });
  }

  const remaining = round4(await availableCredits(db, owner, t));
  const response = {
    status: "success",
    meta: { total_targets: normalized.length, opted_in: matches.length, opted_out_default_deny: normalized.length - matches.length },
    billing: { rate_per_target: round4(access.rate), synapse_credits_deducted: deducted, remaining_balance: remaining },
    results,
  };
  await db.from("protocol_api_requests").insert({ owner_id: owner, endpoint: "utility.validate", idempotency_key: idem, status_code: 200, response });
  if (deducted > 0) await maybeEmitCreditDepleted(db, owner, remaining, t).catch((e) => console.error(`[${t}.CreditDepleted.Fault] ${e instanceof Error ? e.stack : e}`));
  return json(response);
}

async function utilityReceipt(db: Db, key: string, receiptId: string, t: string) {
  const owner = await ownerFromUtilityKey(db, key, t);
  if (!owner) return apiError(401, "invalid_api_key", "Invalid or revoked Identity Verification key.", t);
  if (!/^[0-9a-f-]{36}$/i.test(receiptId)) return apiError(400, "invalid_receipt_id", "Receipt id must be a UUID.", t);
  const { data: row, error } = await db.from("lidd_extraction_events")
    .select("id, citizen_guid, aca_hash_key, payment_status, created_at, synapse_credit_cost").eq("id", receiptId).eq("extractor_id", owner).maybeSingle();
  if (error) throw new Error(`receipt lookup: ${error.message}`);
  if (!row) return apiError(404, "receipt_not_found", "No receipt with this id belongs to your organization.", t);
  const access = await resolveServiceAccess(db, owner, "utility", t);
  // On-chain proof only exists once the receipt carries an ACA anchor; otherwise it is ledger-recorded.
  return json({
    liability_receipt_id: row.id,
    status: row.aca_hash_key ? "anchored_l2" : "ledger_recorded",
    payment_status: row.payment_status,
    timestamp: row.created_at,
    enterprise_tenant_id: access.businessId,
    masked_guid: maskGuid(String(row.citizen_guid)),
    synapse_credits_charged: round4(Number(row.synapse_credit_cost ?? 0)),
    blockchain_proof: row.aca_hash_key ? { network: "base_mainnet", aca_hash: hex0x(row.aca_hash_key) } : null,
  });
}

async function vultureIngest(req: Request, db: Db, key: string, t: string) {
  console.log(`[PHASE_START: ${t}.VultureIngest.Parse]`);
  const rawText = await req.text();
  if (rawText.length > MAX_VULTURE_BYTES) return apiError(413, "batch_too_large", "Maximum 5 MB per batch.", t);
  let body: Record<string, unknown> | null = null;
  try { body = JSON.parse(rawText); } catch { body = null; }
  if (!body || !Array.isArray(body.payload) || body.payload.length === 0) {
    return apiError(400, "invalid_request", "'payload' must be a non-empty array of records.", t);
  }
  if (body.payload.length > MAX_VULTURE_RECORDS) return apiError(413, "batch_too_large", `Maximum ${MAX_VULTURE_RECORDS} records per batch.`, t);
  const framework = String(body.compliance_framework ?? "standard");
  if (framework !== "standard" && framework !== "cjis_strict") return apiError(400, "invalid_request", "compliance_framework must be standard or cjis_strict.", t);

  if (isSandbox(req)) {
    console.log(`[PHASE_START: ${t}.VultureIngest.Sandbox]`);
    const owner = await ownerFromAnyKey(db, key, t);
    if (!owner) return apiError(401, "invalid_api_key", "Invalid or revoked API key.", t);
    const access = await resolveServiceAccess(db, owner, "vulture", t);
    if (!access.allowed) return apiError(403, "not_provisioned", "The Vulture is not provisioned for your organization.", t);
    const rawHash = await sha256Hex(JSON.stringify(body.payload));
    console.log(`[PHASE_END: ${t}.VultureIngest.Sandbox]`);
    return json({
      status: "accepted_for_sanitization", environment: "sandbox", sandbox_mode: true,
      batch_id: null, records_committed: 0, records_validated: body.payload.length, raw_hash: rawHash,
      cjis_isolated: framework === "cjis_strict",
      billing: { rate_cr: round4(access.rate), synapse_credits_deducted: 0, status: "sandbox_not_billed" },
      verification_url: null, trace_id: t,
      note: "Sandbox batches are not sanitized into the ledger, billed, or anchored on Base.",
    }, 202);
  }
  const forward = {
    dataset_name: typeof body.dataset_name === "string" ? body.dataset_name.slice(0, 200) : null,
    cjis_isolated: framework === "cjis_strict",
    events: body.payload,
  };
  console.log(`[PHASE_END: ${t}.VultureIngest.Parse] records=${body.payload.length} framework=${framework}`);

  console.log(`[PHASE_START: ${t}.VultureIngest.Forward]`);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/mesh-telemetry-intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`, "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "" },
    body: JSON.stringify(forward),
  });
  const out = await res.json().catch(() => ({}));
  console.log(`[PHASE_END: ${t}.VultureIngest.Forward] HTTP ${res.status} trace=${out?.trace_id ?? "n/a"}`);

  if (res.status === 402) {
    return apiError(402, "insufficient_funds", "Synapse Credit balance is insufficient for this batch.", t,
      { required_credits: out.rate_cr, shortfall: out.shortfall }, RESOLUTION_URL);
  }
  if (res.status === 422) return json({ status: "quarantined", reason_code: out.reason_code, raw_hash: out.raw_hash, trace_id: out.trace_id }, 422);
  if (!res.ok) return apiError(res.status, "ingest_rejected", out?.error ?? "Ingestion rejected.", out?.trace_id ?? t);

  const base = new URL(req.url);
  return json({
    status: "accepted_for_sanitization",
    batch_id: out.ledger_id,
    records_committed: out.events_committed,
    sanitized_hash: out.sanitized_hash,
    cjis_isolated: out.cjis_isolated,
    billing: { rate_cr: out.billing?.rate_cr ?? 0, synapse_credits_deducted: out.billing?.amount_cr ?? 0, status: out.billing?.status },
    verification_url: `${base.origin}${base.pathname.replace(/\/v1\/vulture\/ingest$/, "")}/v1/vulture/verify/${out.ledger_id}`,
    trace_id: out.trace_id,
  }, 202);
}

async function vultureVerify(db: Db, key: string, batchId: string, t: string) {
  const owner = await ownerFromAnyKey(db, key, t);
  if (!owner) return apiError(401, "invalid_api_key", "Invalid or revoked API key.", t);
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) return apiError(400, "invalid_batch_id", "batch_id must be a UUID.", t);

  console.log(`[PHASE_START: ${t}.VultureVerify.Ledger]`);
  const { data: row, error } = await db.from("vulture_ledger")
    .select("id, tenant_id, status, record_count, sanitized_hash, batch_id, merkle_leaf_index, tx_hash, anchored_at, created_at")
    .eq("id", batchId).maybeSingle();
  if (error) throw new Error(`ledger lookup: ${error.message}`);
  if (!row || row.tenant_id !== owner) return apiError(404, "batch_not_found", "No batch with this id belongs to your organization.", t);
  console.log(`[PHASE_END: ${t}.VultureVerify.Ledger] status=${row.status}`);

  const base = {
    batch_id: row.id,
    sanitization_report: { records_processed: row.record_count, sanitized_hash: hex0x(row.sanitized_hash) },
    ingested_at: row.created_at,
  };
  if (!row.batch_id || row.merkle_leaf_index === null) {
    return json({ ...base, status: "staged_for_notarization", cryptographic_proof: null });
  }

  console.log(`[PHASE_START: ${t}.VultureVerify.Proof]`);
  const { data: anchor, error: aErr } = await db.from("vulture_notarization_batches")
    .select("merkle_root, leaf_count, status, tx_hash, block_number, chain_id").eq("id", row.batch_id).maybeSingle();
  if (aErr) throw new Error(`anchor lookup: ${aErr.message}`);
  const { data: leaves, error: lErr } = await db.from("vulture_ledger").select("sanitized_hash, merkle_leaf_index")
    .eq("batch_id", row.batch_id).order("merkle_leaf_index", { ascending: true }).limit(1000);
  if (lErr) throw new Error(`leaf lookup: ${lErr.message}`);
  const proof = await merkleProof((leaves ?? []).map((l: { sanitized_hash: string }) => l.sanitized_hash), row.merkle_leaf_index);
  if (anchor && proof.root !== anchor.merkle_root.replace(/^0x/, "")) {
    console.error(`[${t}.VultureVerify.Proof] recomputed root does not match anchored root`);
    return apiError(500, "proof_mismatch", "Recomputed Merkle root does not match the anchored root.", t);
  }
  console.log(`[PHASE_END: ${t}.VultureVerify.Proof] leaves=${leaves?.length ?? 0}`);

  const txHash = anchor?.tx_hash ?? row.tx_hash;
  return json({
    ...base,
    status: row.status === "anchored" ? "sanitized_and_anchored" : "anchoring_in_progress",
    cryptographic_proof: {
      hash_algorithm: "sha256",
      tree_rules: "leaf = sha256(0x00 || sanitized_hash); node = sha256(0x01 || left || right); odd node pairs with itself",
      merkle_root: hex0x(proof.root),
      leaf_index: proof.leaf_index,
      leaf_count: anchor?.leaf_count ?? leaves?.length ?? 0,
      leaf_hash: hex0x(proof.leaf_hash),
      sibling_hashes: proof.siblings.map((s) => ({ position: s.position, hash: hex0x(s.hash) })),
      l2_anchor: txHash ? {
        network: "base_mainnet", transaction_hash: txHash, block_number: anchor?.block_number ?? null,
        anchored_at: row.anchored_at, explorer_url: `https://basescan.org/tx/${txHash}`,
      } : null,
    },
  });
}

async function billingBalance(db: Db, key: string, t: string) {
  const owner = await ownerFromAnyKey(db, key, t);
  if (!owner) return apiError(401, "invalid_api_key", "Invalid or revoked API key.", t);
  const [utility, vulture, balance] = await Promise.all([
    resolveServiceAccess(db, owner, "utility", t),
    resolveServiceAccess(db, owner, "vulture", t),
    availableCredits(db, owner, t),
  ]);
  const org = utility.businessId ? utility : vulture;
  return json({
    status: "success",
    wallet: { synapse_credits_available: round4(balance), currency: "CRD" },
    organization: { organization_id: org.businessId, organization_name: org.businessName },
    rate_cards: {
      identity_verification: { provisioned: utility.allowed, rate_cr: round4(utility.rate), unit: "authorized_target" },
      vulture: { provisioned: vulture.allowed, rate_cr: round4(vulture.rate), unit: "batch" },
    },
    as_of: new Date().toISOString(),
  });
}

const webhookView = (h: Record<string, unknown>) => ({
  id: h.id, url: h.url, events: h.events, credit_threshold: h.credit_threshold === null ? null : round4(Number(h.credit_threshold)),
  status: h.status, created_at: h.created_at,
});

async function webhooksCreate(req: Request, db: Db, key: string, t: string) {
  const owner = await ownerFromAnyKey(db, key, t);
  if (!owner) return apiError(401, "invalid_api_key", "Invalid or revoked API key.", t);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  let parsed: URL | null = null;
  try { parsed = new URL(url); } catch { parsed = null; }
  if (!parsed || parsed.protocol !== "https:" || url.length > 2048) return apiError(400, "invalid_request", "'url' must be an https URL.", t);
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(parsed.hostname)) return apiError(400, "invalid_request", "Private or local hosts are not allowed.", t);
  const events = Array.isArray(body?.events) ? [...new Set(body!.events as unknown[])].map(String) : [];
  const bad = events.filter((e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e));
  if (events.length === 0 || bad.length) return apiError(400, "invalid_request", `'events' must list one or more of ${WEBHOOK_EVENTS.join(", ")}.`, t, bad.length ? { unknown_events: bad } : undefined);
  const threshold = body?.credit_threshold === undefined || body?.credit_threshold === null ? null : Number(body.credit_threshold);
  if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0)) return apiError(400, "invalid_request", "'credit_threshold' must be a non-negative number.", t);
  if (events.includes("wallet.credit_depleted") && threshold === null) return apiError(400, "invalid_request", "wallet.credit_depleted requires 'credit_threshold'.", t);
  const { count } = await db.from("api_webhooks").select("id", { count: "exact", head: true }).eq("owner_id", owner).eq("status", "active");
  if ((count ?? 0) >= 10) return apiError(400, "invalid_request", "Maximum 10 active webhooks per account.", t);
  const secret = newWebhookSecret();
  console.log(`[PHASE_START: ${t}.WebhookCreate]`);
  const { data, error } = await db.from("api_webhooks").insert({ owner_id: owner, url, events, secret, credit_threshold: threshold })
    .select("id, url, events, credit_threshold, status, created_at").single();
  if (error) throw new Error(`webhook create: ${error.message}`);
  console.log(`[PHASE_END: ${t}.WebhookCreate] id=${data.id}`);
  return json({ status: "success", webhook: webhookView(data), signing_secret: secret, note: "The signing secret is shown once. Store it server-side." }, 201);
}

async function webhooksList(db: Db, key: string, t: string) {
  const owner = await ownerFromAnyKey(db, key, t);
  if (!owner) return apiError(401, "invalid_api_key", "Invalid or revoked API key.", t);
  const { data, error } = await db.from("api_webhooks").select("id, url, events, credit_threshold, status, created_at")
    .eq("owner_id", owner).eq("status", "active").order("created_at", { ascending: false });
  if (error) throw new Error(`webhook list: ${error.message}`);
  return json({ status: "success", webhooks: (data ?? []).map(webhookView) });
}

async function webhooksDelete(db: Db, key: string, id: string, t: string) {
  const owner = await ownerFromAnyKey(db, key, t);
  if (!owner) return apiError(401, "invalid_api_key", "Invalid or revoked API key.", t);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return apiError(400, "invalid_request", "Webhook id must be a UUID.", t);
  const { data, error } = await db.from("api_webhooks").update({ status: "disabled" }).eq("id", id).eq("owner_id", owner).eq("status", "active").select("id").maybeSingle();
  if (error) throw new Error(`webhook delete: ${error.message}`);
  if (!data) return apiError(404, "webhook_not_found", "No active webhook with this id belongs to your account.", t);
  return json({ status: "success", deleted: id });
}

async function webhooksTest(req: Request, db: Db, key: string, t: string) {
  const owner = await ownerFromAnyKey(db, key, t);
  if (!owner) return apiError(401, "invalid_api_key", "Invalid or revoked API key.", t);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  let q = db.from("api_webhooks").select("id, url, secret").eq("owner_id", owner).eq("status", "active");
  if (typeof body.webhook_id === "string") q = q.eq("id", body.webhook_id);
  const { data: hooks, error } = await q.limit(10);
  if (error) throw new Error(`webhook test lookup: ${error.message}`);
  if (!hooks?.length) return apiError(404, "webhook_not_found", "No active webhook to test.", t);
  const results = [];
  for (const h of hooks) {
    const code = await sendSigned(h.url, h.secret, buildEvent("webhook.test", { webhook_id: h.id, message: "Test delivery from the IDIA Protocol API." }), t);
    results.push({ webhook_id: h.id, delivered: code >= 200 && code < 300, response_status: code || null });
  }
  return json({ status: "success", results });
}

async function applyRateLimit(db: Db, key: string, t: string) {
  console.log(`[PHASE_START: ${t}.RateLimit]`);
  const { data, error } = await db.rpc("protocol_api_rate_hit", { _key_hash: await sha256Hex(key), _limit: RATE_LIMIT_PER_MIN, _window_seconds: 60 });
  if (error) { console.error(`[${t}.RateLimit] ${error.message}`); console.log(`[PHASE_END: ${t}.RateLimit] skipped`); return null; }
  const row = Array.isArray(data) ? data[0] : data;
  const reset = Math.floor(new Date(row.reset_at).getTime() / 1000);
  console.log(`[PHASE_END: ${t}.RateLimit] allowed=${row.allowed} remaining=${row.remaining}`);
  return { allowed: !!row.allowed, remaining: Number(row.remaining), reset };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t = `ProtocolAPI.${crypto.randomUUID().slice(0, 8)}`;
  const path = new URL(req.url).pathname.replace(/^.*?\/protocol-api/, "").replace(/\/+$/, "") || "/";
  console.log(`[PHASE_START: ${t}.Request] ${req.method} ${path}`);
  try {
    const key = presentedKey(req);
    if (!key) return apiError(401, "missing_api_key", "Send your IDIA key in the x-api-key header.", t);
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const rl = await applyRateLimit(db, key, t);
    const withRl = (res: Response) => {
      if (rl) {
        res.headers.set("X-RateLimit-Limit", String(RATE_LIMIT_PER_MIN));
        res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
        res.headers.set("X-RateLimit-Reset", String(rl.reset));
      }
      return res;
    };
    if (rl && !rl.allowed) {
      const retryAfter = Math.max(1, rl.reset - Math.floor(Date.now() / 1000));
      const res = apiError(429, "rate_limit_exceeded", `Rate limit of ${RATE_LIMIT_PER_MIN} requests per minute exceeded.`, t,
        { limit: RATE_LIMIT_PER_MIN, retry_after: retryAfter, reset_at: new Date(rl.reset * 1000).toISOString() });
      res.headers.set("Retry-After", String(retryAfter));
      return withRl(res);
    }
    let m: RegExpMatchArray | null;
    const route = async (): Promise<Response> => {
      if (req.method === "GET" && path === "/v1/auth/provision-status") return await provisionStatus(db, key, t);
      if (req.method === "GET" && path === "/v1/billing/balance") return await billingBalance(db, key, t);
      if (req.method === "POST" && path === "/v1/utility/validate") return await utilityValidate(req, db, key, t);
      if (req.method === "GET" && (m = path.match(/^\/v1\/utility\/receipts\/([^/]+)$/))) return await utilityReceipt(db, key, m[1], t);
      if (req.method === "POST" && path === "/v1/vulture/ingest") return await vultureIngest(req, db, key, t);
      if (req.method === "GET" && (m = path.match(/^\/v1\/vulture\/verify\/([^/]+)$/))) return await vultureVerify(db, key, m[1], t);
      if (req.method === "POST" && path === "/v1/webhooks") return await webhooksCreate(req, db, key, t);
      if (req.method === "GET" && path === "/v1/webhooks") return await webhooksList(db, key, t);
      if (req.method === "POST" && path === "/v1/webhooks/test") return await webhooksTest(req, db, key, t);
      if (req.method === "DELETE" && (m = path.match(/^\/v1\/webhooks\/([^/]+)$/))) return await webhooksDelete(db, key, m[1], t);
      return apiError(404, "route_not_found", `No route for ${req.method} ${path}.`, t);
    };
    return withRl(await route());
  } catch (err) {
    console.error(`[${t}.Fault] ${err instanceof Error ? err.stack : String(err)}`);
    return apiError(500, "internal_error", "Internal Server Error", t);
  } finally {
    console.log(`[PHASE_END: ${t}.Request]`);
  }
});
