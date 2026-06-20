// ============================================================================
// mcp-telemetry-stream — SSE feed of MCP relay events for the dashboard.
// Auth: ?key=<IDIA_API_KEY>  (query-string because EventSource cannot set
// headers). Stateless HTTP/2 stream; no WebSocket upgrade.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

console.log("[mcp-telemetry-stream] START boot");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!key) {
    return new Response(JSON.stringify({ error: "missing_key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const prefix = key.slice(0, 8);
  const fullHash = await sha256Hex(key);
  const { data: candidates } = await supabase
    .from("api_keys")
    .select("user_id,key_hash,status")
    .eq("key_prefix", prefix)
    .eq("status", "active");
  const match = (candidates ?? []).find((r) => r.key_hash === fullHash);
  if (!match) {
    return new Response(JSON.stringify({ error: "invalid_key" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = match.user_id;
  console.log(`[mcp-telemetry-stream] START user=${userId}`);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (_) { /* closed */ }
      };

      // Seed with last 25 events
      const { data: seed } = await supabase
        .from("mcp_relay_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25);
      (seed ?? []).reverse().forEach((row) => sendEvent("relay", row));

      const channel = supabase
        .channel(`mcp_relay_events_${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "mcp_relay_events", filter: `user_id=eq.${userId}` },
          (payload) => sendEvent("relay", payload.new),
        )
        .subscribe();

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch (_) { /* closed */ }
      }, 15000);

      const abort = () => {
        clearInterval(heartbeat);
        supabase.removeChannel(channel);
        try { controller.close(); } catch (_) { /* already closed */ }
        console.log(`[mcp-telemetry-stream] END user=${userId}`);
      };
      req.signal.addEventListener("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});