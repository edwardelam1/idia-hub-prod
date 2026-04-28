import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useReconnectionSyncer = () => {
  useEffect(() => {
    console.info("[BEGIN: ReconnectionSyncer.Init] Activating native sentinel.");

    const processOfflineQueue = () => {
      console.info("[BEGIN: ReconnectionSyncer.SyncProcess] Connectivity detected.");

      const request = indexedDB.open("IDIA_PAY_EDGE_BUS", 1);

      request.onsuccess = async () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("offline_events")) return;

        const tx = db.transaction("offline_events", "readwrite");
        const store = tx.objectStore("offline_events");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = async () => {
          const events = getAllRequest.result;
          if (events.length === 0) return;

          console.info(`[STATUS: Sync] Found ${events.length} queued events.`);

          for (const event of events) {
            console.info(`[BEGIN: EventSync.Push] Beacon: ${event.correlation_id}`);
            const { error } = await supabase.from("financial_event_log").insert([{ ...event, status: "COMPILED" }]);

            if (!error) {
              db.transaction("offline_events", "readwrite").objectStore("offline_events").delete(event.correlation_id);
              console.info(`[END: EventSync.Push] Anchored.`);
            } else {
              console.error(`[FAILURE: EventSync.Push] ${error.message}`);
              break;
            }
          }
        };
      };
    };

    window.addEventListener("online", processOfflineQueue);
    if (navigator.onLine) processOfflineQueue();

    return () => window.removeEventListener("online", processOfflineQueue);
  }, []);
};
