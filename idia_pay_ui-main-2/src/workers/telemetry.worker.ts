// 1. Single Import: Resolve the duplicate identifier error
import { createClient } from "@supabase/supabase-js";

console.log("[IDIA_PAY_WORKER] [INIT] START: Initializing Spatial Telemetry Worker...");

// 2. Thread-Isolated Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[IDIA_PAY_WORKER] [INIT] ERROR: Supabase credentials missing in worker context.");
}

// 3. Dedicated Worker Client
// We use a single instance to prevent memory leaks and duplicate socket connections
const supabaseWorkerClient = createClient(supabaseUrl, supabaseAnonKey);

console.log("[IDIA_PAY_WORKER] [SUBSCRIPTION] START: Establishing Realtime channel...");

// 4. The Realtime Execution Loop
supabaseWorkerClient
  .channel("spatial-telemetry-feed")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "processed_operator_telemetry",
      filter: "status=eq.COMPILED", // Catching the flare post-Synapse processing
    },
    (payload) => {
      console.log("[IDIA_PAY_WORKER] [BEACON_RECEIVED] Processing compiled spatial vector...");

      const { active_gear, target_multiplier, beacon_id } = payload.new;

      // Log the specific beacon for auditability
      console.log(
        `[IDIA_PAY_WORKER] [RELAY] Beacon: ${beacon_id} | Gear: ${active_gear} | Multiplier: ${target_multiplier}`,
      );

      // 5. Post to Main Thread (Zustand Store)
      // This triggers the GPU-accelerated AutonomicWrapper
      self.postMessage({
        activeGear: active_gear,
        targetMultiplier: target_multiplier,
      });

      console.log("[IDIA_PAY_WORKER] [RELAY] SUCCESS: Message posted to main thread.");
    },
  )
  .subscribe((status) => {
    console.log(`[IDIA_PAY_WORKER] [SUBSCRIPTION] STATUS: ${status}`);
  });

console.log("[IDIA_PAY_WORKER] [INIT] END: Worker is now listening for compiled telemetry.");
