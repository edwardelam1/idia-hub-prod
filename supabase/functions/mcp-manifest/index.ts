// ============================================================================
// mcp-manifest — serves a user's enabled MCP tool manifest to local MCP
// clients (Claude Desktop, Ollama, IDE plugins) authenticated via API key.
//
// GET ?user_id=<uuid>
//   Authorization: Bearer <IDIA_API_KEY>
// Returns the standard MCP manifest envelope with only enabled tools.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

// Use the wire-format version that current MCP clients (Claude Desktop / Ollama) accept.
const MCP_PROTOCOL_VERSION = "2024-11-05";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

console.log("[mcp-manifest] START boot");

serve(async (req) => {
  const reqId = crypto.randomUUID().slice(0, 8);
  console.log(`[mcp-manifest][${reqId}] START request method=${req.method}`);

  if (req.method === "OPTIONS") {
    console.log(`[mcp-manifest][${reqId}] END OPTIONS preflight`);
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    console.log(`[mcp-manifest][${reqId}] END method-not-allowed`);
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // ---- 1. extract bearer token ----
    console.log(`[mcp-manifest][${reqId}] START auth-header-extract`);
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      console.log(`[mcp-manifest][${reqId}] END auth-missing`);
      return new Response(JSON.stringify({ error: "missing_bearer_token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const token = authHeader.slice(7).trim();
    const prefix = token.slice(0, 8);
    console.log(`[mcp-manifest][${reqId}] END auth-header-extract prefix=${prefix}`);

    // ---- 2. resolve user_id via api_keys prefix + sha256 hash ----
    const hashStart = performance.now();
    console.log(`[mcp-manifest][${reqId}] START api-key-prefix-lookup`);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: candidates, error: lookupErr } = await supabase
      .from("api_keys")
      .select("user_id,key_hash,status")
      .eq("key_prefix", prefix)
      .eq("status", "active");

    if (lookupErr) {
      console.log(`[mcp-manifest][${reqId}] ERROR api-key-lookup ${lookupErr.message}`);
      return new Response(JSON.stringify({ error: "auth_lookup_failed" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const fullHash = await sha256Hex(token);
    const match = (candidates ?? []).find((row) => row.key_hash === fullHash);
    const dtMs = (performance.now() - hashStart).toFixed(2);
    console.log(
      `[mcp-manifest][${reqId}] END api-key-prefix-lookup candidates=${candidates?.length ?? 0} match=${!!match} dt=${dtMs}ms`,
    );

    if (!match) {
      return new Response(JSON.stringify({ error: "invalid_api_key" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Touch last_used_at (fire & forget; no await blocks response)
    supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", match.user_id)
      .eq("key_hash", fullHash)
      .then(() => console.log(`[mcp-manifest][${reqId}] EXEC last_used_at touched`));

    // ---- 3. load manifest row ----
    console.log(`[mcp-manifest][${reqId}] START manifest-fetch user=${match.user_id}`);
    const { data: manifestRow, error: manifestErr } = await supabase
      .from("mcp_manifests")
      .select("tools,updated_at")
      .eq("user_id", match.user_id)
      .maybeSingle();

    if (manifestErr) {
      console.log(`[mcp-manifest][${reqId}] ERROR manifest-fetch ${manifestErr.message}`);
      return new Response(JSON.stringify({ error: "manifest_fetch_failed" }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    const rawTools: any[] = Array.isArray(manifestRow?.tools) ? (manifestRow!.tools as any[]) : [];
    const enabled = rawTools
      .filter((t) => t && t.enabled !== false)
      .map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
    console.log(`[mcp-manifest][${reqId}] END manifest-fetch enabled=${enabled.length}`);

    // ---- 4. return MCP manifest envelope ----
    const manifest = {
      protocolVersion: MCP_PROTOCOL_VERSION,
      serverInfo: { name: "idia-hub-mcp", version: "1.0.0" },
      tools: enabled,
    };
    console.log(`[mcp-manifest][${reqId}] END request OK`);
    return new Response(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: any) {
    console.log(`[mcp-manifest][${reqId}] ERROR unhandled ${err?.message ?? err}`);
    return new Response(JSON.stringify({ error: "internal_error", detail: String(err?.message ?? err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});