import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Copy,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProvenanceLog {
  id: string;
  created_at: string;
  liability_token_hash: string;
  aca_record_references: string[];
  country_of_origin: string;
  digiramp_anchor_id: string;
  egress_type: string;
  client_id: string;
  user_id?: string;
  synapse_ledger_entry_id?: string | null;
}

const ProvenanceAuditLog = ({ clientId }: { clientId?: string }) => {
  const { user } = useAuth();
  const userId = user?.user_id;
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [egressFilter, setEgressFilter] = useState<string>("all");

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("egress-logs-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "egress_logs" }, (payload) => {
        queryClient.setQueryData<ProvenanceLog[]>(["provenance-logs", userId], (old = []) => {
          const newLog = payload.new as ProvenanceLog;
          if (newLog.user_id && newLog.user_id !== userId) return old;
          if (old.some((l) => l.id === newLog.id)) return old;
          return [newLog, ...old];
        });
        queryClient.invalidateQueries({ queryKey: ["provenance-logs", userId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const {
    data: logs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["provenance-logs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("egress_logs")
        .select(
          "id, created_at, liability_token_hash, aca_record_references, country_of_origin, digiramp_anchor_id, egress_type, client_id, synapse_ledger_entry_id",
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as ProvenanceLog[];
    },
    enabled: !!userId,
  });

  const ledgerIds = useMemo(
    () => Array.from(new Set(logs.map((l) => l.synapse_ledger_entry_id).filter(Boolean))) as string[],
    [logs],
  );

  const { data: spendMap = new Map<string, number>() } = useQuery({
    queryKey: ["egress-credit-spend", ledgerIds],
    enabled: ledgerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("synapse_credit_ledger")
        .select("id, amount")
        .in("id", ledgerIds);
      if (error) throw error;
      const m = new Map<string, number>();
      (data || []).forEach((r: any) => m.set(r.id, Number(r.amount ?? 0)));
      return m;
    },
  });

  const filteredAndSortedLogs = useMemo(() => {
    let result = [...logs];

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (log) =>
          (log.liability_token_hash && log.liability_token_hash.toLowerCase().includes(lowerSearch)) ||
          (log.digiramp_anchor_id && log.digiramp_anchor_id.toLowerCase().includes(lowerSearch)) ||
          (log.aca_record_references &&
            log.aca_record_references.some((ref) => ref.toLowerCase().includes(lowerSearch))),
      );
    }

    if (egressFilter !== "all") {
      result = result.filter((log) => log.egress_type === egressFilter);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [logs, searchTerm, sortOrder, egressFilter]);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const truncateHash = (hash: string) => {
    if (!hash || hash.length < 16) return hash || "—";
    return `${hash.substring(0, 8)}…${hash.substring(hash.length - 8)}`;
  };

  const uniqueEgressTypes = useMemo(() => {
    const types = new Set(logs.map((log) => log.egress_type).filter(Boolean));
    return Array.from(types);
  }, [logs]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border w-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-mono text-sm">Synchronizing with DigiRAMP Ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start p-4 bg-destructive/10 border border-destructive/50 rounded-xl w-full">
        <AlertCircle className="w-5 h-5 text-destructive mr-3 flex-shrink-0 mt-0.5" />
        <p className="text-destructive text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full md:w-96 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search ACA Hashes, DigiRAMP anchors..."
            className="pl-9 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={egressFilter} onValueChange={setEgressFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Egress Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueEgressTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "desc" | "asc")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-xl w-full overflow-hidden">
        <div className="bg-muted/50 p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              Provenance Audit Logs
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Immutable cryptographic receipts for all Liability Shield protocol transfers.
            </p>
          </div>
          <div className="bg-background px-4 py-2 rounded-lg border border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-mono text-sm">
              Showing {filteredAndSortedLogs.length} of {logs.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs uppercase tracking-wider">Egress Timestamp</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Liability Token Hash</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">ACA References</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">DigiRAMP Anchor</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Credits Spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    {searchTerm
                      ? "No records found matching your search."
                      : "No Liability Shield transfers recorded yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedLogs.map((log) => {
                  const acaJoined = (log.aca_record_references || []).join(", ");
                  const spendRaw = log.synapse_ledger_entry_id
                    ? spendMap.get(log.synapse_ledger_entry_id)
                    : undefined;
                  const spend = typeof spendRaw === "number" ? Math.abs(spendRaw) : null;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium px-2 py-1 bg-secondary rounded-md whitespace-nowrap">
                          {log.egress_type || "Standard"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-primary bg-primary/10 px-2 py-1 rounded text-xs">
                            {truncateHash(log.liability_token_hash)}
                          </span>
                          <button
                            onClick={() => handleCopy(log.liability_token_hash)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy Full Hash"
                          >
                            {copiedHash === log.liability_token_hash ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground bg-muted px-2 py-1 rounded text-xs">
                            {truncateHash(acaJoined)}
                          </span>
                          {acaJoined && (
                            <button
                              onClick={() => handleCopy(acaJoined)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {copiedHash === acaJoined ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground text-xs">
                            {truncateHash(log.digiramp_anchor_id)}
                          </span>
                          {log.digiramp_anchor_id && (
                            <button
                              onClick={() => handleCopy(log.digiramp_anchor_id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {copiedHash === log.digiramp_anchor_id ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {spend !== null ? (
                          <span className="font-mono text-primary bg-primary/10 px-2 py-1 rounded text-xs">
                            {spend.toFixed(2)} CR
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ProvenanceAuditLog;
