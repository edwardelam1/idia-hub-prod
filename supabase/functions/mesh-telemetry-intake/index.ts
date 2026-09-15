// Edge function: mesh-telemetry-intake
// Production ingest door for autonomous Vulture mesh edge nodes.
// Authenticated with a mesh franchise key (x-api-key). Refuses everything while the
// gateway is sealed. PII is hashed with the vault salt before anything is persisted.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  "license_plate",
  "phone",
  "phone_number",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function stripPII(row: Record<string, unknown>, salt: string): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const lk = k.toLowerCase();
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      out[k] = await stripPII(v as Record<string, unknown>, salt);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log(`[MESH_INTAKE_START] Inbound mesh telemetry request received.`);

  try {
    console.log(`[SUPABASE_INIT_START] Opening privileged connection.`);
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    console.log(`[SUPABASE_INIT_END] Connection established.`);

    console.log(`[API_KEY_AUTH_START] Validating mesh node credential.`);
    const presentedKey = req.headers.get("x-api-key") ?? "";
    if (!presentedKey) {
      console.error(`[API_KEY_AUTH_ERROR] Missing x-api-key header.`);
      console.log(`[API_KEY_AUTH_END] Rejected.`);
      return json({ error: "Missing x-api-key header." }, 401);
    }
    const presentedHash = await sha256Hex(presentedKey);
    const { data: keyRow, error: keyError } = await supabase
      .from("api_keys")
      .select("id, user_id, status")
      .eq("key_hash", presentedHash)
      .eq("environment", "mesh")
      .eq("status", "active")
      .maybeSingle();
    if (keyError) {
      console.error(`[API_KEY_AUTH_QUERY_ERROR] ${keyError.message}`);
      return json({ error: "Credential verification failed." }, 500);
    }
    if (!keyRow) {
      console.error(`[API_KEY_AUTH_ERROR] Unknown or revoked mesh credential presented.`);
      console.log(`[API_KEY_AUTH_END] Rejected.`);
      return json({ error: "Invalid or revoked mesh key." }, 401);
    }
    console.log(`[API_KEY_AUTH_END] Credential valid. Node operator: ${keyRow.user_id}`);

    console.log(`[GATEWAY_STATE_START] Checking mesh gateway authorization state.`);
    const { data: gateway, error: gatewayError } = await supabase
      .from("mesh_gateway_state")
      .select("is_open")
      .eq("id", "singleton")
      .maybeSingle();
    if (gatewayError) {
      console.error(`[GATEWAY_STATE_QUERY_ERROR] ${gatewayError.message}`);
      return json({ error: "Gateway state unavailable." }, 500);
    }
    if (!gateway?.is_open) {
      console.error(`[GATEWAY_STATE_SEALED] Gateway is sealed. Refusing ingest.`);
      console.log(`[GATEWAY_STATE_END] Rejected.`);
      return json({ error: "Mesh gateway is sealed. Ingest refused." }, 503);
    }
    console.log(`[GATEWAY_STATE_END] Gateway open. Proceeding.`);

    console.log(`[PAYLOAD_PARSE_START] Reading telemetry payload.`);
    const body = await req.json().catch(() => null);
    const events = Array.isArray(body?.events) ? body.events : Array.isArray(body) ? body : null;
    if (!events || events.length === 0) {
      console.error(`[PAYLOAD_VALIDATION_ERROR] Missing or empty events array.`);
      return json({ error: "Payload must include a non-empty 'events' array." }, 400);
    }
    if (events.length > 500) {
      console.error(`[PAYLOAD_VALIDATION_ERROR] Batch exceeds 500 events.`);
      return json({ error: "Maximum 500 events per batch." }, 400);
    }
    console.log(`[PAYLOAD_PARSE_END] ${events.length} events accepted for shaping.`);

    console.log(`[VAULT_ACCESS_START] Retrieving anonymization salt.`);
    const { data: saltData, error: saltError } = await supabase.rpc("get_vulture_salt");
    if (saltError) {
      console.error(`[VAULT_ACCESS_ERROR] ${saltError.message}`);
      throw saltError;
    }
    const salt = String(saltData ?? "");
    console.log(`[VAULT_ACCESS_END] Salt acquired.`);

    console.log(`[SHAPING_LOOP_START] Stripping PII and shaping ${events.length} events.`);
    const nodeId = String(body?.node_id ?? keyRow.id);
    const pseudoNodeId = (await sha256Hex(salt + nodeId)).slice(0, 32);
    const rows: Record<string, unknown>[] = [];
    for (const event of events) {
      try {
        if (typeof event !== "object" || event === null) {
          console.error(`[SHAPING_LOOP_SKIP] Non-object event encountered. Skipping.`);
          continue;
        }
        const clean = await stripPII(event as Record<string, unknown>, salt);
        rows.push({
          pseudo_node_id: pseudoNodeId,
          telemetry_category: String((event as Record<string, unknown>).event_type ?? "MESH_TELEMETRY"),
          payload_data: { ...clean, origin_status: "ACQUIRED_REHABILITATED" },
          data_quality_score: typeof (event as Record<string, unknown>).hdop === "number"
            ? 1 / Math.max(Number((event as Record<string, unknown>).hdop), 1)
            : 0.99,
          processed_at: new Date().toISOString(),
        });
      } catch (shapeError) {
        console.error(
          `[SHAPING_LOOP_FAULT] ${shapeError instanceof Error ? shapeError.stack : String(shapeError)}`,
        );
      }
    }
    console.log(`[SHAPING_LOOP_END] ${rows.length} events shaped.`);

    console.log(`[TELEMETRY_INSERT_START] Writing ${rows.length} rows to mesh_telemetry_events.`);
    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("mesh_telemetry_events").insert(rows);
      if (insertError) {
        console.error(`[TELEMETRY_INSERT_ERROR] ${insertError.message}`);
        throw insertError;
      }
    }
    console.log(`[TELEMETRY_INSERT_END] Insert complete.`);

    console.log(`[LEDGER_WRITE_START] Recording provenance ledger entry.`);
    const batchHash = await sha256Hex(JSON.stringify(rows));
    const { error: ledgerError } = await supabase.from("vulture_provenance_ledger").insert({
      original_file_name: `mesh-node/${pseudoNodeId}`,
      bucket_path: null,
      record_count: rows.length,
      action: "mesh_ingest",
      status: "success",
      sanitized_hash: batchHash,
    });
    if (ledgerError) console.error(`[LEDGER_WRITE_ERROR] ${ledgerError.message}`);
    console.log(`[LEDGER_WRITE_END] Ledger entry recorded.`);

    console.log(`[API_KEY_TOUCH_START] Stamping credential last_used_at.`);
    const { error: touchError } = await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);
    if (touchError) console.error(`[API_KEY_TOUCH_ERROR] ${touchError.message}`);
    console.log(`[API_KEY_TOUCH_END] Stamp complete.`);

    console.log(`[MESH_INTAKE_END] Execution complete. Accepted ${rows.length} events.`);
    return json({
      status: "success",
      events_received: events.length,
      events_committed: rows.length,
      batch_hash: batchHash,
    });
  } catch (err) {
    console.error(
      `[CRITICAL_SYSTEM_FAULT] Unhandled exception in mesh intake. Stack: ${err instanceof Error ? err.stack : String(err)}`,
    );
    console.log(`[MESH_INTAKE_END_WITH_ERROR] Process terminated abruptly.`);
    return json({ error: "Internal Server Error" }, 500);
  }
});
