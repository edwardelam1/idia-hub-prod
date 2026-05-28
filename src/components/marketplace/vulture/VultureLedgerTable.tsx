import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useVultureLedger } from "@/hooks/useVultureLedger";

const statusVariant = (s: string) => {
  if (s === "success") return "bg-green-100 text-green-800 border-green-300";
  if (s === "failed") return "bg-red-100 text-red-800 border-red-300";
  return "bg-amber-100 text-amber-800 border-amber-300";
};

export default function VultureLedgerTable() {
  const { rows, loading, error } = useVultureLedger();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Provenance Ledger</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading ledger…
          </div>
        ) : error ? (
          <p className="p-4 text-sm text-red-600 font-mono">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No ingestion events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Records</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Original Hash</th>
                  <th className="px-3 py-2">Sanitized Hash</th>
                  <th className="px-3 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-mono truncate max-w-[200px]" title={r.original_file_name}>
                      {r.original_file_name}
                    </td>
                    <td className="px-3 py-2">{r.record_count ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={statusVariant(r.status)}>
                        {r.status}
                      </Badge>
                      {r.error_message && (
                        <div className="text-[10px] text-red-600 mt-1 max-w-[200px] truncate" title={r.error_message}>
                          {r.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px]">{r.original_hash?.slice(0, 12) ?? "—"}…</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{r.sanitized_hash?.slice(0, 12) ?? "—"}…</td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}