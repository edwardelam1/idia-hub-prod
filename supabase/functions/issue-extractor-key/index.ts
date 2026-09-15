// Edge function: issue-extractor-key
// Mints / lists / revokes commercial franchise API keys used by the LIDD intake gateway.
// Only the SHA-256 hash and an 8-char prefix are persisted; the raw key is returned once.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function mintKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = [...bytes].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 40);
  return `ext_live_${body}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  console.log(`[ISSUE_EXTRACTOR_KEY_START] Request received.`);
  try {
    console.log(`[AUTH_CHECK_START] Verifying caller session.`);
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      console.error(`[AUTH_CHECK_ERROR] Missing Authorization header.`);
      return json({ error: "Not authenticated." }, 401);
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error(`[AUTH_CHECK_ERROR] ${userError?.message ?? "No user for token."}`);
      return json({ error: "Not authenticated." }, 401);
    }
    const userId = userData.user.id;
    console.log(`[AUTH_CHECK_END] Caller resolved: ${userId}`);

    console.log(`[PAYLOAD_PARSE_START] Reading action payload.`);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "create");
    console.log(`[PAYLOAD_PARSE_END] Action: ${action}`);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "list") {
      console.log(`[KEY_LIST_START] Listing franchise keys for ${userId}`);
      const { data, error } = await admin
        .from("api_keys")
        .select("id, name, key_prefix, status, created_at, last_used_at")
        .eq("user_id", userId)
        .eq("environment", "lidd")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(`[KEY_LIST_ERROR] ${error.message}`);
        throw error;
      }
      console.log(`[KEY_LIST_END] ${data?.length ?? 0} keys returned.`);
      return json({ keys: data ?? [] });
    }

    if (action === "revoke") {
      const keyId = String(body.key_id ?? "");
      console.log(`[KEY_REVOKE_START] Revoking key ${keyId}`);
      if (!keyId) return json({ error: "key_id required." }, 400);
      const { error } = await admin
        .from("api_keys")
        .update({ status: "revoked" })
        .eq("id", keyId)
        .eq("user_id", userId);
      if (error) {
        console.error(`[KEY_REVOKE_ERROR] ${error.message}`);
        throw error;
      }
      console.log(`[KEY_REVOKE_END] Key revoked.`);
      return json({ ok: true });
    }

    console.log(`[KEY_CREATE_START] Minting franchise key for ${userId}`);
    const rawKey = mintKey();
    const keyHash = await sha256Hex(rawKey);
    const keyPrefix = rawKey.slice(0, 8);
    const { data: inserted, error: insertError } = await admin
      .from("api_keys")
      .insert({
        user_id: userId,
        name: String(body.name ?? "LIDD Franchise Key"),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        environment: "lidd",
        status: "active",
      })
      .select("id, key_prefix, created_at")
      .single();
    if (insertError) {
      console.error(`[KEY_CREATE_ERROR] ${insertError.message}`);
      throw insertError;
    }
    console.log(`[KEY_CREATE_END] Key minted (prefix ${keyPrefix}). Raw value returned once.`);
    return json({ key: rawKey, record: inserted });
  } catch (err) {
    console.error(
      `[ISSUE_EXTRACTOR_KEY_FAULT] ${err instanceof Error ? err.stack : String(err)}`,
    );
    console.log(`[ISSUE_EXTRACTOR_KEY_END_WITH_ERROR] Process terminated abruptly.`);
    return json({ error: "Key issuance failed." }, 500);
  }
});
