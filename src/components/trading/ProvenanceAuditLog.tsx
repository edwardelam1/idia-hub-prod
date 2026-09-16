import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Button } from "@/components/ui/button";

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
  const [searchParams] = useSearchParams();
  const receiptId = searchParams.get("receipt");
  const linkedSearch = searchParams.get("search");

  useEffect(() => {
    if (linkedSearch) setSearchTerm(linkedSearch);
  }, [linkedSearch]);

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
    queryKey: ["provenance-logs", userId, receiptId],
    queryFn: async () => {
      console.info("[PHASE_START: EgressLogs.Query] Loading user receipts.");
      let query = supabase
        .from("egress_logs")
        .select(
          "id, created_at, liability_token_hash, aca_record_references, country_of_origin, digiramp_anchor_id, egress_type, client_id, synapse_ledger_entry_id",
        )
        .order("created_at", { ascending: false });
      query = receiptId ? query.eq("id", receiptId).limit(1) : query.limit(500);
      const { data, error } = await query;

      if (error) {
        console.error(`[PHASE_END: EgressLogs.Query] Failed: ${error.message}\n${error.stack ?? ""}`);
        throw error;
      }
      console.info(`[PHASE_END: EgressLogs.Query] rows=${data?.length ?? 0}`);
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
      console.info("[PHASE_START: EgressLogs.LedgerQuery] Resolving credit costs.");
      const { data, error } = await supabase
        .from("synapse_credit_ledger")
        .select("id, amount")
        .in("id", ledgerIds);
      if (error) {
        console.error(`[PHASE_END: EgressLogs.LedgerQuery] Failed: ${error.message}\n${error.stack ?? ""}`);
        throw error;
      }
      const m = new Map<string, number>();
      (data || []).forEach((r: any) => m.set(r.id, Number(r.amount ?? 0)));
      console.info(`[PHASE_END: EgressLogs.LedgerQuery] rows=${data?.length ?? 0}`);
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

  const handleCopy = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
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
      <div className="flex min-h-48 w-full flex-col items-center justify-center border-y border-border p-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-mono text-sm">Synchronizing with DigiRAMP Ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex w-full items-start border-y border-destructive/50 bg-destructive/10 p-3">
        <AlertCircle className="w-5 h-5 text-destructive mr-3 flex-shrink-0 mt-0.5" />
        <p className="text-destructive text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <main className="space-y-2 px-0 py-2 sm:p-6">
      <div className="flex flex-col gap-2 border-y border-border bg-card px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:rounded-md sm:border sm:p-3">
        <div className="relative w-full md:w-96 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search hashes and anchors"
            className="h-9 w-full pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <div className="flex min-w-0 items-center gap-1">
            <Filter className="hidden h-4 w-4 text-muted-foreground sm:block" />
            <Select value={egressFilter} onValueChange={setEgressFilter}>
              <SelectTrigger className="h-9 w-full sm:w-[160px]">
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

          <div className="flex min-w-0 items-center gap-1">
            <ArrowUpDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "desc" | "asc")}>
              <SelectTrigger className="h-9 w-full sm:w-[140px]">
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

      <section className="w-full overflow-hidden border-y border-border bg-card sm:rounded-md sm:border">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-2 py-2 sm:px-4 sm:py-3">
          <div>
            <h1 className="flex items-center gap-2 text-base font-semibold text-foreground sm:text-xl">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Provenance Audit Logs
            </h1>
            <p className="hidden text-sm text-muted-foreground sm:block">
              Immutable cryptographic receipts for all Liability Shield protocol transfers.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span className="font-mono">
              Showing {filteredAndSortedLogs.length} of {logs.length}
            </span>
          </div>
        </div>

        <div className="divide-y divide-border md:hidden">
          {filteredAndSortedLogs.length === 0 ? (
            <p className="px-3 py-12 text-center text-sm text-muted-foreground">
              {searchTerm ? "No records found matching your search." : "No Liability Shield transfers recorded yet."}
            </p>
          ) : filteredAndSortedLogs.map((log, index) => {
            const acaJoined = (log.aca_record_references || []).join(", ");
            const spendRaw = log.synapse_ledger_entry_id ? spendMap.get(log.synapse_ledger_entry_id) : undefined;
            const spend = typeof spendRaw === "number" ? Math.abs(spendRaw) : null;
            const fields = [
              { label: "Liability token", value: log.liability_token_hash },
              { label: "ACA references", value: acaJoined },
              { label: "DigiRAMP anchor", value: log.digiramp_anchor_id },
            ];
            return (
              <article
                key={log.id}
                id={`receipt-${log.id}`}
                className={`px-2 py-2.5 ${index % 2 ? "bg-muted/20" : "bg-background"} ${receiptId === log.id ? "border-l-2 border-primary bg-primary/5" : ""}`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                    <p className="break-words text-xs font-semibold">{log.egress_type || "Standard"}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-semibold text-primary">
                    {spend !== null ? `${spend.toFixed(2)} CR` : "—"}
                  </span>
                </div>
                <dl className="space-y-1.5">
                  {fields.map((field) => (
                    <div key={field.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.25rem] items-center gap-1">
                      <dt className="text-[10px] font-medium uppercase text-muted-foreground">{field.label}</dt>
                      <dd className="min-w-0 break-all font-mono text-[10px] leading-4">{truncateHash(field.value)}</dd>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        disabled={!field.value}
                        aria-label={`Copy ${field.label}`}
                        onClick={() => handleCopy(field.value)}
                      >
                        {copiedHash === field.value ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
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
                    <TableRow key={log.id} className={receiptId === log.id ? "bg-primary/5" : undefined}>
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
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-8 w-8"
                             aria-label="Copy Liability Shield token"
                            onClick={() => handleCopy(log.liability_token_hash)}
                          >
                            {copiedHash === log.liability_token_hash ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                           </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground bg-muted px-2 py-1 rounded text-xs">
                            {truncateHash(acaJoined)}
                          </span>
                          {acaJoined && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Copy ACA references"
                              onClick={() => handleCopy(acaJoined)}
                            >
                              {copiedHash === acaJoined ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground text-xs">
                            {truncateHash(log.digiramp_anchor_id)}
                          </span>
                          {log.digiramp_anchor_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Copy DigiRAMP anchor"
                              onClick={() => handleCopy(log.digiramp_anchor_id)}
                            >
                              {copiedHash === log.digiramp_anchor_id ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
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
      </section>
    </main>
  );
};

export default ProvenanceAuditLog;
