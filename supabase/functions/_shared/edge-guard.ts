// Shared CORS allowlist + caller authorization for Hub edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ORIGINS = new Set([
  "https://hub.thebigidia.com",
  "https://life.thebigidia.com",
  "https://pay.thebigidia.com",
  "https://thebigidia.com",
]);

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
  } catch {
    return false;
  }
}

export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin! : "https://hub.thebigidia.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export type CallerKind = "service" | "internal" | "privileged_user" | "user";
export interface Caller {
  kind: CallerKind;
  userId?: string;
}

/**
 * Resolves who is calling. Returns null when the caller is not authorized at all.
 * - service: bearer equals the service-role key
 * - internal: x-internal-secret equals INTERNAL_WEBHOOK_SECRET
 * - privileged_user: signed-in user with super_admin or security_operator role
 * - user: any other signed-in user (only returned when allowPlainUsers is true)
 */
export async function resolveCaller(
  req: Request,
  scope: string,
  opts: { allowPlainUsers?: boolean } = {},
): Promise<Caller | null> {
  console.log(`[${scope}][AUTH][STEP_START] resolving caller`);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const internalSecret = Deno.env.get("INTERNAL_WEBHOOK_SECRET") ?? "";
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();

  if (serviceKey && token === serviceKey) {
    console.log(`[${scope}][AUTH][STEP_END] caller=service`);
    return { kind: "service" };
  }
  const providedSecret = req.headers.get("x-internal-secret") ?? "";
  if (internalSecret && providedSecret === internalSecret) {
    console.log(`[${scope}][AUTH][STEP_END] caller=internal`);
    return { kind: "internal" };
  }
  if (!token) {
    console.log(`[${scope}][AUTH][STEP_END] no token — rejected`);
    return null;
  }

  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    console.log(`[${scope}][AUTH.getUser][STEP_START]`);
    const { data, error } = await admin.auth.getUser(token);
    console.log(`[${scope}][AUTH.getUser][STEP_END] ok=${!error && !!data?.user}`);
    if (error || !data?.user) return null;
    const userId = data.user.id;

    console.log(`[${scope}][AUTH.roles][STEP_START]`);
    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["super_admin", "security_operator"]);
    console.log(`[${scope}][AUTH.roles][STEP_END] count=${roles?.length ?? 0}`);
    if (rolesErr) console.error(`[${scope}][AUTH.roles][ERROR]`, rolesErr);

    if (roles && roles.length > 0) {
      console.log(`[${scope}][AUTH][STEP_END] caller=privileged_user`);
      return { kind: "privileged_user", userId };
    }
    if (opts.allowPlainUsers) {
      console.log(`[${scope}][AUTH][STEP_END] caller=user`);
      return { kind: "user", userId };
    }
    console.log(`[${scope}][AUTH][STEP_END] signed-in user lacks role — rejected`);
    return null;
  } catch (err) {
    console.error(`[${scope}][AUTH][ERROR]`, err);
    return null;
  }
}

export function denied(req: Request, status = 403) {
  return new Response(JSON.stringify({ error: status === 401 ? "Not authenticated." : "Not authorized." }), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}

export function genericError(req: Request, status = 500) {
  return new Response(JSON.stringify({ error: "Request could not be completed." }), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}
