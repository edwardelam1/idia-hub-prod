import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Coins,
  Copy,
  Database,
  FileSearch,
  Loader2,
  ReceiptText,
  Search,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Source = "all" | "trading_desk" | "best_friend" | "marketplace";
type JsonRecord = Record<string, unknown>;

interface ActivityRow {
  id: string;
  source: Exclude<Source, "all">;
  action: string;
  title: string;
  input_payload: unknown;
  result_payload: unknown;
  status: string;
  records_consumed: number;
  synapse_credit_cost: number;
  egress_log_id: string | null;
  reference_id: string | null;
  created_at: string;
  legacy?: boolean;
}

interface SavedSql {
  id: string;
  name: string;
  sql: string;
  savedAt: number;
}

const PAGE_SIZE = 25;
const sourceMeta = {
  trading_desk: { label: "Trading Desk", icon: Database },
  best_friend: { label: "Best Friend AI", icon: Bot },
  marketplace: { label: "Marketplace", icon: ShoppingBag },
};

function sourceFromReceipt(clientId: string, type: string): ActivityRow["source"] {
  const signal = `${clientId} ${type}`.toUpperCase();
  if (signal.includes("BEST_FRIEND")) return "best_friend";
  if (signal.includes("MARKETPLACE") || signal.includes("PURCHASE")) return "marketplace";
  return "trading_desk";
}

