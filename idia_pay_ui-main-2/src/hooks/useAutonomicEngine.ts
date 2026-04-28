import { useEffect } from "react";
import { useSpatialStore, type GearState } from "@/store/useSpatialStore";
import { supabase } from "@/integrations/supabase/client";

/**
 * Initializes the telemetry Web Worker on mount and orchestrates the
 * Sovereign Bio-Key handshake to bypass RLS. Commits gear/multiplier
 * updates directly into Zustand via `getState()`.
 */
export function useAutonomicEngine() {
  useEffect(() => {
    console.info("[BEGIN: AutonomicEngine.Mount] Initializing autonomic orchestration layer.");
    let worker: Worker | null = null;

    // 1. Worker Lifecycle: Spawn
    console.info("[BEGIN: Worker.Spawn] Resolving module URL and initializing thread.");
    try {
      worker = new Worker(new URL("../workers/telemetry.worker.ts", import.meta.url), { type: "module" });
      console.info("[END: Worker.Spawn] Isolated thread active.");
    } catch (err) {
      console.error("[CRITICAL FAILURE: Worker.Spawn] Offset: useAutonomicEngine | Reason:", err);
      return;
    }

    // 2. Sovereign Auth Handshake: Syncing JWT to Worker
    const syncSession = async () => {
      console.info("[BEGIN: Auth.SyncSession] Attempting to retrieve active operator session.");
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(`[CRITICAL FAILURE: Auth.SyncSession] Offset: Handshake | Reason: ${error.message}`);
          return;
        }

        if (session?.access_token && worker) {
          console.info("[BEGIN: Worker.PostMessage(SET_SESSION)] Transferring token to worker memory.");
          worker.postMessage({
            type: "SET_SESSION",
            token: session.access_token,
          });
          console.info("[END: Worker.PostMessage(SET_SESSION)] Token handoff complete.");
        } else {
          console.warn("[WARNING: Auth.SyncSession] No active session found. Worker in dormant state.");
        }
      } catch (err) {
        console.error("[CRITICAL FAILURE: Auth.SyncSession] Unexpected execution stall during fetch.", err);
      }
      console.info("[END: Auth.SyncSession]");
    };

    // 3. Telemetry Event Parser
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== "TELEMETRY_COMPILED") return;

      console.info(`[BEGIN: UI_MUTATION_SYNC] Vector: ${data.activeGear} | Multiplier: ${data.targetMultiplier}`);

      const gear = data.activeGear as GearState;
      const mult = Number(data.targetMultiplier);

      if (Number.isFinite(mult)) {
        // Atomic commit - direct to store to avoid React reconciliation overhead
        useSpatialStore.getState().setGearState(gear, mult);
      } else {
        console.error(`[ERROR: UI_MUTATION_SYNC] Invalid multiplier received: ${data.targetMultiplier}`);
      }

      console.info("[END: UI_MUTATION_SYNC]");
    };

    // Initialize Event Listeners & Auth Loop
    worker.addEventListener("message", onMessage);
    syncSession();

    console.info("[END: AutonomicEngine.Mount] Engine established and listening for flares.");

    // 4. Teardown: Clean Closure
    return () => {
      console.info("[BEGIN: AutonomicEngine.Unmount] Commencing worker termination sequence.");
      try {
        if (worker) {
          worker.postMessage({ type: "DISPOSE" });
          worker.removeEventListener("message", onMessage);
          worker.terminate();
          console.info("[END: AutonomicEngine.Unmount] Worker thread successfully disposed.");
        }
      } catch (err) {
        console.error("[CRITICAL FAILURE: AutonomicEngine.Unmount] Error during thread cleanup.", err);
      }
    };
  }, []);
}
