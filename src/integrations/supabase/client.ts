import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// These are the Bare Metal constants for your IDIA project
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
    // 🎯 CRITICAL: This ensures the apikey is physically attached
    // to every Edge Function call, clearing the 401 error.
    headers: {
      apikey: SUPABASE_ANON_KEY,
    },
  },
});
