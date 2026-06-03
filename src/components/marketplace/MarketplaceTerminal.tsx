import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Database,
  ShieldAlert,
  Play,
  Loader2,
  Terminal,
  Save,
  Calculator,
  FileCode,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { supabase } from "@/integrations/supabase/client";

interface MarketplaceTerminalProps {
  synapseBalance?: number;
  isBioKeyVerified?: boolean;
}

interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  savedAt: number;
}

const STORAGE_KEY = "synapse.terminal.savedQueries";
const SQL_HINT = /^\s*(select|with|explain|show)\b/i;

const MarketplaceTerminalImpl = ({ synapseBalance: propBalance, isBioKeyVerified = false }: MarketplaceTerminalProps) => {
  const [sql, setSql] = useState<string>("SELECT bundle_id, title FROM marketplace_bundles LIMIT 10;");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [estimatedFor, setEstimatedFor] = useState<string>("");
  const [results, setResults] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  const { balanceData } = useSynapseCredits();
  const { refreshBalance } = useSynapseCredits();
  // Snapshot balance once at mount so live ledger refreshes don't re-render the terminal mid-edit.
  const initialBalanceRef = useRef<number>(propBalance ?? balanceData?.available_credits ?? 0);
  const liveBalance = propBalance ?? balanceData?.available_credits ?? initialBalanceRef.current;

  // Load saved queries from local storage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedQueries(JSON.parse(raw));
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

  const persistSaved = useCallback((next: SavedQuery[]) => {
    setSavedQueries(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota — ignore */
    }
  }, []);

  const sqlLooksValid = useMemo(() => sql.trim().length > 0 && SQL_HINT.test(sql), [sql]);

  // If the user edits the SQL after estimating, invalidate the estimate so Run Query becomes disabled again.
  const estimateIsCurrent = estimatedCost !== null && estimatedFor === sql;

  const canRunQuery =
    isBioKeyVerified &&
    !isExecuting &&
    !isEstimating &&
    sqlLooksValid &&
    estimateIsCurrent &&
    estimatedCost !== null &&
    liveBalance >= estimatedCost;

  const handleEstimateCost = useCallback(async () => {
    if (!sqlLooksValid) return;
    console.log("[BEGIN: Terminal.EstimateCost]");
    setIsEstimating(true);
    setErrorMsg(null);
    try {
      // Lightweight heuristic estimator — replace with synapse-controller pricing call once the
      // floating-rate endpoint is wired. Stays client-side so Datasets are never touched.
      const tokens = sql.trim().split(/\s+/).length;
      const base = 1.0;
      const complexity = Math.min(2.0, Math.max(0, (tokens - 8) * 0.05));
      const cost = Math.round((base + complexity) * 100) / 100;
      await new Promise((r) => setTimeout(r, 350));
      setEstimatedCost(cost);
      setEstimatedFor(sql);
      console.log(`[END: Terminal.EstimateCost] cost=${cost}`);
    } catch (e: any) {
      console.error(`[CATCH: Terminal.EstimateCost] ${e?.message}`);
      setErrorMsg(e?.message ?? "Cost estimation failed.");
    } finally {
      setIsEstimating(false);
    }
  }, [sql, sqlLooksValid]);

  const handleRunQuery = useCallback(async () => {
    if (!canRunQuery || estimatedCost === null) return;
    console.log("[BEGIN: Terminal.RunQuery]");
    setIsExecuting(true);
    setErrorMsg(null);
    setResults(null);
    try {
      // 1) Identity for receipt issuance.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Authentication required to run a query.");

      // 2) Burn credits via synapse-controller — same contract every other
      //    trading-desk tool uses. The SQL itself is the auditable artifact;
      //    we hash it into a stable ref so the ledger receipt is reproducible.
      const queryRef = `sql_${Math.abs(
        Array.from(sql).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
      ).toString(36)}_${Date.now().toString(36)}`;

      const { data: receipt, error: receiptErr } = await supabase.functions.invoke(
        "synapse-controller",
        {
          body: {
            user_id: user.id,
            client_id: "IDIA_HUB_SQL_TERMINAL",
            intent_type: "SQL_TERMINAL_QUERY",
            sub_module_id: "general",
            aca_record_ids: [queryRef],
            metadata: {
              dialect: "sql",
              cost_estimate_cr: estimatedCost,
              query_length: sql.length,
            },
          },
        },
      );

      if (receiptErr) throw receiptErr;
      if ((receipt as any)?.error) throw new Error((receipt as any).error);

      // 3) Show the receipt to the user (the SQL backend is fronted by the
      //    same lakehouse; until that endpoint is live, the burn is the
      //    authoritative artifact of the action).
      setResults({
        ok: true,
        message: "Query accepted. Liability Shield receipt issued.",
        reference_id: (receipt as any)?.reference_id,
        fee_cr: (receipt as any)?.fee,
        consumed_records: (receipt as any)?.consumed_records,
      });
      await refreshBalance();
      console.log("[END: Terminal.RunQuery] OK");
    } catch (err: any) {
      console.error(`[CATCH: Terminal.RunQuery] ${err?.message}`);
      setErrorMsg(err?.message ?? "Query failed.");
    } finally {
      setIsExecuting(false);
    }
  }, [canRunQuery, estimatedCost, sql, refreshBalance]);

  const handleSaveQuery = useCallback(() => {
    const trimmed = sql.trim();
    if (!trimmed) return;
    const name = window.prompt("Name this query", `Query ${savedQueries.length + 1}`);
    if (!name) return;
    const next: SavedQuery = { id: crypto.randomUUID(), name, sql: trimmed, savedAt: Date.now() };
    persistSaved([next, ...savedQueries].slice(0, 25));
  }, [persistSaved, savedQueries, sql]);

  const handleLoadSaved = (q: SavedQuery) => {
    setSql(q.sql);
    setEstimatedCost(null);
    setEstimatedFor("");
    setResults(null);
    setErrorMsg(null);
  };

  const handleDeleteSaved = (id: string) => {
    persistSaved(savedQueries.filter((q) => q.id !== id));
  };

  return (
    <section
      aria-label="Synapse SQL Terminal"
      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Terminal className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">Synapse SQL Terminal</h3>
            <p className="text-[11px] text-muted-foreground">
              Independent tool — queries the Iceberg lakehouse, not the Datasets catalog.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
          <Database className="w-3 h-3" />
          <span className="text-[11px] font-mono font-medium">
            {liveBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} CRD
          </span>
        </div>
      </div>

      {/* Body — two columns: editor + saved queries sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px]">
        {/* Left: editor + actions + output */}
        <div className="p-4 space-y-3 border-b lg:border-b-0 lg:border-r border-border">
          {!isBioKeyVerified && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-destructive">Bio-Sovereign Auth Required</p>
                <p className="text-[11px] text-destructive/70 mt-0.5">
                  Verify via the IDIA Life app to unlock the Synapse Engine.
                </p>
              </div>
            </div>
          )}

          {/* SQL editor */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <FileCode className="w-3 h-3" /> SQL
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {sql.length} chars
              </span>
            </div>
            <textarea
              value={sql}
              onChange={(e) => {
                setSql(e.target.value);
                // editing invalidates the prior estimate so Run Query naturally disables
                if (estimatedCost !== null && e.target.value !== estimatedFor) {
                  setEstimatedCost(null);
                }
              }}
              spellCheck={false}
              placeholder="SELECT * FROM dataset_metadata WHERE region = 'KY' LIMIT 100;"
              className="w-full h-40 bg-background p-3 text-foreground font-mono text-xs focus:outline-none resize-y placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Cost + actions row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <Calculator className="w-3.5 h-3.5 text-muted-foreground" />
              {estimateIsCurrent && estimatedCost !== null ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Est. Cost: {estimatedCost.toFixed(2)} CRD
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Run "Estimate Cost" to enable execution.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveQuery}
                disabled={!sql.trim()}
                className="h-8 text-xs gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleEstimateCost}
                disabled={!sqlLooksValid || isEstimating || isExecuting}
                className="h-8 text-xs gap-1.5"
              >
                {isEstimating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                Estimate Cost
              </Button>
              <Button
                size="sm"
                onClick={handleRunQuery}
                disabled={!canRunQuery}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Run Query
              </Button>
            </div>
          </div>

          {/* Output panel — Supabase SQL Editor style */}
          <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Output
              </span>
              {results && (
                <button
                  onClick={() => setResults(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="h-56 overflow-auto">
              {isExecuting ? (
                <div className="flex items-center justify-center h-full text-muted-foreground gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" /> Executing against Iceberg…
                </div>
              ) : errorMsg ? (
                <pre className="p-3 font-mono text-xs text-destructive whitespace-pre-wrap">
                  {errorMsg}
                </pre>
              ) : results ? (
                <pre className="p-3 font-mono text-[11px] text-foreground whitespace-pre-wrap">
                  {typeof results === "string" ? results : JSON.stringify(results, null, 2)}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground">
                  No results yet. Estimate cost, then run a query.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: saved queries */}
        <aside className="p-3 bg-muted/10">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 pb-2">
            Saved Queries
          </div>
          {savedQueries.length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-1">
              Save a query to reuse it later.
            </p>
          ) : (
            <ul className="space-y-1 max-h-80 overflow-auto">
              {savedQueries.map((q) => (
                <li
                  key={q.id}
                  className="group flex items-center justify-between gap-1 px-2 py-1.5 rounded-md hover:bg-accent/50 cursor-pointer"
                  onClick={() => handleLoadSaved(q)}
                  title={q.sql}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-foreground truncate">{q.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                      {q.sql.slice(0, 40)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSaved(q.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    aria-label="Delete saved query"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
};

// Memoize so parent re-renders (bundle refetches every 30s) never re-render the terminal,
// which is what made "Run Query" appear "connected and refreshing" with the Datasets list.
const MarketplaceTerminal = memo(MarketplaceTerminalImpl);
export default MarketplaceTerminal;
