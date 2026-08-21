import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  CreditCard,
  Coins,
  Receipt,
  ArrowDownCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { formatCredits } from "@/lib/utils";

export type LedgerRail = "tradfi" | "defi";

const CRYPTO_SOURCES = ["usdc", "metamask", "circle", "on-chain", "onchain", "crypto", "wallet", "base"];
const FIAT_SOURCES = ["fiat", "fbo", "wix", "card", "ach", "wire", "bank", "stripe", "worldpay"];
const FIAT_TX_TYPES = ["synapse_purchase", "credit_purchase", "settlement", "bank_settlement"];

/** Returns the rail a ledger row belongs to, or null for internal credit accounting. */
const classifyRail = (r: any): LedgerRail | null => {
  const fundingSource = (r.funding_source ?? "").toString().toLowerCase();
  const txType = (r.transaction_type ?? "").toString().toLowerCase();

  if (FIAT_SOURCES.some((s) => fundingSource.includes(s))) return "tradfi";
  if (!!r.blockchain_tx_hash || !!r.circle_transfer_id) return "defi";
  if (CRYPTO_SOURCES.some((s) => fundingSource.includes(s))) return "defi";
  if (FIAT_TX_TYPES.includes(txType)) return "tradfi";
  return null;
};

const basescanTxUrl = (hash: string) => `https://basescan.org/tx/${hash}`;
const isTxHash = (v?: string | null) => !!v && /^0x[a-fA-F0-9]{64}$/.test(v);


interface ActivityLedgerProps {
  rail: LedgerRail;
  title?: string;
  description?: string;
}

const ActivityLedger = ({ rail, title, description }: ActivityLedgerProps) => {
  const { user } = useAuth();
  const userId = user?.user_id;
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const { data: ledgerTransactions = [], isLoading } = useQuery({
    queryKey: ["activity-ledger", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("synapse_credit_ledger")
        .select(
          "id, amount, amount_usdc, entry_type, transaction_type, status, description, funding_source, created_at, transaction_id, blockchain_tx_hash, circle_transfer_id"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r: any) => {
        const credits = Number(r.amount ?? 0);
        const isDebit = credits < 0;
        const usd = r.amount_usdc != null ? Number(r.amount_usdc) : Math.abs(credits) * 0.75;
        const fundingSource = (r.funding_source ?? "").toString().toLowerCase();
        const onChain =
          !!r.blockchain_tx_hash ||
          !!r.circle_transfer_id ||
          CRYPTO_SOURCES.some((s) => fundingSource.includes(s));
        return {
          id: r.id,
          reference: r.description || r.transaction_type || "Settlement",
          routing: r.entry_type || r.transaction_type || "ledger",
          payment_method: r.funding_source || (r.amount_usdc != null ? "usdc" : "fiat"),
          amount: usd,
          credits,
          isDebit,
          created_at: r.created_at,
          transaction_hash: r.blockchain_tx_hash || r.circle_transfer_id || r.transaction_id,
          blockchain_tx_hash: r.blockchain_tx_hash,
          transaction_id: r.transaction_id,
          status: r.status,
          rail: (onChain ? "defi" : "tradfi") as LedgerRail,
        };
      });
    },
    enabled: !!userId,
  });

  const rows = ledgerTransactions.filter((tx: any) => tx.rail === rail);

  const toggleExpand = (id: string) => setExpandedTx(expandedTx === id ? null : id);

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          {title ?? (rail === "defi" ? "On-Chain Activity Ledger" : "TradFi Activity Ledger")}
        </CardTitle>
        <CardDescription>
          {description ??
            (rail === "defi"
              ? "Wallet-rail settlements, USDC transfers, and on-chain proofs."
              : "Bank, card, and FBO custody settlements processed on fiat rails.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-12 bg-muted/50 p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b">
            <div className="col-span-1">Status</div>
            <div className="col-span-4">Transaction / Method</div>
            <div className="col-span-3">Type</div>
            <div className="col-span-2 text-right">Value</div>
            <div className="col-span-2 text-right">Credits</div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading ledger…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-10" />
              <p>
                No {rail === "defi" ? "on-chain" : "fiat-rail"} settlement activity recorded for this account.
              </p>
            </div>
          ) : (
            rows.map((tx: any) => (
              <div key={tx.id} className="border-b last:border-none">
                <div
                  className="grid grid-cols-12 p-4 items-center hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(tx.id)}
                >
                  <div className="col-span-1">
                    {tx.isDebit ? (
                      <ArrowDownCircle className="h-5 w-5 text-rose-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {rail === "defi" ? <Coins className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{tx.reference || "Purchase Intent"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {new Date(tx.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <Badge variant="outline" className="text-[10px] capitalize bg-background">
                      {tx.routing || "Direct"}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-right font-mono text-sm">
                    {tx.isDebit ? "-" : ""}${Math.abs(Number(tx.amount)).toFixed(2)}
                  </div>
                  <div className="col-span-2 text-right">
                    <div className={`text-sm font-bold font-mono ${tx.isDebit ? "text-rose-500" : ""}`}>
                      {tx.isDebit ? "" : "+"}
                      {formatCredits(tx.credits)}
                    </div>
                    {expandedTx === tx.id ? (
                      <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expandedTx === tx.id && (
                  <div className="px-14 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
                          Settlement Proof
                        </p>
                        <p className="text-xs font-mono break-all bg-muted p-2 rounded mt-1">
                          {tx.transaction_hash || "Internal Settlement"}
                        </p>
                        {isTxHash(tx.blockchain_tx_hash) && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="mt-2 h-7 text-[10px] uppercase tracking-widest"
                          >
                            <a
                              href={basescanTxUrl(tx.blockchain_tx_hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3 mr-2" /> View on BaseScan
                            </a>
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
                            Gateway
                          </p>
                          <p className="text-xs mt-1 capitalize">{tx.payment_method || "Internal"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
                            Status
                          </p>
                          <p className="text-xs mt-1 capitalize">{tx.status || "settled"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Base Unit Price:</span>
                        <span className="font-mono text-primary">
                          {tx.credits ? `$${Math.abs(tx.amount / tx.credits).toFixed(4)}/CR` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Rail:</span>
                        <span className="font-mono uppercase">{rail === "defi" ? "On-Chain" : "Fiat / FBO"}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Compliance ID:</span>
                        <span className="font-mono">{tx.id.slice(0, 13)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 h-8 text-[10px] uppercase tracking-widest"
                      >
                        <FileText className="h-3 w-3 mr-2" /> View JSON Audit Trace
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLedger;
