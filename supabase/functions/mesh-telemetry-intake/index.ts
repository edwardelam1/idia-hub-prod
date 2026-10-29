// Edge function: mesh-telemetry-intake
// Production ingest door for The Vulture. Pipeline:
//   auth (SHA-256 node key → mesh_nodes, IP allowlist) → gateway check → raw SHA-256
//   → sanitize (PII hash, injection strip, UTC timestamps) → quarantine (422) or
//   append-only vulture_ledger row with status 'staged_for_notarization'.
//   CJIS-isolated deliveries (node flag or payload `cjis_isolated: true`) are written to
//   vulture_ledger only — never to mesh_telemetry_events or Marketplace bundles.
import { createClient } from "npm:@supabase/supabase-js@2";
import { isLegacyKeyExpired, isNodeKeyExpired, isPiiKey } from "../_shared/vulture-cjis.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EVENTS = 500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization, apikey, x-client-info, x-node-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TS_KEYS = new Set(["timestamp", "created_at", "date", "datetime", "event_time", "timestamp_issued", "observed_at"]);
const INJECTION_RE = /<\s*\/?\s*script\b|javascript:|on\w+\s*=|\$\{|;\s*(drop|delete|truncate|update|insert)\s|--\s|\/\*|\u0000/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(v: string | Uint8Array) {
  const data = typeof v === "string" ? new TextEncoder().encode(v) : v;
  const d = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Deterministic canonical JSON (sorted keys) so the sanitized hash is a stable Merkle leaf.
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as Record<string, unknown>).sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

function ipv4ToInt(ip: string) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}
function ipAllowed(ip: string, list: string[]) {
  if (!list || list.length === 0) return true;
  return list.some((entry) => {
    if (!entry.includes("/")) return entry === ip;
    const [base, bitsRaw] = entry.split("/");
    const a = ipv4ToInt(ip), b = ipv4ToInt(base), bits = Number(bitsRaw);
    if (a === null || b === null || !(bits >= 0 && bits <= 32)) return false;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (a & mask) === (b & mask);
  });
}

