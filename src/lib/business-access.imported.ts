import { supabase } from "@/integrations/supabase/client";

// Default business ID from the seeded database — used when running
// without authentication (full-access / demo profile).
const DEFAULT_BUSINESS_ID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * Attempts to get the current user's business ID.
 * 1. Tries the RPC (authenticated users).
 * 2. Tries querying the businesses table directly.
 * 3. Falls back to the seeded default business ID so the app
 *    always works in full-access mode without login.
 */
export async function getBusinessId(): Promise<string> {
  try {
    const { data: businessAccess, error: businessError } = await supabase
      .rpc('get_user_business_access');

    if (!businessError && businessAccess && businessAccess.length > 0) {
      return businessAccess[0].business_id;
    }
  } catch {
    // RPC failed, try fallback
  }

  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id')
      .limit(1)
      .single();

    if (!error && businesses) {
      return businesses.id;
    }
  } catch {
    // Query also failed
  }

  // Always return the seeded business so full-access mode works
  return DEFAULT_BUSINESS_ID;
}
