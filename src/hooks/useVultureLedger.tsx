import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VultureLedgerRow {
  id: string;
  kind: "ledger" | "quarantine";
  node_id: string | null;
  source: string;
  original_file_name: string | null;
  record_count: number | null;
  status: string;
  error_message: string | null;
  raw_hash: string | null;
  sanitized_hash: string | null;
  tx_hash: string | null;
  cjis_isolated: boolean;
  created_at: string;
}

const fromLedger = (r: any): VultureLedgerRow => ({
  id: r.id, kind: "ledger", node_id: r.node_id, source: r.source, original_file_name: r.original_file_name,
  record_count: r.record_count, status: r.status, error_message: null, raw_hash: r.raw_hash,
  sanitized_hash: r.sanitized_hash, tx_hash: r.tx_hash, cjis_isolated: !!r.cjis_isolated, created_at: r.created_at,
});
const fromQuarantine = (r: any): VultureLedgerRow => ({
  id: r.id, kind: "quarantine", node_id: r.node_id, source: "mesh", original_file_name: null,
  record_count: null, status: "quarantined", error_message: r.reason_code, raw_hash: r.raw_hash,
  sanitized_hash: null, tx_hash: null, cjis_isolated: !!r.cjis_isolated, created_at: r.created_at,
});
const sortRows = (rows: VultureLedgerRow[]) =>
  [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);

/** Decrypts one record server-side (owner/C-suite + authenticator session; every read is audited). */
export async function readVulturePayload(kind: "ledger" | "quarantine", id: string) {
  console.info(`[BEGIN: VultureUI.PayloadRead] ${kind}`);
  const { data, error } = await (supabase as any).rpc("vulture_read_payload", { _kind: kind, _id: id });
  if (error) {
    console.error(`[ERROR: VultureUI.PayloadRead] ${error.message}`);
    throw error;
  }
  console.info("[END: VultureUI.PayloadRead]");
  return data as unknown;
}

/** Live view of the append-only vulture_ledger plus quarantined deliveries. No mock data. */
export function useVultureLedger() {
  const [rows, setRows] = useState<VultureLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      console.info("[BEGIN: VultureUI.LedgerFetch]");
      try {
        const [ledger, quarantine] = await Promise.all([
          (supabase as any).from("vulture_ledger")
            .select("id,node_id,source,original_file_name,record_count,status,raw_hash,sanitized_hash,tx_hash,cjis_isolated,created_at")
            .order("created_at", { ascending: false }).limit(100),
          (supabase as any).from("vulture_quarantine")
            .select("id,node_id,raw_hash,reason_code,cjis_isolated,created_at")
            .order("created_at", { ascending: false }).limit(50),
        ]);
        if (ledger.error) throw ledger.error;
        if (quarantine.error) throw quarantine.error;
        if (!cancelled) setRows(sortRows([...(ledger.data ?? []).map(fromLedger), ...(quarantine.data ?? []).map(fromQuarantine)]));
        console.info("[END: VultureUI.LedgerFetch]");
      } catch (e: any) {
        console.error(`[ERROR: VultureUI.LedgerFetch] ${e?.stack ?? e?.message ?? String(e)}`);
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();

    const channel = supabase
      .channel("vulture_ledger_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "vulture_ledger" }, (p: any) => {
        if (p.eventType === "INSERT") setRows((prev) => sortRows([fromLedger(p.new), ...prev]));
        else if (p.eventType === "UPDATE") setRows((prev) => prev.map((r) => (r.id === p.new.id ? fromLedger(p.new) : r)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vulture_quarantine" }, (p: any) => {
        setRows((prev) => sortRows([fromQuarantine(p.new), ...prev]));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { rows, loading, error };
}
