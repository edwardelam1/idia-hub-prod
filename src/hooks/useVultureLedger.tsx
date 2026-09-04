import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VultureLedgerRow {
  id: string;
  original_file_name: string;
  bucket_path: string | null;
  record_count: number | null;
  action: string;
  status: "processing" | "success" | "failed" | string;
  error_message: string | null;
  original_hash: string | null;
  sanitized_hash: string | null;
  manifest_path: string | null;
  created_at: string;
}

export function useVultureLedger() {
  const [rows, setRows] = useState<VultureLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchRows = async () => {
      console.info("[BEGIN: VultureUI.MeshLedgerFetch] Initiating REST request for historical mesh provenance ledger.");
      try {
        const { data, error: fetchError } = await supabase
          .from("vulture_provenance_ledger" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (fetchError) {
          console.error("[ERROR: VultureUI.MeshLedgerFetch] Database query rejected.");
          throw fetchError;
        }

        if (!cancelled) {
          console.info("[BEGIN: VultureUI.MeshLedgerStateUpdate] Hydrating UI state with historical ledger data.");
          setRows((data as any) ?? []);
          console.info("[END: VultureUI.MeshLedgerStateUpdate] UI state hydration complete.");
        }

        console.info(`[END: VultureUI.MeshLedgerFetch] Historical fetch resolved. Row count: ${data?.length ?? 0}`);
      } catch (e: any) {
        console.error(
          `[BEGIN: VultureUI.MeshLedgerFetch.Stall] Critical failure retrieving ledger history. Exception: ${e.message ?? String(e)}`,
        );
        if (!cancelled) setError(e.message ?? String(e));
        console.info("[END: VultureUI.MeshLedgerFetch.Stall] Error state committed to UI.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRows();

    console.info(
      "[BEGIN: VultureUI.RealtimeSubscribe] Establishing WebSocket connection for real-time ledger mutations.",
    );
    const channel = supabase
      .channel("vulture_provenance_ledger_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "vulture_provenance_ledger" }, (payload) => {
        console.info(
          `[BEGIN: VultureUI.RealtimeEvent] Detected ${payload.eventType} operation from mesh network backend.`,
        );

        if (payload.eventType === "INSERT") {
          console.info("[PROCESS: VultureUI.RealtimeEvent] Appending new ledger row to active memory.");
          setRows((prev) => [payload.new as VultureLedgerRow, ...prev].slice(0, 100));
        } else if (payload.eventType === "UPDATE") {
          console.info(`[PROCESS: VultureUI.RealtimeEvent] Updating existing ledger row ID: ${payload.new.id}.`);
          setRows((prev) => prev.map((row) => (row.id === payload.new.id ? (payload.new as VultureLedgerRow) : row)));
        } else if (payload.eventType === "DELETE") {
          console.info(`[PROCESS: VultureUI.RealtimeEvent] Removing deleted ledger row ID: ${payload.old.id}.`);
          setRows((prev) => prev.filter((row) => row.id !== payload.old.id));
        }

        console.info("[END: VultureUI.RealtimeEvent] Ledger UI state synchronized successfully.");
      })
      .subscribe((status, err) => {
        console.info(`[PROCESS: VultureUI.RealtimeSubscribe] Channel status update: ${status}`);
        if (err) {
          console.error(
            `[ERROR: VultureUI.RealtimeSubscribe] Subscription channel rejected. Exception: ${err.message ?? String(err)}`,
          );
        }
      });
    console.info("[END: VultureUI.RealtimeSubscribe] WebSocket listener bound.");

    return () => {
      console.info("[BEGIN: VultureUI.Cleanup] Teardown triggered. Severing real-time ledger subscription.");
      cancelled = true;
      supabase.removeChannel(channel);
      console.info("[END: VultureUI.Cleanup] Teardown sequence resolved.");
    };
  }, []);

  return { rows, loading, error };
}
