import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an edge function that requires a signed-in user.
 * Waits for the session to hydrate and sends the user's access token explicitly,
 * so the call never falls back to the publishable key (which the function rejects).
 */
export async function invokeWithSession<T = any>(fn: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  let token = session?.access_token;
  if (!token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed.session?.access_token;
  }
  if (!token) {
    return { data: null as T | null, error: new Error("Your session has expired. Please sign in again.") };
  }
  return supabase.functions.invoke<T>(fn, {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
}
