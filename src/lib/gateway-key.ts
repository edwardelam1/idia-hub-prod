import { supabase } from "@/integrations/supabase/client";

/**
 * Public gateway key external integrations send as `Authorization: Bearer …`.
 * Uses the same publishable key the running app's backend client uses, so integration
 * docs never show a retired key; falls back to the build environment value.
 */
export function getGatewayKey(): string {
  const clientKey = (supabase as unknown as { supabaseKey?: string }).supabaseKey;
  return (
    clientKey ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    "<your_publishable_key>"
  );
}
