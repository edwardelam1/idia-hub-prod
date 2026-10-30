// Edge function: mesh-nodes
// Sole write path for Vulture mesh node credentials (browsers can only read their own rows).
// Actions: create · revoke · rotate · update_allowlist. Raw keys are returned exactly once;
// only SHA-256 hashes are stored. Keys expire after 90 days. Rows are never deleted so
// historical node_id attribution in vulture_ledger stays intact. Every action requires an
// authenticator-app (aal2) session and is audited to security_events with operator + IP.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { nodeKeyExpiry, tokenAssuranceLevel } from "../_shared/vulture-cjis.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const IP_RE = /^[0-9a-fA-F:.]+(\/\d{1,3})?$/;
const IpList = z.array(z.string().trim().regex(IP_RE)).max(32);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), label: z.string().trim().min(1).max(80), ip_allowlist: IpList.default([]), cjis_isolated: z.boolean().default(false) }),
  z.object({ action: z.literal("revoke"), id: z.string().uuid(), reason: z.string().trim().max(200).optional() }),
  z.object({ action: z.literal("rotate"), id: z.string().uuid() }),
  z.object({ action: z.literal("update_allowlist"), id: z.string().uuid(), ip_allowlist: IpList }),
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(v: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const randHex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.log("[PHASE_START] mesh-nodes request");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const sourceIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const userAgent = req.headers.get("user-agent")?.slice(0, 200) ?? null;

  const audit = async (operatorId: string, actionType: string, detail: Record<string, unknown>) => {
    console.log(`[PHASE_START] AUDIT ${actionType}`);
    const { error } = await admin.from("security_events").insert({
      agent_name: "crazy_guardian",
      action_type: actionType,
      severity: "low",
      result_data: { operator_id: operatorId, source_ip: sourceIp, user_agent: userAgent, at: new Date().toISOString(), ...detail },
    });
    if (error) console.error(`[PHASE_END] AUDIT ${actionType} failed: ${error.message}`);
    else console.log(`[PHASE_END] AUDIT ${actionType}`);
  };

  const mint = async (userId: string, label: string, ipAllowlist: string[], cjis: boolean, rotatedFrom: string | null) => {
    const rawKey = `vnk_${randHex(32)}`;
    const nodeId = `node_${randHex(6)}`;
    const expiresAt = nodeKeyExpiry().toISOString();
    const { data, error } = await admin.from("mesh_nodes").insert({
      node_id: nodeId, tenant_id: userId, label, ip_allowlist: ipAllowlist, cjis_isolated: cjis,
      token_hash: await sha256Hex(rawKey), key_prefix: rawKey.slice(0, 12), expires_at: expiresAt, rotated_from: rotatedFrom,
    }).select("id").single();
    if (error) throw new Error(`mint failed: ${error.message}`);
    return { id: data.id as string, nodeId, rawKey, expiresAt };
  };

  try {
    console.log("[PHASE_START] AUTH");
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error(`[PHASE_END] AUTH rejected: ${userErr?.message ?? "no user"}`);
      return json({ error: "Not authenticated." }, 401);
    }
    const userId = userData.user.id;
    if (tokenAssuranceLevel(token) !== "aal2") {
      console.error(`[PHASE_END] AUTH rejected: aal2 required user=${userId}`);
      await audit(userId, "mesh_key_mfa_denied", {});
      return json({ error: "Authenticator verification required.", code: "MFA_REQUIRED" }, 403);
    }
    const { data: tenant, error: tenantErr } = await admin.rpc("is_vulture_tenant", { _user_id: userId });
    if (tenantErr || tenant !== true) {
      console.error(`[PHASE_END] AUTH rejected: not a Vulture tenant user=${userId}`);
      return json({ error: "Not authorized." }, 403);
    }
    console.log(`[PHASE_END] AUTH user=${userId}`);

    console.log("[PHASE_START] VALIDATE");
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      console.error("[PHASE_END] VALIDATE failed");
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const input = parsed.data;
    console.log(`[PHASE_END] VALIDATE action=${input.action}`);

    if (input.action === "create") {
      console.log("[PHASE_START] MINT");
      const m = await mint(userId, input.label, input.ip_allowlist, input.cjis_isolated, null);
      await audit(userId, "mesh_key_minted", { node_id: m.nodeId, cjis_isolated: input.cjis_isolated, expires_at: m.expiresAt });
      console.log(`[PHASE_END] MINT node=${m.nodeId}`);
      return json({ node_id: m.nodeId, key: m.rawKey, label: input.label, expires_at: m.expiresAt });
    }

    console.log("[PHASE_START] LOAD_NODE");
    const { data: node, error: nodeErr } = await admin.from("mesh_nodes")
      .select("id, node_id, tenant_id, label, ip_allowlist, status, cjis_isolated").eq("id", input.id).maybeSingle();
    if (nodeErr) throw nodeErr;
    if (!node || node.tenant_id !== userId) {
      console.error("[PHASE_END] LOAD_NODE not found or not owned");
      return json({ error: "Node not found." }, 404);
    }
    console.log(`[PHASE_END] LOAD_NODE node=${node.node_id} status=${node.status}`);

    const revoke = async (reason: string) => {
      const { error } = await admin.from("mesh_nodes").update({
        status: "revoked", revoked_at: new Date().toISOString(), revoked_by: userId, revoked_ip: sourceIp, revocation_reason: reason,
      }).eq("id", node.id);
      if (error) throw new Error(`revoke failed: ${error.message}`);
    };

    if (input.action === "revoke") {
      console.log("[PHASE_START] REVOKE");
      if (node.status === "revoked") return json({ ok: true, status: "revoked" });
      await revoke(input.reason || "operator_revoked");
      await audit(userId, "mesh_key_revoked", { node_id: node.node_id, reason: input.reason || "operator_revoked" });
      console.log("[PHASE_END] REVOKE");
      return json({ ok: true, status: "revoked" });
    }

    if (input.action === "rotate") {
      console.log("[PHASE_START] ROTATE");
      const m = await mint(userId, node.label, node.ip_allowlist ?? [], node.cjis_isolated === true, node.id);
      if (node.status !== "revoked") await revoke("rotated");
      await audit(userId, "mesh_key_rotated", { node_id: node.node_id, new_node_id: m.nodeId, expires_at: m.expiresAt });
      console.log(`[PHASE_END] ROTATE new=${m.nodeId}`);
      return json({ node_id: m.nodeId, key: m.rawKey, label: node.label, expires_at: m.expiresAt });
    }

    // update_allowlist
    console.log("[PHASE_START] ALLOWLIST");
    if (node.status !== "active") return json({ error: "Only active keys can be edited." }, 409);
    const { error: upErr } = await admin.from("mesh_nodes").update({ ip_allowlist: input.ip_allowlist }).eq("id", node.id);
    if (upErr) throw upErr;
    await audit(userId, "mesh_allowlist_updated", { node_id: node.node_id, previous: node.ip_allowlist ?? [], next: input.ip_allowlist });
    console.log("[PHASE_END] ALLOWLIST");
    return json({ ok: true, ip_allowlist: input.ip_allowlist });
  } catch (err) {
    console.error(`[PHASE_END] mesh-nodes fault: ${err instanceof Error ? err.stack : String(err)}`);
    return json({ error: "Internal error." }, 500);
  }
});
