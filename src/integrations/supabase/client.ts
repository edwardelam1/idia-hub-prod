import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// PRODUCTION CREDENTIALS — new sb_publishable key system
const SUPABASE_URL = "https://zxyngqciipcvveigrzqt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_L_foF7A1ds9WBnsVnvcNVA_JYrRwm8B";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    // 🎯 THE PERMANENT FIX: This header is MANDATORY for Supabase Gateway clearance.
    // By placing it here, EVERY .invoke() call will automatically pass the 401 check.
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
  },
});
