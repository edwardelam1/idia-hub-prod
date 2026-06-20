// ============================================================================
// mcp-edge-relay — JSON-RPC entry point for local MCP clients/bridges.
//
// Accepts standard MCP envelopes:
//   - initialize
//   - tools/list
//   - tools/call { name, arguments }
//
// Auth: Authorization: Bearer <IDIA_API_KEY>  (api_keys SHA-256)
// Validates tool against TOOL_TO_EDGE single source of truth, sanitizes
// arguments against ProtocolAddressBody / HexadecimalAssetIdentifier and
// generic PII patterns, then invokes the downstream edge function with
// service-role credentials. All downstream credit/Liability-Shield logic
// inside the target function fires as normal.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { TOOL_TO_EDGE } from "../_shared/edge-map.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const MCP_PROTOCOL_VERSION = "2024-11-05";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
}

function rpcResponse(id: any, result: any, error: any = null) {
  const payload: Record<string, any> = { jsonrpc: "2.0", id: id ?? null };
  if (error) payload.error = error;
  else payload.result = result;
  return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ----------------------------------------------------------------------------
// Ingress sanitization. Tags are intentionally protocol-neutral
// (HexadecimalAssetIdentifier / ProtocolAddressBody) — never named after
// any specific chain or wallet family — to preserve corporate banking
// compliance nomenclature.
// ----------------------------------------------------------------------------
const SANITIZE_RULES: Array<{ tag: string; pattern: RegExp }> = [
  { tag: "ProtocolAddressBody", pattern: /\b0x[a-fA-F0-9]{40}\b/g },
  { tag: "HexadecimalAssetIdentifier", pattern: /\b0x[a-fA-F0-9]{64}\b/g },
  { tag: "EmailIdentifierString", pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  {
    tag: "TelephonyContactString",
    pattern: /(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/g,
  },
  { tag: "GovernmentTaxIdentifier", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
];

function sanitizeArguments(args: Record<string, unknown>, reqId: string) {
  console.log(`[mcp-edge-relay][${reqId}] START ingress-sanitization`);
  const flags: Array<{ tag: string; count: number }> = [];
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      let out = v;
      for (const rule of SANITIZE_RULES) {
        const m = out.match(rule.pattern);
        if (m && m.length > 0) {
          flags.push({ tag: rule.tag, count: m.length });
          // Preserve structural shape — pass cleaned token markers so downstream
          // services receive deterministic placeholders, not raw values.
          out = out.replace(rule.pattern, `<${rule.tag}>`);
        }
      }
      return out;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const next: Record<string, unknown> = {};
      for (const [k, vv] of Object.entries(v as Record<string, unknown>)) next[k] = walk(vv);
      return next;
    }
    return v;
  };
  const cleaned = walk(args) as Record<string, unknown>;
  if (flags.length) {
    console.log(
      `[mcp-edge-relay][${reqId}] WARN ingress-sanitization scrubbed ${JSON.stringify(flags)}`,
    );
  }
  console.log(`[mcp-edge-relay][${reqId}] END ingress-sanitization`);
  return cleaned;
}

console.log("[mcp-edge-relay] START boot");

serve(async (req) => {
  const reqId = crypto.randomUUID().slice(0, 8);
  console.log(`[mcp-edge-relay][${reqId}] START request method=${req.method}`);

  if (req.method === "OPTIONS") {
    console.log(`[mcp-edge-relay][${reqId}] END OPTIONS`);
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log(`[mcp-edge-relay][${reqId}] END method-not-allowed`);
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  let body: JsonRpcRequest;
  try {
    console.log(`[mcp-edge-relay][${reqId}] START body-decode`);
    body = await req.json();
    console.log(`[mcp-edge-relay][${reqId}] END body-decode method=${body?.method}`);
  } catch (err: any) {
    console.log(`[mcp-edge-relay][${reqId}] ERROR body-decode ${err?.message}`);
    return rpcResponse(null, null, { code: -32700, message: "Parse error" });
  }

  const { id, method, params } = body;

  // ---- auth ----
  console.log(`[mcp-edge-relay][${reqId}] START auth`);
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    console.log(`[mcp-edge-relay][${reqId}] END auth-missing`);
    return rpcResponse(id, null, { code: -32001, message: "Missing bearer token" });
  }
  const token = authHeader.slice(7).trim();
  const prefix = token.slice(0, 8);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const hashStart = performance.now();
  const fullHash = await sha256Hex(token);
  const { data: candidates, error: keyErr } = await supabase
    .from("api_keys")
    .select("user_id,key_hash,status")
    .eq("key_prefix", prefix)
    .eq("status", "active");
  const match = (candidates ?? []).find((row) => row.key_hash === fullHash);
  console.log(
    `[mcp-edge-relay][${reqId}] END auth match=${!!match} dt=${(performance.now() - hashStart).toFixed(2)}ms`,
  );
  if (keyErr || !match) {
    return rpcResponse(id, null, { code: -32001, message: "Invalid API key" });
  }
  const userId = match.user_id;

  // ---- method routing ----
  if (method === "initialize") {
    console.log(`[mcp-edge-relay][${reqId}] EXEC initialize`);
    return rpcResponse(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "idia-hub-mcp", version: "1.0.0" },
    });
  }

  if (method === "tools/list") {
    console.log(`[mcp-edge-relay][${reqId}] START tools-list user=${userId}`);
    const { data: row } = await supabase
      .from("mcp_manifests")
      .select("tools")
      .eq("user_id", userId)
      .maybeSingle();
    const tools = (Array.isArray(row?.tools) ? (row!.tools as any[]) : [])
      .filter((t) => t && t.enabled !== false && TOOL_TO_EDGE[t.name])
      .map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
    console.log(`[mcp-edge-relay][${reqId}] END tools-list count=${tools.length}`);
    return rpcResponse(id, { tools });
  }

  if (method !== "tools/call") {
    console.log(`[mcp-edge-relay][${reqId}] END unsupported-method ${method}`);
    return rpcResponse(id, null, { code: -32601, message: `Method not supported: ${method}` });
  }

  const toolName = params?.name;
  const rawArgs = (params?.arguments ?? {}) as Record<string, unknown>;
  if (!toolName) {
    return rpcResponse(id, null, { code: -32602, message: "Missing tool name" });
  }

  // ---- map validation against single source of truth ----
  console.log(`[mcp-edge-relay][${reqId}] START tool-route-validate name=${toolName}`);
  const targetFn = TOOL_TO_EDGE[toolName];
  if (!targetFn) {
    console.log(`[mcp-edge-relay][${reqId}] END tool-route-validate REJECT unmapped=${toolName}`);
    return rpcResponse(id, null, { code: -32601, message: `Tool unmapped: ${toolName}` });
  }
  console.log(`[mcp-edge-relay][${reqId}] END tool-route-validate target=${targetFn}`);

  // ---- enablement check ----
  console.log(`[mcp-edge-relay][${reqId}] START tool-enabled-check`);
  const { data: manifestRow } = await supabase
    .from("mcp_manifests")
    .select("tools")
    .eq("user_id", userId)
    .maybeSingle();
  const manifestTools: any[] = Array.isArray(manifestRow?.tools) ? (manifestRow!.tools as any[]) : [];
  const userTool = manifestTools.find((t) => t?.name === toolName);
  if (!userTool || userTool.enabled === false) {
    console.log(`[mcp-edge-relay][${reqId}] END tool-enabled-check REJECT not-enabled`);
    return rpcResponse(id, null, {
      code: -32601,
      message: `Tool not enabled in user manifest: ${toolName}`,
    });
  }
  console.log(`[mcp-edge-relay][${reqId}] END tool-enabled-check OK`);

  // ---- sanitize args ----
  const cleanArgs = sanitizeArguments(rawArgs, reqId);

  // ---- invoke downstream edge fn (service role) ----
  try {
    console.log(`[mcp-edge-relay][${reqId}] START downstream-invoke fn=${targetFn}`);
    const { data, error } = await supabase.functions.invoke(targetFn, { body: cleanArgs });
    if (error) {
      console.log(`[mcp-edge-relay][${reqId}] END downstream-invoke ERROR ${error.message}`);
      return rpcResponse(id, null, {
        code: -32002,
        message: `Downstream failure: ${error.message}`,
      });
    }
    console.log(`[mcp-edge-relay][${reqId}] END downstream-invoke OK`);
    return rpcResponse(id, {
      content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data) }],
    });
  } catch (err: any) {
    console.log(`[mcp-edge-relay][${reqId}] ERROR downstream-invoke unhandled ${err?.message}`);
    return rpcResponse(id, null, { code: -32603, message: `Internal error: ${err?.message}` });
  }
});