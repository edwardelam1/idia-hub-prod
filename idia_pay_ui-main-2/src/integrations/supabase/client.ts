import { createClient } from "@supabase/supabase-js";

// Granular Logging: Initialization Sequence Start
console.log("[IDIA_PAY_SHELL] [SUPABASE_CLIENT] START: Fetching environment variables...");

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation Check
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[IDIA_PAY_SHELL] [SUPABASE_CLIENT] FATAL: Missing Supabase credentials. Execution halted.");
}

console.log("[IDIA_PAY_SHELL] [SUPABASE_CLIENT] PROCEED: Initializing production-grade client...");

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage, // Explicitly target window for the worker-isolated environment
    persistSession: true, // Fix: Correctly nested within the options object
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Granular Error Handling & Verification
 * We wrap the initial connection check to ensure we aren't stalling silently.
 */
const verifyConnection = async () => {
  console.log("[IDIA_PAY_SHELL] [SUPABASE_CLIENT] START: Verifying database handshake...");
  try {
    const { data, error } = await supabase.from("processed_operator_telemetry").select("count").limit(1);

    if (error) {
      console.warn(
        `[IDIA_PAY_SHELL] [SUPABASE_CLIENT] HANDSHAKE_WARNING: ${error.message} (This is expected if the table is still populating)`,
      );
    } else {
      console.log("[IDIA_PAY_SHELL] [SUPABASE_CLIENT] SUCCESS: Handshake verified. Beacon channel open.");
    }
  } catch (err) {
    console.error(
      `[IDIA_PAY_SHELL] [SUPABASE_CLIENT] HANDSHAKE_ERROR: ${err instanceof Error ? err.message : "Unknown network failure"}`,
    );
  }
  console.log("[IDIA_PAY_SHELL] [SUPABASE_CLIENT] END: Handshake verification process complete.");
};

// Execute non-blocking verification
verifyConnection();

console.log("[IDIA_PAY_SHELL] [SUPABASE_CLIENT] END: Client initialization exported.");
