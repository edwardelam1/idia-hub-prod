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
import { TOOL_ROUTES } from "../_shared/edge-map.ts";
import { sanitizeArgs } from "../_shared/mcp_sanitizer.ts";
import {
  extractTraceContext,
  injectTraceHeaders,
} from "../_shared/trace-context.ts";
import {
  generateStatelessChallenge,
  hashArgs,
  verifySignatureChallenge,
} from "../_shared/mcp_edge_handshake_validator.ts";

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

console.log("[mcp-edge-relay] START boot");

// EdgeRuntime is provided by Supabase Edge Runtime; declare to satisfy TS.
declare const EdgeRuntime:
  | { waitUntil: (p: Promise<unknown>) => void }
  | undefined;

function deferTelemetry(p: Promise<unknown>) {
  try {
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(p);
    } else {
      // dev/test fallback — fire and forget
      p.catch((e) => console.log(`[mcp-edge-relay] telemetry-bg ERROR ${e?.message}`));
    }
  } catch (e: any) {
    console.log(`[mcp-edge-relay] telemetry-defer ERROR ${e?.message}`);
  }
}

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
  const meta = (params as any)?._meta as Record<string, unknown> | undefined;
  const traceCtx = extractTraceContext(meta);
  console.log(
    `[mcp-edge-relay][${reqId}] START trace parent=${traceCtx.traceId} span=${traceCtx.parentSpanId}`,
  );

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
      .filter((t) => t && t.enabled !== false && TOOL_ROUTES[t.name])
      .map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
    console.log(`[mcp-edge-relay][${reqId}] END tools-list count=${tools.length}`);
    return rpcResponse(id, { tools });
  }

  // ---- tools/challenge — issues a stateless HMAC-anchored handshake token --
  if (method === "tools/challenge") {
    console.log(`[mcp-edge-relay][${reqId}] START tools-challenge`);
    const toolName = (params as any)?.name as string | undefined;
    const rawArgs = ((params as any)?.arguments ?? {}) as Record<string, unknown>;
    if (!toolName || !TOOL_ROUTES[toolName]) {
      return rpcResponse(id, null, { code: -32601, message: `Tool unmapped: ${toolName}` });
    }
    const serverSecret = Deno.env.get("MCP_HANDSHAKE_SECRET") ?? "";
    if (!serverSecret) {
      console.log(`[mcp-edge-relay][${reqId}] ERROR challenge missing MCP_HANDSHAKE_SECRET`);
      return rpcResponse(id, null, { code: -32603, message: "Handshake secret unconfigured" });
    }
    const argsHash = await hashArgs(rawArgs);
    const challenge = await generateStatelessChallenge(argsHash, serverSecret);
    console.log(`[mcp-edge-relay][${reqId}] END tools-challenge issued nonce=${challenge.nonce}`);
    return rpcResponse(id, { challenge });
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
  const route = TOOL_ROUTES[toolName];
  if (!route) {
    console.log(`[mcp-edge-relay][${reqId}] END tool-route-validate REJECT unmapped=${toolName}`);
    return rpcResponse(id, null, { code: -32601, message: `Tool unmapped: ${toolName}` });
  }
  // Local-only tools (Sovereign Vault) MUST execute on the user's hardware
  // through idia-mcp-bridge. The cloud relay refuses to route them so vault
  // contents never traverse Supabase.
  if (route.local) {
    console.log(`[mcp-edge-relay][${reqId}] EXEC tool-route-validate LOCAL-ONLY ${toolName}`);
    deferTelemetry(
      supabase.from("mcp_relay_events").insert({
        user_id: userId,
        tool_name: toolName,
        trace_id: traceCtx.traceId,
        parent_span_id: traceCtx.parentSpanId,
        duration_ms: 0,
        status: "local_only",
        sanitized_args: {} as any,
        error_code: -32004,
        error_message: "Local-only tool; execute via local MCP bridge",
      }),
    );
    console.log(`[mcp-edge-relay][${reqId}] END tool-route-validate LOCAL-REJECT`);
    return rpcResponse(id, null, {
      code: -32004,
      message: "Local-only tool; execute via local MCP bridge",
    });
  }
  const targetFn = route.fn;
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

  // ---- premium handshake gate (stateless HMAC + Ed25519) ----
  if (route.premium) {
    console.log(`[mcp-edge-relay][${reqId}] START premium-handshake`);
    const serverSecret = Deno.env.get("MCP_HANDSHAKE_SECRET") ?? "";
    if (!serverSecret) {
      console.log(`[mcp-edge-relay][${reqId}] ERROR premium-handshake missing secret`);
      return rpcResponse(id, null, { code: -32603, message: "Handshake secret unconfigured" });
    }
    const verdict = await verifySignatureChallenge(rawArgs, meta, serverSecret);
    if (!verdict.valid) {
      console.log(`[mcp-edge-relay][${reqId}] END premium-handshake REJECT ${verdict.error}`);
      return rpcResponse(id, null, {
        code: -32001,
        message: verdict.error ?? "Handshake rejected",
      });
    }
    console.log(`[mcp-edge-relay][${reqId}] END premium-handshake OK`);
  }

  // ---- sanitize args ----
  console.log(`[mcp-edge-relay][${reqId}] START ingress-sanitization`);
  const { cleaned: cleanArgs, flags } = sanitizeArgs(rawArgs);
  if (flags.length) {
    console.log(
      `[mcp-edge-relay][${reqId}] WARN ingress-sanitization scrubbed ${JSON.stringify(flags)}`,
    );
  }
  console.log(`[mcp-edge-relay][${reqId}] END ingress-sanitization`);

  // ---- invoke downstream edge fn (service role) ----
  const startedAt = performance.now();
  try {
    console.log(`[mcp-edge-relay][${reqId}] START downstream-invoke fn=${targetFn}`);
    const { data, error } = await supabase.functions.invoke(targetFn, {
      body: cleanArgs,
      headers: injectTraceHeaders(traceCtx),
    });
    const durationMs = Math.round(performance.now() - startedAt);
    if (error) {
      console.log(`[mcp-edge-relay][${reqId}] END downstream-invoke ERROR ${error.message}`);
      deferTelemetry(
        supabase.from("mcp_relay_events").insert({
          user_id: userId,
          tool_name: toolName,
          trace_id: traceCtx.traceId,
          parent_span_id: traceCtx.parentSpanId,
          duration_ms: durationMs,
          status: "error",
          sanitized_args: cleanArgs as any,
          error_code: -32002,
          error_message: error.message,
        }),
      );
      return rpcResponse(id, null, {
        code: -32002,
        message: `Downstream failure: ${error.message}`,
      });
    }
    console.log(`[mcp-edge-relay][${reqId}] END downstream-invoke OK`);
    deferTelemetry(
      supabase.from("mcp_relay_events").insert({
        user_id: userId,
        tool_name: toolName,
        trace_id: traceCtx.traceId,
        parent_span_id: traceCtx.parentSpanId,
        duration_ms: durationMs,
        status: "ok",
        sanitized_args: cleanArgs as any,
      }),
    );
    return rpcResponse(id, {
      content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data) }],
    });
  } catch (err: any) {
    console.log(`[mcp-edge-relay][${reqId}] ERROR downstream-invoke unhandled ${err?.message}`);
    deferTelemetry(
      supabase.from("mcp_relay_events").insert({
        user_id: userId,
        tool_name: toolName,
        trace_id: traceCtx.traceId,
        parent_span_id: traceCtx.parentSpanId,
        duration_ms: Math.round(performance.now() - startedAt),
        status: "exception",
        sanitized_args: cleanArgs as any,
        error_code: -32603,
        error_message: err?.message,
      }),
    );
    return rpcResponse(id, null, { code: -32603, message: `Internal error: ${err?.message}` });
  }
});