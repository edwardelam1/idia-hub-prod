// Vulture Sanitization Agent — Liability Shield enforcement for quarantine uploads.
// Callers: the storage trigger on idia-data-quarantine-prod (service-role bearer) or the
// uploading tenant (user JWT whose id owns the object's first folder).
// Objects under `<owner>/cjis/...` are CJIS-isolated: ledger only, never mesh_telemetry_events
// or Marketplace bundles. The ledger row is claimed before any fan-out so trigger + client
// dispatch of the same object can never double-ingest.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isCjisUploadPath, isPiiKey } from "../_shared/vulture-cjis.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "idia-data-quarantine-prod";
const MANIFEST_BUCKET = "rehabilitated-manifests";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(input: Uint8Array | string): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

function decodeLoRaPayload(buffer: ArrayBuffer): Record<string, any> {
  if (buffer.byteLength !== 40) throw new Error("Invalid LoRa payload size. Expected 40 bytes.");
  const view = new DataView(buffer);
  return {
    event_type: "LORA_TELEMETRY",
    latitude: view.getFloat64(0, true),
    longitude: view.getFloat64(8, true),
    altitude: view.getFloat32(16, true),
    gps_time: view.getUint32(20, true),
    gps_date: view.getUint32(24, true),
    satellites: view.getUint8(28),
    hdop: view.getFloat32(29, true),
    battery_voltage: view.getFloat32(33, true),
    fix_status: view.getUint8(37),
    fw_ver_major: view.getUint8(38),
    fw_ver_minor: view.getUint8(39),
  };
}

// Recursive PII stripping through nested objects AND arrays of objects.
async function stripPII(v: unknown, salt: string, key = ""): Promise<unknown> {
  if (Array.isArray(v)) return Promise.all(v.map((x) => stripPII(x, salt, key)));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = await stripPII(val, salt, k);
    return out;
  }
  if (key && isPiiKey(key) && v != null && v !== "") return sha256Hex(salt + String(v));
  return v;
}

