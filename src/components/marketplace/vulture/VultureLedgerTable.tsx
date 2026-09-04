import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Fingerprint, ShieldCheck, AlertTriangle, Activity } from "lucide-react";
import { useVultureLedger } from "@/hooks/useVultureLedger";
import { SovereignWrapper } from "@/components/sovereign/SovereignWrapper";

const statusConfig = (status: string) => {
  switch (status) {
    case "success":
    case "committed":
      return {
        classes: "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
        icon: <ShieldCheck className="w-3 h-3 mr-1" />,
      };
    case "failed":
    case "rejected":
      return {
        classes: "bg-red-500/10 text-red-600 border-red-200/50",
        icon: <AlertTriangle className="w-3 h-3 mr-1" />,
      };
    case "processing":
    default:
      return {
        classes: "bg-blue-500/10 text-blue-600 border-blue-200/50",
        icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
      };
  }
};

export default function VultureLedgerTable() {
  console.info("[BEGIN: VultureUI.LedgerTableRender] Initializing Provenance Ledger Table.");
  const { rows, loading, error } = useVultureLedger();

  useEffect(() => {
    console.info(
      `[PROCESS: VultureUI.LedgerTableRender] Data state updated. Rows: ${rows.length}, Loading: ${loading}`,
    );
  }, [rows, loading]);

  return (
    <SovereignWrapper id="vulture.provenance.ledger">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F7] bg-white">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-[#007AFF]" />
          <h3 className="text-sm font-bold text-[#1D1D1F] uppercase tracking-widest">Immutable Provenance Ledger</h3>
        </div>
        <Badge variant="outline" className="bg-[#FBFBFD] text-[#86868B] border-[#E5E5EA] font-mono text-[10px]">
          {rows.length} EVENTS SYNCED
        </Badge>
      </div>

      <CardContent className="p-0 bg-[#FBFBFD]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#86868B]">
            <Activity className="h-6 w-6 animate-pulse mb-2 text-[#007AFF]" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Synchronizing Mesh Ledger...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-[11px] text-red-600 font-mono max-w-md">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 opacity-50">
            <Fingerprint className="h-8 w-8 text-[#D2D2D7] mb-2" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#86868B]">No Telemetry Events Logged</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F2F2F7]/50 border-b border-[#E5E5EA]">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-[#86868B] uppercase tracking-[0.15em]">
                    Edge Source
                  </th>
                  <th className="px-6 py-3 text-[10px] font-black text-[#86868B] uppercase tracking-[0.15em]">State</th>
                  <th className="px-6 py-3 text-[10px] font-black text-[#86868B] uppercase tracking-[0.15em]">
                    Raw Telemetry Hash
                  </th>
                  <th className="px-6 py-3 text-[10px] font-black text-[#86868B] uppercase tracking-[0.15em]">
                    On-Chain Hash
                  </th>
                  <th className="px-6 py-3 text-[10px] font-black text-[#86868B] uppercase tracking-[0.15em]">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA] bg-white">
                {rows.map((r) => {
                  const status = statusConfig(r.status);

                  return (
                    <tr key={r.id} className="hover:bg-[#FBFBFD] transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span
                            className="font-mono text-[11px] font-semibold text-[#1D1D1F] truncate max-w-[180px]"
                            title={r.original_file_name}
                          >
                            {r.original_file_name.replace(".bin", "").replace(".json", "")}
                          </span>
                          {r.record_count && (
                            <span className="text-[9px] text-[#86868B] uppercase mt-0.5">
                              VOL: {r.record_count} events
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[9px] uppercase px-2 py-0.5 ${status.classes}`}
                        >
                          <div className="flex items-center">
                            {status.icon}
                            {r.status}
                          </div>
                        </Badge>
                        {r.error_message && (
                          <div
                            className="text-[9px] text-red-500 mt-1 max-w-[150px] truncate font-mono"
                            title={r.error_message}
                          >
                            {r.error_message}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <code className="font-mono text-[11px] text-[#86868B] bg-[#F2F2F7] px-1.5 py-0.5 rounded">
                          {r.original_hash?.slice(0, 16) ?? "PENDING_HASH...."}
                        </code>
                      </td>
                      <td className="px-6 py-3">
                        <code className="font-mono text-[11px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                          {r.sanitized_hash?.slice(0, 16) ?? "PENDING_HASH...."}
                        </code>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[11px] text-[#86868B] font-medium">
                          {new Date(r.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </SovereignWrapper>
  );
}
