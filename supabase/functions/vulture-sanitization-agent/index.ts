// Vulture Sanitization Agent — DELT Protocol enforcement
// Triggered by Postgres trigger on storage.objects INSERT into idia-data-quarantine-prod.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "idia-data-quarantine-prod";
const MANIFEST_BUCKET = "rehabilitated-manifests";
const PII_KEYS = new Set([
  "ssn",
  "social_security",
  "name",
  "first_name",
  "last_name",
  "full_name",
  "email",
  "email_address",
  "issuer_id",
  "source_id",
  "target_name_pseudonym",
  "target_biometric_hash",
]);

async function sha256Hex(input: Uint8Array | string): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
}

// --- LOW-LEVEL TELEMETRY DATA SHAPING ---
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

async function stripPII(row: Record<string, any>, salt: string): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const lk = k.toLowerCase();

    // Recursive PII stripping for nested JSON objects (e.g., model metadata)
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      out[k] = await stripPII(v, salt);
      continue;
    }

    if (PII_KEYS.has(lk) && v != null && v !== "") {
      out[k] = await sha256Hex(salt + String(v));
    } else {
      out[k] = v;
    }
  }
  return out;
}

function reconstructTimestamp(row: Record<string, any>, index: number, fileCreated: string): string {
  const candidates = ["timestamp", "created_at", "date", "datetime", "event_time", "timestamp_issued"];
  for (const c of candidates) {
    if (row[c]) {
      const d = new Date(row[c]);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  const base = new Date(fileCreated).getTime();
  return new Date(base + index * 1000).toISOString();
}

function mapToMeshRow(row: Record<string, any>, pseudoId: string): Record<string, any> {
  // Identify payload structure to determine category
  const category =
    row.event_type || (row.confidence_score ? "JSON_PIN" : row.priority ? "NETWORK_ALERT" : "UNKNOWN_TELEMETRY");

  return {
    pseudo_node_id: pseudoId,
    telemetry_category: category,
    payload_data: row,
    data_quality_score: row.hdop ? 1.0 / (row.hdop || 1) : 0.99, // Dynamic quality based on HDOP if available
    processed_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.info("[BEGIN: Vulture.Handler]");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let fileName = "unknown";
  let ledgerId: string | null = null;

  try {
    console.info("[BEGIN: Vulture.WebhookAuth]");
    const source = req.headers.get("x-vulture-source");
    if (source !== "pg_trigger" && !req.headers.get("authorization")) {
      console.error("[BEGIN: Vulture.WebhookAuth.Stall] missing source/auth");
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.info("[END: Vulture.WebhookAuth]");

    const body = await req.json();
    const bucket = body.bucket;
    fileName = body.name;
    const fileCreated = body.created_at || new Date().toISOString();
    if (bucket !== BUCKET || !fileName) {
      return new Response(JSON.stringify({ error: "bad payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Open ledger row in 'processing'
    console.info("[BEGIN: Vulture.LedgerOpen]", { fileName });
    const { data: opened, error: openErr } = await supabase
      .from("vulture_provenance_ledger")
      .insert({
        original_file_name: fileName,
        bucket_path: `${bucket}/${fileName}`,
        status: "processing",
        action: "sanitize",
      })
      .select("id")
      .single();
    if (openErr) {
      console.error("[BEGIN: Vulture.LedgerOpen.Stall]", openErr);
      throw openErr;
    }
    ledgerId = opened.id;
    console.info("[END: Vulture.LedgerOpen]", { ledgerId });

    console.info("[BEGIN: Vulture.VaultAccess]");
    const { data: saltData, error: saltErr } = await supabase.rpc("get_vulture_salt");
    if (saltErr) {
      console.error("[BEGIN: Vulture.VaultAccess.Stall]", saltErr);
      throw saltErr;
    }
    const salt = saltData as string;
    console.info("[END: Vulture.VaultAccess]", { saltLen: salt?.length });

    console.info("[BEGIN: Vulture.StorageDownload]", { fileName });
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(fileName);
    if (dlErr || !blob) {
      console.error("[BEGIN: Vulture.StorageDownload.Stall]", dlErr);
      throw dlErr ?? new Error("download failed");
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    console.info("[END: Vulture.StorageDownload]", { bytes: bytes.length });

    console.info("[BEGIN: Vulture.HashOriginal]");
    const originalHash = await sha256Hex(bytes);
    console.info("[END: Vulture.HashOriginal]", { originalHash });

    console.info("[BEGIN: Vulture.StreamParse]");
    const lower = fileName.toLowerCase();
    let rows: Record<string, any>[] = [];

    // Dynamic stream parser for multiplexed formats
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
        console.error("[BEGIN: Vulture.StreamParse.Stall] unsupported format");
        throw new Error(`Unsupported format: ${fileName}`);
      }
    }
    console.info("[END: Vulture.StreamParse]", { rows: rows.length });

    console.info("[BEGIN: Vulture.PIIStrip]");
    const stripped = await Promise.all(rows.map((r) => stripPII(r, salt)));
    console.info("[END: Vulture.PIIStrip]");

    console.info("[BEGIN: Vulture.TemporalReconstruct]");
    const dated = stripped.map((r, i) => ({ ...r, _ts: reconstructTimestamp(r, i, fileCreated) }));
    console.info("[END: Vulture.TemporalReconstruct]");

    console.info("[BEGIN: Vulture.StatusTag]");
    const tagged = dated.map((r) => ({ ...r, origin_status: "ACQUIRED_REHABILITATED" }));
    console.info("[END: Vulture.StatusTag]");

    console.info("[BEGIN: Vulture.BatchInsert]", { total: tagged.length });
    const batchPseudo = await sha256Hex(`vulture:mesh:${fileName}:${originalHash}`);
    const meshRows = tagged.map((r) => mapToMeshRow(r, batchPseudo.slice(0, 32)));
    const BATCH = 500;
    for (let i = 0; i < meshRows.length; i += BATCH) {
      const chunk = meshRows.slice(i, i + BATCH);
      const { error: insErr } = await supabase.from("mesh_telemetry_events").insert(chunk);
      if (insErr) {
        console.error("[BEGIN: Vulture.BatchInsert.Stall]", { offset: i, insErr });
        throw insErr;
      }
      console.info("[BEGIN: Vulture.BatchInsert.Chunk]", { offset: i, size: chunk.length });
    }
    console.info("[END: Vulture.BatchInsert]");

    console.info("[BEGIN: Vulture.HashSanitized]");
    const sanitizedHash = await sha256Hex(JSON.stringify(tagged));
    console.info("[END: Vulture.HashSanitized]", { sanitizedHash });

    console.info("[BEGIN: Vulture.ManifestUpload]");
    const manifest = {
      claim_generator: "IDIA-Vulture/2.0-Mesh",
      created_at: new Date().toISOString(),
      original_file: fileName,
      original_hash: originalHash,
      sanitized_hash: sanitizedHash,
      record_count: tagged.length,
      assertions: [
        { label: "c2pa.training_mining", data: { entries: { "c2pa.data_mining": { use: "notAllowed" } } } },
        {
          label: "idia.liability_shield",
          data: { status: "ACQUIRED_REHABILITATED", pii_stripped: true, temporal_reconstructed: true },
        },
        { label: "idia.mesh_provenance", data: { protocol: "DELT", anonymized_identifiers: true } },
      ],
    };
    const manifestPath = `${fileName}.manifest.json`;
    const { error: mErr } = await supabase.storage
      .from(MANIFEST_BUCKET)
      .upload(manifestPath, new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }), {
        upsert: true,
      });
    if (mErr) {
      console.error("[BEGIN: Vulture.ManifestUpload.Stall]", mErr);
      throw mErr;
    }
    console.info("[END: Vulture.ManifestUpload]", { manifestPath });

    console.info("[BEGIN: Vulture.LedgerFinalize]");
    await supabase.from("vulture_provenance_ledger").insert({
      original_file_name: fileName,
      bucket_path: `${BUCKET}/${fileName}`,
      record_count: tagged.length,
      action: "sanitize",
      status: "success",
      original_hash: originalHash,
      sanitized_hash: sanitizedHash,
      manifest_path: `${MANIFEST_BUCKET}/${manifestPath}`,
    });
    console.info("[END: Vulture.LedgerFinalize]");

    console.info("[END: Vulture.Handler]");
    return new Response(JSON.stringify({ ok: true, records: tagged.length, originalHash, sanitizedHash }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[BEGIN: Vulture.Handler.Stall]", err);
    try {
      await supabase.from("vulture_provenance_ledger").insert({
        original_file_name: fileName,
        action: "sanitize",
        status: "failed",
        error_message: String((err as Error)?.message ?? err),
      });
    } catch (logErr) {
      console.error("[BEGIN: Vulture.LedgerFinalize.Stall]", logErr);
    }
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