function reconstructTimestamp(row: Record<string, any>, index: number, fileCreated: string): string {
  for (const c of ["timestamp", "created_at", "date", "datetime", "event_time", "timestamp_issued"]) {
    if (row[c]) {
      const d = new Date(row[c]);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date(new Date(fileCreated).getTime() + index * 1000).toISOString();
}

function mapToMeshRow(row: Record<string, any>, pseudoId: string): Record<string, any> {
  const category = row.event_type || (row.confidence_score ? "JSON_PIN" : row.priority ? "NETWORK_ALERT" : "UNKNOWN_TELEMETRY");
  return {
    pseudo_node_id: pseudoId,
    telemetry_category: category,
    payload_data: row,
    data_quality_score: row.hdop ? 1.0 / (row.hdop || 1) : 0.99,
    processed_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.info("[BEGIN: Vulture.Handler]");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let fileName = "unknown";
  let owner: string | null = null;
  let cjis = false;

  try {
    // ---- Caller authorization ----
    console.info("[BEGIN: Vulture.WebhookAuth]");
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      console.error("[END: Vulture.WebhookAuth] rejected: no bearer");
      return respond({ error: "Not authenticated." }, 401);
    }
    const body = await req.json().catch(() => ({}));
    fileName = typeof body.name === "string" ? body.name : "";
    const fileCreated = body.created_at || new Date().toISOString();
    if (body.bucket !== BUCKET || !fileName) {
      console.error("[END: Vulture.WebhookAuth] rejected: bad payload");
      return respond({ error: "bad payload" }, 400);
    }
    const folderOwner = fileName.split("/")[0];

    if (token === SERVICE_KEY) {
      owner = typeof body.owner === "string" && UUID_RE.test(body.owner) ? body.owner
        : UUID_RE.test(folderOwner) ? folderOwner : null;
      console.info("[END: Vulture.WebhookAuth] caller=service");
    } else {
      const { data: u, error: uErr } = await supabase.auth.getUser(token);
      if (uErr || !u?.user) {
        console.error(`[END: Vulture.WebhookAuth] rejected: ${uErr?.message ?? "no user"}`);
        return respond({ error: "Not authenticated." }, 401);
      }
      if (folderOwner !== u.user.id) {
        console.error("[END: Vulture.WebhookAuth] rejected: object not in caller's folder");
        return respond({ error: "Not authorized for this object." }, 403);
      }
      owner = u.user.id;
      console.info("[END: Vulture.WebhookAuth] caller=owner");
    }
    cjis = isCjisUploadPath(fileName);
    console.info(`[Vulture.CjisRouting] cjis_isolated=${cjis}`);

    // ---- Idempotency: already ingested? ----
    console.info("[BEGIN: Vulture.IdempotencyCheck]");
    const { data: existing, error: exErr } = await supabase.from("vulture_ledger")
      .select("id, record_count, sanitized_hash, raw_hash").eq("source", "upload").eq("original_file_name", fileName).maybeSingle();
    if (exErr) throw exErr;
    console.info(`[END: Vulture.IdempotencyCheck] existing=${!!existing}`);
    if (existing) {
      return respond({ ok: true, duplicate: true, records: existing.record_count, originalHash: existing.raw_hash, sanitizedHash: existing.sanitized_hash, cjis_isolated: cjis });
    }

    console.info("[BEGIN: Vulture.VaultAccess]");
    const { data: saltData, error: saltErr } = await supabase.rpc("get_vulture_salt");
    if (saltErr) throw saltErr;
    const salt = String(saltData ?? "");
    console.info("[END: Vulture.VaultAccess]");

    console.info("[BEGIN: Vulture.StorageDownload]");
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(fileName);
    if (dlErr || !blob) throw dlErr ?? new Error("download failed");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    console.info("[END: Vulture.StorageDownload]", { bytes: bytes.length });

    console.info("[BEGIN: Vulture.HashOriginal]");
    const originalHash = await sha256Hex(bytes);
    console.info("[END: Vulture.HashOriginal]");

    console.info("[BEGIN: Vulture.StreamParse]");
    const lower = fileName.toLowerCase();
    let rows: Record<string, any>[] = [];
    if (lower.endsWith(".bin") || lower.endsWith(".lora")) {
      rows = [decodeLoRaPayload(bytes.buffer)];
    } else {
      const text = new TextDecoder().decode(bytes);
      if (lower.endsWith(".json")) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : (parsed.records ?? parsed.data ?? [parsed]);
      } else if (lower.endsWith(".csv")) {
        rows = parseCSV(text);
      } else {
        throw new Error(`Unsupported format: ${fileName}`);
      }
    }
    console.info("[END: Vulture.StreamParse]", { rows: rows.length });

    console.info("[BEGIN: Vulture.PIIStrip]");
    const stripped = (await Promise.all(rows.map((r) => stripPII(r, salt)))) as Record<string, any>[];
    console.info("[END: Vulture.PIIStrip]");

    const tagged = stripped.map((r, i) => ({ ...r, _ts: reconstructTimestamp(r, i, fileCreated), origin_status: "ACQUIRED_REHABILITATED" }));
    const sanitizedHash = await sha256Hex(JSON.stringify(tagged));

    // ---- Claim the object in the ledger (unique per upload; payload encrypted by DB trigger) ----
    console.info("[BEGIN: Vulture.StagingLedgerCommit]");
    const { error: stageErr } = await supabase.from("vulture_ledger").insert({
      trace_id: crypto.randomUUID(),
      node_id: "upload",
      tenant_id: owner,
      source: "upload",
      original_file_name: fileName,
      raw_hash: originalHash,
      sanitized_hash: sanitizedHash,
      payload: tagged,
      record_count: tagged.length,
      cjis_isolated: cjis,
      status: "staged_for_notarization",
    });
    if (stageErr) {
      if ((stageErr as any).code === "23505") {
        console.info("[END: Vulture.StagingLedgerCommit] concurrent dispatch already claimed this object");
        return respond({ ok: true, duplicate: true, records: tagged.length, originalHash, sanitizedHash, cjis_isolated: cjis });
      }
      throw stageErr;
    }
    console.info("[END: Vulture.StagingLedgerCommit]");

    // ---- Analytics fan-out (never for CJIS data) ----
    if (cjis) {
      console.info("[Vulture.BatchInsert] skipped — CJIS-isolated");
    } else {
      console.info("[BEGIN: Vulture.BatchInsert]", { total: tagged.length });
      const batchPseudo = await sha256Hex(`vulture:mesh:${fileName}:${originalHash}`);
      const meshRows = tagged.map((r) => mapToMeshRow(r, batchPseudo.slice(0, 32)));
      for (let i = 0; i < meshRows.length; i += 500) {
        const { error: insErr } = await supabase.from("mesh_telemetry_events").insert(meshRows.slice(i, i + 500));
        if (insErr) {
          console.error("[Vulture.BatchInsert.Stall]", { offset: i, insErr });
          throw insErr;
        }
      }
      console.info("[END: Vulture.BatchInsert]");
    }

    console.info("[BEGIN: Vulture.ManifestUpload]");
    const manifest = {
      claim_generator: "IDIA-Vulture/2.1-Mesh",
      created_at: new Date().toISOString(),
      original_file: fileName,
      original_hash: originalHash,
      sanitized_hash: sanitizedHash,
      record_count: tagged.length,
      cjis_isolated: cjis,
      assertions: [
        { label: "c2pa.training_mining", data: { entries: { "c2pa.data_mining": { use: "notAllowed" } } } },
        { label: "idia.liability_shield", data: { status: "ACQUIRED_REHABILITATED", pii_stripped: true, temporal_reconstructed: true } },
        { label: "idia.mesh_provenance", data: { protocol: "Liability Shield", anonymized_identifiers: true, cjis_isolated: cjis } },
      ],
    };
    const manifestPath = `${fileName}.manifest.json`;
    const { error: mErr } = await supabase.storage.from(MANIFEST_BUCKET)
      .upload(manifestPath, new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }), { upsert: true });
    if (mErr) throw mErr;
    console.info("[END: Vulture.ManifestUpload]");

    console.info("[BEGIN: Vulture.ProvenanceRecord]");
    await supabase.from("vulture_provenance_ledger").insert({
      original_file_name: fileName,
      bucket_path: `${BUCKET}/${fileName}`,
      record_count: tagged.length,
      action: "sanitize",
      status: "success",
      original_hash: originalHash,
      sanitized_hash: sanitizedHash,
      manifest_path: `${MANIFEST_BUCKET}/${manifestPath}`,
      owner,
      cjis_isolated: cjis,
    });
    console.info("[END: Vulture.ProvenanceRecord]");

    console.info("[END: Vulture.Handler]");
    return respond({ ok: true, records: tagged.length, originalHash, sanitizedHash, cjis_isolated: cjis });
  } catch (err) {
    console.error("[Vulture.Handler.Stall]", err instanceof Error ? err.stack : String(err));
    try {
      await supabase.from("vulture_provenance_ledger").insert({
        original_file_name: fileName,
        action: "sanitize",
        status: "failed",
        error_message: String((err as Error)?.message ?? err).slice(0, 500),
        owner,
        cjis_isolated: cjis,
      });
    } catch (logErr) {
      console.error("[Vulture.ProvenanceRecord.Stall]", logErr);
    }
    return respond({ error: "Sanitization failed." }, 500);
  }
});
