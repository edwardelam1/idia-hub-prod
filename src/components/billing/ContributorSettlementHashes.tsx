import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Coins, DollarSign, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;
const basescanTxUrl = (hash: string) => `https://basescan.org/tx/${hash}`;

export interface ContributorSettlementRow {
  id: string;
  hash: string | null;
  asset: "USDC" | "IDIA";
  amount: number;
  status: string;
  wallet: string | null;
  created_at: string;
}

interface Props {
  /** Settlement run reference, e.g. "SYN-371E8458". */
  referenceId?: string | null;
  className?: string;
}

const ContributorSettlementHashes = ({ referenceId, className }: Props) => {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["contributor-settlement-hashes", referenceId],
    enabled: !!referenceId,
    queryFn: async (): Promise<ContributorSettlementRow[]> => {
      console.info(`[BEGIN: Settlement.ContributorHashes] ref=${referenceId}`);
      try {
        const { data, error } = await supabase
          .from("synapse_credit_ledger")
          .select("id, amount, status, transaction_type, blockchain_tx_hash, metadata, created_at, description")
          .eq("reference_id", referenceId!)
          .in("transaction_type", ["data_sale_payout", "idia_royalty_yield"])
          .order("created_at", { ascending: true });
        if (error) throw error;

        const raw = data ?? [];
        const mapped: ContributorSettlementRow[] = raw.map((r: any) => ({
          id: r.id,
          hash: TX_HASH_RE.test(String(r.blockchain_tx_hash ?? "")) ? String(r.blockchain_tx_hash) : null,
          asset: r.transaction_type === "idia_royalty_yield" ? "IDIA" : "USDC",
          amount: Number(r.amount ?? 0),
          status: String(r.status ?? "unknown"),
          wallet: (r.metadata as any)?.contributor_wallet ?? null,
          created_at: r.created_at,
        }));

        const linkable = mapped.filter((m) => !!m.hash);
        if (linkable.length !== mapped.length) {
          const dropped = mapped.filter((m) => !m.hash).map((m) => m.id);
          console.warn(
            `[WARN: Settlement.ContributorHashes] ${mapped.length - linkable.length} of ${mapped.length} rows have no on-chain hash — ledger ids: ${dropped.join(", ")}`,
          );
        }
        console.info(
          `[END: Settlement.ContributorHashes] ref=${referenceId} rows=${raw.length} mapped=${mapped.length} linkable=${linkable.length}`,
        );
        return mapped;
      } catch (e) {
        const err = e as Error;
        console.error(`[END: Settlement.ContributorHashes] ref=${referenceId} failed: ${err.message}\n${err.stack ?? ""}`);
        throw err;
      }
    },
  });

  if (!referenceId) return null;

  const settled = rows.filter((r) => !!r.hash);
  const pending = rows.filter((r) => !r.hash);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Contributor Settlements ({rows.length})
        </h4>
        <span className="text-[10px] font-mono text-muted-foreground">{referenceId}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading contributor transfers…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg">
          No contributor transfers recorded for this settlement run.
        </p>
      ) : (
        <div className="rounded-lg border divide-y">
          {settled.map((r) => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-2 text-xs">
              {r.asset === "IDIA" ? (
                <Coins className="h-3.5 w-3.5 text-purple-500 shrink-0" />
              ) : (
                <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )}
              <a
                href={basescanTxUrl(r.hash!)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-primary hover:underline truncate"
                title={r.hash!}
              >
                {r.hash!.slice(0, 10)}…{r.hash!.slice(-8)}
              </a>
              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="ml-auto font-mono tabular-nums">
                {Math.abs(r.amount).toFixed(4)} {r.asset}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] capitalize ${r.status === "completed" ? "" : "text-amber-500 border-amber-500/40"}`}
              >
                {r.status}
              </Badge>
            </div>
          ))}
          {pending.map((r) => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="truncate">
                {r.status === "pending_wallet" ? "Awaiting wallet" : "No on-chain hash"} · {r.asset}
              </span>
              <span className="ml-auto font-mono tabular-nums">{Math.abs(r.amount).toFixed(4)}</span>
              <Badge variant="outline" className="text-[9px] capitalize text-amber-500 border-amber-500/40">
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContributorSettlementHashes;
