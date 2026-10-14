import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an edge function that requires a signed-in user.
 * Waits for the session to hydrate and sends the user's access token explicitly,
 * so the call never falls back to the publishable key (which the function rejects).
 */
let refreshing: Promise<string | undefined> | null = null;

async function getToken(): Promise<string | undefined> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch (e) {
    console.warn("[invokeWithSession] getSession failed", e);
  }
  // Share one refresh across concurrent callers so they never contend for the auth lock.
  refreshing ??= supabase.auth.refreshSession()
    .then(({ data }) => data.session?.access_token)
    .catch((e) => { console.warn("[invokeWithSession] refresh failed", e); return undefined; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function invokeWithSession<T = any>(fn: string, body: Record<string, unknown>) {
  const token = await getToken();
  if (!token) {
    return { data: null as T | null, error: new Error("Your session has expired. Please sign in again.") };
  }
  return supabase.functions.invoke<T>(fn, {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
}
