import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VultureLedgerRow {
  id: string;
  original_file_name: string;
  bucket_path: string | null;
  record_count: number | null;
  action: string;
  status: string;
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
      console.info("[BEGIN: VultureUI.LedgerFetch]");
      try {
        const { data, error } = await supabase
          .from("vulture_provenance_ledger" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        if (!cancelled) setRows((data as any) ?? []);
        console.info("[END: VultureUI.LedgerFetch]", { count: data?.length ?? 0 });
      } catch (e: any) {
        console.error("[BEGIN: VultureUI.LedgerFetch.Stall]", e);
        if (!cancelled) setError(e.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRows();

    console.info("[BEGIN: VultureUI.RealtimeSubscribe]");
    const channel = supabase
      .channel("vulture_provenance_ledger_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vulture_provenance_ledger" },
        (payload) => {
          console.info("[BEGIN: VultureUI.RealtimeInsert]", payload.new);
          setRows((prev) => [payload.new as VultureLedgerRow, ...prev].slice(0, 100));
          console.info("[END: VultureUI.RealtimeInsert]");
        }
      )
      .subscribe();
    console.info("[END: VultureUI.RealtimeSubscribe]");

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { rows, loading, error };
}