interface SanitizeIssue { path: string; reason: string }
async function sanitize(v: unknown, salt: string, path: string, issues: SanitizeIssue[], key = ""): Promise<unknown> {
  const lk = key.toLowerCase();
  if (Array.isArray(v)) return Promise.all(v.map((x, i) => sanitize(x, salt, `${path}[${i}]`, issues)));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (INJECTION_RE.test(k)) { issues.push({ path: `${path}.${k}`, reason: "INJECTION_KEY" }); continue; }
      out[k] = await sanitize(val, salt, `${path}.${k}`, issues, k);
    }
    return out;
  }
  if (isPiiKey(lk) && v != null && v !== "") return sha256Hex(salt + String(v));
  if (TS_KEYS.has(lk) && v != null) {
    const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
    if (isNaN(d.getTime())) { issues.push({ path, reason: "MALFORMED_TIMESTAMP" }); return null; }
    return d.toISOString();
  }
  if (typeof v === "string") {
    if (INJECTION_RE.test(v)) { issues.push({ path, reason: "INJECTION_VECTOR" }); return null; }
    return v.slice(0, 4096);
  }
  if (typeof v === "number" && !Number.isFinite(v)) { issues.push({ path, reason: "NON_FINITE_NUMBER" }); return null; }
  return v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const traceId = crypto.randomUUID();
  const startTime = Date.now();
  const sourceIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  console.log(`[VULTURE_INTAKE_START][Trace: ${traceId}] Inbound connection from ${sourceIp}`);
  if (req.method !== "POST") return json({ error: "Method not allowed", trace_id: traceId }, 405);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    // ---- Auth ----
    console.log(`[VULTURE_AUTH_START][Trace: ${traceId}] Verifying node credential.`);
    const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const presented = req.headers.get("x-api-key") ?? (bearer.startsWith("vnk_") ? bearer : "");
    if (!presented) {
      console.error(`[VULTURE_INTAKE_ABORTED][Trace: ${traceId}] Auth failed: missing node key`);
      return json({ error: "Missing node key (x-api-key).", trace_id: traceId }, 401);
    }
    const presentedHash = await sha256Hex(presented);

    let nodeId: string, tenantId: string | null, nodeRowId: string | null = null, legacyKeyId: string | null = null;
    let nodeCjis = false;
    const { data: node, error: nodeErr } = await supabase
      .from("mesh_nodes").select("id, node_id, tenant_id, status, ip_allowlist, cjis_isolated, expires_at")
      .eq("token_hash", presentedHash).maybeSingle();
    if (nodeErr) {
      console.error(`[VULTURE_INTAKE_ABORTED][Trace: ${traceId}] Node lookup error: ${nodeErr.message}`);
      return json({ error: "Credential verification failed.", trace_id: traceId }, 500);
    }
    if (node) {
      if (node.status !== "active") {
        console.error(`[VULTURE_INTAKE_ABORTED][Trace: ${traceId}] Auth failed: node ${node.node_id} is ${node.status}`);
        return json({ error: "Node key revoked.", trace_id: traceId }, 401);
      }
      if (isNodeKeyExpired(node.expires_at)) {
        console.error(`[VULTURE_INTAKE_ABORTED][Trace: ${traceId}] Auth failed: node ${node.node_id} key expired at ${node.expires_at}`);
        await supabase.from("mesh_nodes").update({ status: "expired" }).eq("id", node.id);
        return json({ error: "Node key expired (90-day rotation). Rotate the key in the Hub.", trace_id: traceId }, 401);
      }
      if (!ipAllowed(sourceIp, node.ip_allowlist ?? [])) {
        console.error(`[VULTURE_INTAKE_ABORTED][Trace: ${traceId}] Auth failed: IP ${sourceIp} not on allowlist for ${node.node_id}`);
        return json({ error: "Origin IP not permitted for this node.", trace_id: traceId }, 401);
      }
      nodeId = node.node_id; tenantId = node.tenant_id; nodeRowId = node.id; nodeCjis = node.cjis_isolated === true;
    } else {
      // Legacy mesh keys issued before mesh_nodes existed.
      const { data: legacy } = await supabase.from("api_keys").select("id, user_id, created_at")
        .eq("key_hash", presentedHash).eq("environment", "mesh").eq("status", "active").maybeSingle();
      if (!legacy) {
        console.error(`[VULTURE_INTAKE_ABORTED][Trace: ${traceId}] Auth failed: unknown credential`);
        return json({ error: "Invalid or revoked node key.", trace_id: traceId }, 401);
      }
      if (isLegacyKeyExpired(legacy.created_at)) {
        console.error(`[VULTURE_INTAKE_ABORTED][Trace: ${traceId}] Auth failed: legacy key older than 90 days`);
        return json({ error: "Legacy mesh key expired (90-day rotation). Register a node key in the Hub.", trace_id: traceId }, 401);
      }
      nodeId = `legacy_${legacy.id.slice(0, 8)}`; tenantId = legacy.user_id; legacyKeyId = legacy.id;
    }
    console.log(`[VULTURE_AUTH_SUCCESS][Trace: ${traceId}] Authenticated Node: ${nodeId}`);

    // ---- Gateway ----
    console.log(`[VULTURE_GATEWAY_START][Trace: ${traceId}] Checking gateway state.`);
    const { data: gateway, error: gwErr } = await supabase.from("mesh_gateway_state").select("is_open").eq("id", "singleton").maybeSingle();
    if (gwErr) { console.error(`[VULTURE_GATEWAY_ERROR][Trace: ${traceId}] ${gwErr.message}`); return json({ error: "Gateway state unavailable.", trace_id: traceId }, 500); }
    if (!gateway?.is_open) {
      console.error(`[VULTURE_INTAKE_ABORTED][Trace: ${traceId}] Gateway sealed.`);
      return json({ error: "Mesh gateway is sealed. Ingest refused.", trace_id: traceId }, 503);
    }
    console.log(`[VULTURE_GATEWAY_END][Trace: ${traceId}] Gateway open.`);

    // ---- Raw fingerprint (before any parsing) ----
    const rawBytes = new Uint8Array(await req.arrayBuffer());
    if (rawBytes.byteLength > MAX_BYTES) {
      console.error(`[VULTURE_INTAKE_ABORTED][Trace: ${traceId}] Payload ${rawBytes.byteLength} bytes exceeds limit.`);
      return json({ error: "Payload exceeds 5 MB.", trace_id: traceId }, 413);
    }
    console.log(`[VULTURE_HASHING_START][Trace: ${traceId}] Computing SHA-256 raw wire digest...`);
    const rawHash = await sha256Hex(rawBytes);
    console.log(`[VULTURE_HASHING_COMPLETE][Trace: ${traceId}] Raw Digest: ${rawHash}`);
    const rawText = new TextDecoder("utf-8", { fatal: false }).decode(rawBytes);

    let cjisIsolated = nodeCjis;
    const quarantine = async (reason: string, detail: unknown) => {
      console.warn(`[VULTURE_SANITIZE_QUARANTINE][Trace: ${traceId}] ${reason} — routing to quarantine.`);
      const { error: qErr } = await supabase.from("vulture_quarantine").insert({
        trace_id: traceId, node_id: nodeId, tenant_id: tenantId, raw_hash: rawHash, cjis_isolated: cjisIsolated,
        raw_payload: rawText.slice(0, 1_000_000), reason_code: reason,
        reason_detail: { detail }, contractor_metadata: { source_ip: sourceIp, user_agent: req.headers.get("user-agent"), bytes: rawBytes.byteLength },
      });
      if (qErr) console.error(`[VULTURE_QUARANTINE_ERROR][Trace: ${traceId}] ${qErr.message}`);
      return json({ status: "quarantined", reason_code: reason, raw_hash: rawHash, trace_id: traceId }, 422);
    };

    // ---- Parse + sanitize ----
    console.log(`[VULTURE_SANITIZE_START][Trace: ${traceId}] Initiating sanitization pass...`);
    let body: any;
    try { body = JSON.parse(rawText); } catch (e) { return await quarantine("MALFORMED_JSON", String((e as Error).message)); }
    if (body && typeof body === "object" && !Array.isArray(body) && body.cjis_isolated === true) cjisIsolated = true;
    console.log(`[VULTURE_CJIS_ROUTING][Trace: ${traceId}] cjis_isolated=${cjisIsolated}`);
    const events = Array.isArray(body?.events) ? body.events : Array.isArray(body) ? body : null;
    if (!events || events.length === 0) return await quarantine("MISSING_EVENTS", "Payload must include a non-empty 'events' array.");
    if (events.length > MAX_EVENTS) return await quarantine("BATCH_TOO_LARGE", `Maximum ${MAX_EVENTS} events per batch.`);
    if (events.some((e: unknown) => !e || typeof e !== "object" || Array.isArray(e))) return await quarantine("NON_OBJECT_EVENT", "Every event must be a JSON object.");

    const { data: saltData, error: saltErr } = await supabase.rpc("get_vulture_salt");
    if (saltErr) throw saltErr;
    const salt = String(saltData ?? "");

    const issues: SanitizeIssue[] = [];
    const sanitizedEvents = (await sanitize(events, salt, "events", issues)) as Record<string, unknown>[];
    if (issues.length > 0) return await quarantine("SANITIZATION_FAILED", issues.slice(0, 50));
    const tagged = sanitizedEvents.map((e) => ({ ...e, origin_status: "ACQUIRED_REHABILITATED" }));
    console.log(`[VULTURE_SANITIZE_COMPLETE][Trace: ${traceId}] ${tagged.length} events cleaned and normalized.`);

    const sanitizedHash = await sha256Hex(canonical(tagged));

    // ---- Commit ----
    console.log(`[VULTURE_DB_STAGING_START][Trace: ${traceId}] Writing to vulture_ledger with status 'staged_for_notarization'...`);
    const { data: ledgerRow, error: dbError } = await supabase.from("vulture_ledger").insert({
      trace_id: traceId, node_id: nodeId, tenant_id: tenantId, source: "mesh",
      raw_hash: rawHash, sanitized_hash: sanitizedHash, payload: tagged, cjis_isolated: cjisIsolated,
      record_count: tagged.length, status: "staged_for_notarization",
    }).select("id").single();
    if (dbError) {
      console.error(`[VULTURE_DB_STAGING_ERROR][Trace: ${traceId}] Insert failed: ${dbError.message}`);
      return json({ error: "Storage failure", trace_id: traceId }, 500);
    }
    console.log(`[VULTURE_DB_STAGING_END][Trace: ${traceId}] Ledger row ${ledgerRow.id}.`);

    // Analytics fan-out (non-authoritative copy for marketplace aggregates). Never for CJIS data.
    if (cjisIsolated) {
      console.log(`[VULTURE_FANOUT_SKIPPED][Trace: ${traceId}] CJIS-isolated — analytics and marketplace bypassed.`);
    } else {
      console.log(`[VULTURE_FANOUT_START][Trace: ${traceId}]`);
      const pseudoNodeId = (await sha256Hex(salt + nodeId)).slice(0, 32);
      const { error: fanErr } = await supabase.from("mesh_telemetry_events").insert(tagged.map((e) => ({
        pseudo_node_id: pseudoNodeId,
        telemetry_category: String((e as any).event_type ?? "MESH_TELEMETRY"),
        payload_data: e,
        data_quality_score: typeof (e as any).hdop === "number" ? 1 / Math.max(Number((e as any).hdop), 1) : 0.99,
        processed_at: new Date().toISOString(),
      })));
      if (fanErr) console.error(`[VULTURE_FANOUT_ERROR][Trace: ${traceId}] ${fanErr.message}`);
      console.log(`[VULTURE_FANOUT_END][Trace: ${traceId}]`);
    }

    const now = new Date().toISOString();
    if (nodeRowId) await supabase.from("mesh_nodes").update({ last_used_at: now }).eq("id", nodeRowId);
    if (legacyKeyId) await supabase.from("api_keys").update({ last_used_at: now }).eq("id", legacyKeyId);

    console.log(`[VULTURE_INTAKE_COMPLETE][Trace: ${traceId}] Ingestion completed in ${Date.now() - startTime}ms. Receipt emitted.`);
    return json({
      status: "staged_for_notarization", ledger_id: ledgerRow.id, trace_id: traceId, node_id: nodeId,
      events_committed: tagged.length, raw_hash: rawHash, sanitized_hash: sanitizedHash, cjis_isolated: cjisIsolated,
    });
  } catch (err) {
    console.error(`[VULTURE_INTAKE_FAULT][Trace: ${traceId}] ${err instanceof Error ? err.stack : String(err)}`);
    return json({ error: "Internal Server Error", trace_id: traceId }, 500);
  }
});
