import { supabase } from "@/integrations/supabase/client";

// Updated to include all telemetry tags used in the Dashboard
export type FinancialEventType = 
  | "TENDER_INITIATED" 
  | "TENDER_FINALIZED" 
  | "ITEM_ADDED" 
  | "ITEM_VOIDED" 
  | "SHIFT_STARTED"
  | "SHIFT_ENDED"      // Added
  | "FEATURE_ACCESSED"; // Added

export const useEventPublisher = () => {
  
  const emitEvent = async (type: FinancialEventType, payload: any, correlationId: string) => {
    console.info(`[BEGIN: EventPublisher.Emit] Type: ${type} | Beacon: ${correlationId}`);
    
    const eventBody = {
      event_type: type,
      payload: payload,
      correlation_id: correlationId,
      created_at: new Date().toISOString(),
      status: "PENDING_ANCHOR"
    };

    try {
      if (navigator.onLine) {
        console.info("[BEGIN: EventPublisher.LivePush] Handshaking with live ledger.");
        const { error } = await supabase.from("financial_event_log").insert([eventBody]);
        if (error) throw error;
        console.info("[END: EventPublisher.LivePush] Success.");
      } else {
        console.warn("[WARNING: WAN_FAILURE] Pivoting to Native Edge Buffer.");
        await bufferEventLocally(eventBody);
      }
    } catch (err) {
      console.error(`[CRITICAL FAILURE: EventPublisher.Emit] Offset: Ledger | Reason: ${err}`);
      await bufferEventLocally(eventBody);
    } finally {
      console.info("[END: EventPublisher.Emit] Sequence finalized.");
    }
  };

  /**
   * NATIVE IndexedDB implementation to remove 'idb' dependency
   */
  const bufferEventLocally = (event: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.info("[BEGIN: EdgeResilience.NativeBuffer] Opening ObjectStore.");
      const request = indexedDB.open("IDIA_PAY_EDGE_BUS", 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore("offline_events", { keyPath: "correlation_id" });
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("offline_events", "readwrite");
        const store = tx.objectStore("offline_events");
        const addRequest = store.put({ ...event, status: "OFFLINE_QUEUED" });

        addRequest.onsuccess = () => {
          console.info(`[END: EdgeResilience.NativeBuffer] Success. Beacon: ${event.correlation_id}`);
          resolve();
        };
        addRequest.onerror = () => reject(addRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  };

  return { emitEvent };
};
