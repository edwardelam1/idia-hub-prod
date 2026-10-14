// Edge function: mesh-nodes
// Registers Vulture mesh edge nodes. The raw node key is returned exactly once;
// only its SHA-256 hash is persisted in public.mesh_nodes.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const IP_RE = /^[0-9a-fA-F:.]+(\/\d{1,3})?$/;
const Body = z.object({
  action: z.literal("create"),
  label: z.string().trim().min(1).max(80),
  ip_allowlist: z.array(z.string().trim().regex(IP_RE)).max(32).default([]),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const randHex = (n: number) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.log("[PHASE_START] mesh-nodes request");
  try {
    console.log("[PHASE_START] AUTH");
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error(`[PHASE_END] AUTH rejected: ${userErr?.message ?? "no user"}`);
      return json({ error: "Not authenticated." }, 401);
    }
    const userId = userData.user.id;
    console.log(`[PHASE_END] AUTH user=${userId}`);

    console.log("[PHASE_START] VALIDATE");
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      console.error("[PHASE_END] VALIDATE failed");
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    console.log("[PHASE_END] VALIDATE");

    console.log("[PHASE_START] MINT");
    const rawKey = `vnk_${randHex(32)}`;
    const nodeId = `node_${randHex(6)}`;
    const { error: insErr } = await admin.from("mesh_nodes").insert({
      node_id: nodeId,
      tenant_id: userId,
      label: parsed.data.label,
      ip_allowlist: parsed.data.ip_allowlist,
      token_hash: await sha256Hex(rawKey),
      key_prefix: rawKey.slice(0, 12),
    });
    if (insErr) {
      console.error(`[PHASE_END] MINT insert error: ${insErr.message}`);
      return json({ error: "Could not register node." }, 500);
    }
    console.log(`[PHASE_END] MINT node=${nodeId}`);
    console.log("[PHASE_END] mesh-nodes request");
    return json({ node_id: nodeId, key: rawKey, label: parsed.data.label });
  } catch (err) {
    console.error(`[PHASE_END] mesh-nodes fault: ${err instanceof Error ? err.stack : String(err)}`);
    return json({ error: "Internal error." }, 500);
  }
});
