import { createClient } from "@supabase/supabase-js";
import { processLock } from "@supabase/auth-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";

// PRODUCTION CREDENTIALS — new sb_publishable key system
const SUPABASE_URL = "https://zxyngqciipcvveigrzqt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_L_foF7A1ds9WBnsVnvcNVA_JYrRwm8B";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // In-tab queue instead of the browser-wide lock: concurrent session reads
    // wait their turn rather than "stealing" the lock and rejecting.
    lock: processLock,
  },
  global: {
    // 🎯 THE PERMANENT FIX: This header is MANDATORY for Supabase Gateway clearance.
    // By placing it here, EVERY .invoke() call will automatically pass the 401 check.
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
  },
});