function stringify(value: unknown) {
  if (value == null || (typeof value === "object" && Object.keys(value as JsonRecord).length === 0)) {
    return "Unavailable for activity recorded before history capture began.";
  }
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

const SavedActivityPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [source, setSource] = useState<Source>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["saved-activity", user?.user_id],
    enabled: Boolean(user?.user_id),
    queryFn: async () => {
      console.info("[PHASE_START: SavedActivity.Fetch] Loading activity and legacy receipts.");
      try {
        console.info("[PHASE_START: SavedActivity.ActivityQuery] Querying durable history.");
        const { data: activity, error: activityError } = await supabase
          .from("activity_history")
          .select("id, source, action, title, input_payload, result_payload, status, records_consumed, synapse_credit_cost, egress_log_id, reference_id, created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        if (activityError) throw activityError;
        console.info(`[PHASE_END: SavedActivity.ActivityQuery] rows=${activity?.length ?? 0}`);

        console.info("[PHASE_START: SavedActivity.EgressQuery] Querying older receipts.");
        const { data: egress, error: egressError } = await supabase
          .from("egress_logs")
          .select("id, created_at, egress_type, client_id, aca_record_references, synapse_ledger_entry_id, metadata")
          .order("created_at", { ascending: false })
          .limit(500);
        if (egressError) throw egressError;
        console.info(`[PHASE_END: SavedActivity.EgressQuery] rows=${egress?.length ?? 0}`);

        const linked = new Set((activity ?? []).map((row) => row.egress_log_id).filter(Boolean));
        const ledgerIds = (egress ?? [])
          .map((row) => row.synapse_ledger_entry_id)
          .filter((id): id is string => Boolean(id));
        const spend = new Map<string, number>();
        if (ledgerIds.length > 0) {
          console.info("[PHASE_START: SavedActivity.LedgerQuery] Resolving legacy costs.");
          const { data: ledger, error: ledgerError } = await supabase
            .from("synapse_credit_ledger")
            .select("id, amount, reference_id")
            .in("id", ledgerIds);
          if (ledgerError) throw ledgerError;
          (ledger ?? []).forEach((row) => spend.set(row.id, Math.abs(Number(row.amount ?? 0))));
          console.info(`[PHASE_END: SavedActivity.LedgerQuery] rows=${ledger?.length ?? 0}`);
        }

        const legacy: ActivityRow[] = (egress ?? [])
          .filter((row) => !linked.has(row.id))
          .map((row) => ({
            id: `legacy-${row.id}`,
            source: sourceFromReceipt(row.client_id ?? "", row.egress_type ?? ""),
            action: row.egress_type ?? "LIABILITY_SHIELD_RECEIPT",
            title: (row.metadata as JsonRecord | null)?.bundle_title?.toString() ?? (row.egress_type ?? "Liability Shield receipt").replaceAll("_", " "),
            input_payload: {},
            result_payload: { receipt_only: true },
            status: "completed",
            records_consumed: row.aca_record_references?.length ?? 0,
            synapse_credit_cost: row.synapse_ledger_entry_id ? spend.get(row.synapse_ledger_entry_id) ?? 0 : 0,
            egress_log_id: row.id,
            reference_id: null,
            created_at: row.created_at,
            legacy: true,
          }));

        let savedSql: SavedSql[] = [];
        try {
          savedSql = JSON.parse(localStorage.getItem("synapse.terminal.savedQueries") ?? "[]");
        } catch (storageError) {
          console.error(
            "[PHASE_END: SavedActivity.LocalSaved] Failed:",
            storageError instanceof Error ? `${storageError.message}\n${storageError.stack ?? ""}` : String(storageError),
          );
        }
        console.info("[PHASE_END: SavedActivity.Fetch] History ready.");
        return {
          rows: [...((activity ?? []) as ActivityRow[]), ...legacy].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
          savedSql,
        };
      } catch (fetchError) {
        console.error(
          "[PHASE_END: SavedActivity.Fetch] Failed:",
          fetchError instanceof Error ? `${fetchError.message}\n${fetchError.stack ?? ""}` : String(fetchError),
        );
        throw fetchError;
      }
    },
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.rows ?? []).filter((row) => {
      if (source !== "all" && row.source !== source) return false;
      return !needle || `${row.title} ${row.action} ${row.reference_id ?? ""}`.toLowerCase().includes(needle);
    });
  }, [data?.rows, search, source]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const copy = async (key: string, value: unknown) => {
    await navigator.clipboard.writeText(stringify(value));
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-3 sm:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
          <FileSearch className="h-5 w-5 text-primary" /> Saved Searches & Activity
        </h1>
        <p className="text-sm text-muted-foreground">Your reusable queries and paid data activity, matched to Liability Shield receipts.</p>
      </header>

      {(data?.savedSql.length ?? 0) > 0 && (
        <section className="border-y border-border py-3" aria-labelledby="saved-query-heading">
          <h2 id="saved-query-heading" className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Saved SQL queries</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {data?.savedSql.map((query) => (
              <div key={query.id} className="min-w-56 border-l-2 border-primary px-3 py-1">
                <p className="text-sm font-medium">{query.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{query.sql}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={source} onValueChange={(value) => { setSource(value as Source); setPage(1); }}>
          <TabsList className="grid h-auto w-full grid-cols-4 sm:w-auto">
            <TabsTrigger className="px-2 text-xs" value="all">All</TabsTrigger>
            <TabsTrigger className="px-2 text-xs" value="trading_desk">Trading</TabsTrigger>
            <TabsTrigger className="px-2 text-xs" value="best_friend">Best Friend</TabsTrigger>
            <TabsTrigger className="px-2 text-xs" value="marketplace">Marketplace</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-9 pl-8" placeholder="Search activity" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : error ? (
        <div className="border-l-2 border-destructive p-3 text-sm text-destructive">{(error as Error).message}</div>
      ) : visible.length === 0 ? (
        <div className="border-y border-border py-12 text-center text-sm text-muted-foreground">No matching activity yet.</div>
      ) : (
        <Accordion type="multiple" className="border-t border-border">
          {visible.map((row) => {
            const meta = sourceMeta[row.source];
            const Icon = meta.icon;
            return (
              <AccordionItem key={row.id} value={row.id} className="px-0">
                <AccordionTrigger className="gap-2 py-2.5 text-left hover:no-underline">
                  <div className="grid min-w-0 flex-1 grid-cols-[1.5rem_1fr_auto] items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.title}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                        <span>{meta.label}</span><span>{new Date(row.created_at).toLocaleString()}</span>
                        {row.legacy && <span>Receipt only</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pr-1 text-[11px] tabular-nums">
                      <span className="hidden items-center gap-1 sm:flex"><Database className="h-3 w-3" />{row.records_consumed}</span>
                      <span className="flex items-center gap-1 font-semibold text-primary"><Coins className="h-3 w-3" />{Number(row.synapse_credit_cost).toFixed(2)} CR</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-4 pl-6 pr-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{row.action.replaceAll("_", " ")}</Badge>
                    <Badge variant="outline">{row.status}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{row.records_consumed} records</span>
                    {row.egress_log_id && (
                      <Button size="sm" variant="outline" className="ml-auto h-8" onClick={() => navigate(`/egress-logs?receipt=${encodeURIComponent(row.egress_log_id ?? "")}`)}>
                        <ReceiptText className="h-4 w-4" /> Receipt
                      </Button>
                    )}
                  </div>
                  {(["Input", "Result"] as const).map((label) => {
                    const value = label === "Input" ? row.input_payload : row.result_payload;
                    const key = `${row.id}-${label}`;
                    return (
                      <section key={label} className="relative border-l border-border pl-3">
                        <div className="mb-1 flex items-center justify-between">
                          <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</h3>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Copy ${label.toLowerCase()}`} onClick={() => copy(key, value)}>
                            {copied === key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground">{stringify(value)}</pre>
                      </section>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {filtered.length > PAGE_SIZE && (
        <footer className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Page {page} of {pageCount}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </footer>
      )}
    </main>
  );
};

export default SavedActivityPage;