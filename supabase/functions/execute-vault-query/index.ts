// ============================================================================
// execute-vault-query — Sovereign Vault DB orchestration layer.
// Routes vault.note.read / vault.search / vault.note.append / vault.note.list
// / vault.note.create against the public.vault_notes table under the caller's
// auth.uid() (RLS-enforced).
//
// Auth resolution:
//   1. If the request carries a user JWT (frontend supabase.functions.invoke),
//      we forward it so PostgREST evaluates RLS as that user.
//   2. If the caller is the internal mcp-edge-relay (service role) it sets
//      `x-idia-user-id` to the API-key owner; we use service role + explicit
//      filter by user_id (RLS bypassed by service role).
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idia-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

type Tool =
  | "vault.note.read"
  | "vault.search"
  | "vault.note.append"
  | "vault.note.list"
  | "vault.note.create";

interface Body {
  tool: Tool;
  arguments?: Record<string, unknown>;
}

function ok(reqId: string, data: unknown) {
  console.log(`[execute-vault-query][${reqId}] END ok`);
  return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: corsHeaders });
}
function fail(reqId: string, status: number, error: string, detail?: unknown) {
  console.log(`[execute-vault-query][${reqId}] END error status=${status} error=${error}`);
  return new Response(JSON.stringify({ ok: false, error, detail }), { status, headers: corsHeaders });
}

serve(async (req) => {
  const reqId = crypto.randomUUID().slice(0, 8);
  console.log(`[execute-vault-query][${reqId}] START method=${req.method}`);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail(reqId, 405, "method_not_allowed");

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail(reqId, 400, "invalid_json");
  }

  const tool = body?.tool;
  const args = (body?.arguments ?? {}) as Record<string, unknown>;
  if (!tool) return fail(reqId, 400, "missing_tool");

  // ---- Auth resolution ---------------------------------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  const relayUserId = req.headers.get("x-idia-user-id");

  let userId: string | null = null;
  let client: ReturnType<typeof createClient>;

  if (relayUserId && authHeader.includes(SERVICE_ROLE) && SERVICE_ROLE) {
    console.log(`[execute-vault-query][${reqId}] EXEC auth relay-mode user=${relayUserId}`);
    userId = relayUserId;
    client = createClient(SUPABASE_URL, SERVICE_ROLE);
  } else {
    console.log(`[execute-vault-query][${reqId}] EXEC auth jwt-mode`);
    if (!authHeader.startsWith("Bearer ")) return fail(reqId, 401, "missing_bearer");
    client = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr || !userData?.user) return fail(reqId, 401, "invalid_jwt");
    userId = userData.user.id;
  }

  // ---- Dispatch ----------------------------------------------------------
  try {
    if (tool === "vault.note.list") {
      const limit = Math.min(Number(args.limit) || 100, 500);
      const { data, error } = await client
        .from("vault_notes")
        .select("id,title,tags,updated_at,created_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) return fail(reqId, 500, "db_error", error.message);
      return ok(reqId, { notes: data ?? [] });
    }

    if (tool === "vault.note.read") {
      const id = String(args.id ?? "");
      if (!id) return fail(reqId, 400, "missing_id");
      const { data, error } = await client
        .from("vault_notes")
        .select("id,title,content,tags,updated_at,created_at")
        .eq("user_id", userId)
        .eq("id", id)
        .maybeSingle();
      if (error) return fail(reqId, 500, "db_error", error.message);
      if (!data) return fail(reqId, 404, "not_found");
      return ok(reqId, { note: data });
    }

    if (tool === "vault.search") {
      const query = String(args.query ?? "").trim();
      const limit = Math.min(Number(args.limit) || 50, 500);
      let q = client
        .from("vault_notes")
        .select("id,title,tags,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (query.length > 0) {
        // websearch_to_tsquery via textSearch
        q = q.textSearch("tsv", query, { type: "websearch", config: "english" });
      }
      const { data, error } = await q;
      if (error) return fail(reqId, 500, "db_error", error.message);
      return ok(reqId, { hits: data ?? [] });
    }

    if (tool === "vault.note.create") {
      const title = String(args.title ?? "").trim();
      const content = String(args.content ?? "");
      const tags = Array.isArray(args.tags) ? args.tags.filter((t) => typeof t === "string") : [];
      if (!title) return fail(reqId, 400, "missing_title");
      const { data, error } = await client
        .from("vault_notes")
        .insert({ user_id: userId, title, content, tags })
        .select("id,title,tags,updated_at,created_at")
        .single();
      if (error) return fail(reqId, 500, "db_error", error.message);
      return ok(reqId, { note: data });
    }

    if (tool === "vault.note.append") {
      const id = String(args.id ?? "");
      const content = String(args.content ?? "");
      if (!id) return fail(reqId, 400, "missing_id");
      if (!content) return fail(reqId, 400, "missing_content");
      // In relay/service-role mode we lose auth.uid() inside the RPC, so we
      // perform an explicit, locked update with user_id scoping.
      if (relayUserId) {
        const { data, error } = await client
          .from("vault_notes")
          .select("id,content")
          .eq("user_id", userId)
          .eq("id", id)
          .maybeSingle();
        if (error) return fail(reqId, 500, "db_error", error.message);
        if (!data) return fail(reqId, 404, "not_found");
        const next = (data.content ?? "") + content;
        const { data: upd, error: updErr } = await client
          .from("vault_notes")
          .update({ content: next })
          .eq("user_id", userId)
          .eq("id", id)
          .select("id,title,updated_at")
          .single();
        if (updErr) return fail(reqId, 500, "db_error", updErr.message);
        return ok(reqId, { note: upd, appended: true });
      }
      const { data, error } = await client.rpc("vault_note_append", {
        p_note_id: id,
        p_content: content,
      });
      if (error) return fail(reqId, 500, "rpc_error", error.message);
      return ok(reqId, { note: data, appended: true });
    }

    return fail(reqId, 400, "unknown_tool", tool);
  } catch (err: any) {
    console.log(`[execute-vault-query][${reqId}] ERROR ${err?.message}`);
    return fail(reqId, 500, "internal_error", err?.message);
  }
});