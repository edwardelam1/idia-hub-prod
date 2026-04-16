import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// PRODUCTION CREDENTIALS
const SUPABASE_URL = "https://zxyngqciipcvveigrzqt.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eW5ncWNpaXBjdnZlaWdyenF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjIwNzYsImV4cCI6MjA2Njg5ODA3Nn0.w-fUxBsH8wZ5ewzQkGAO6sEooqPEYbYJI_vL5F36HSU";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
      apikey: SUPABASE_ANON_KEY,
    },
  },
});
