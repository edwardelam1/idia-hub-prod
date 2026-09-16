import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { useProtocolHoldings, type ProtocolHolding } from "@/hooks/useProtocolHoldings";

const basescanUrl = (addr: string) => `https://basescan.org/address/${addr}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const usd = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const amt = (n: number | null, digits = 4) =>
  n == null ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: digits });

const holdingUsd = (h: ProtocolHolding, idiaUsd: number | null): number | null => {
  if (h.usdc == null && h.idia == null) return null;
  const idiaPart = h.idia != null && idiaUsd != null ? h.idia * idiaUsd : 0;
  return (h.usdc ?? 0) + idiaPart;
};

const CopyAddress = ({ address }: { address: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy address"
      title="Copy address"
      onClick={() => {
        navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-muted-foreground hover:text-primary transition-colors shrink-0"
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

interface Props {
  idiaUsdPrice: number | null;
}

const ProtocolHoldings = ({ idiaUsdPrice }: Props) => {
  const { data, isLoading, isError } = useProtocolHoldings();
  const holdings = data ?? [];

  const totals = useMemo(() => {
    let eth = 0;
    let idia = 0;
    let usdc = 0;
    for (const h of holdings) {
      eth += h.eth ?? 0;
      idia += h.idia ?? 0;
      usdc += h.usdc ?? 0;
    }
    const value = usdc + (idiaUsdPrice != null ? idia * idiaUsdPrice : 0);
    return { eth, idia, usdc, value };
  }, [holdings, idiaUsdPrice]);

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold">Protocol Holdings</h3>
          <p className="text-xs text-muted-foreground">Live balances across every protocol wallet on Base</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default">Total: {isLoading ? "—" : usd(totals.value)}</Badge>
          <Badge variant="outline" className="font-mono text-[10px]">
            {amt(totals.idia, 2)} IDIA
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px]">
            {amt(totals.usdc, 2)} USDC
          </Badge>
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" /> Could not read on-chain balances right now.
        </div>
      )}

      {isLoading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Reading on-chain balances…
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground px-2">
            <div className="col-span-4">Wallet</div>
            <div className="col-span-2 text-right">ETH</div>
            <div className="col-span-2 text-right">IDIA</div>
            <div className="col-span-2 text-right">USDC</div>
            <div className="col-span-2 text-right">Value</div>
          </div>

          {holdings.map((h) => {
            const value = holdingUsd(h, idiaUsdPrice);
            return (
              <div
                key={h.key}
                className="rounded border border-border/40 bg-muted/20 px-2 py-1.5 md:grid md:grid-cols-12 md:gap-2 md:items-center"
              >
                <div className="md:col-span-4 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{h.label}</span>
                    <a
                      href={basescanUrl(h.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                      aria-label="View on BaseScan"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                    <span>{short(h.address)}</span>
                    <CopyAddress address={h.address} />
                    <span className="hidden md:inline">· {h.description}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 mt-1 md:mt-0 md:contents">
                  <div className="md:col-span-2 md:text-right">
                    <span className="md:hidden block text-[9px] uppercase text-muted-foreground">ETH</span>
                    <span className="text-xs font-mono">{amt(h.eth, 4)}</span>
                  </div>
                  <div className="md:col-span-2 md:text-right">
                    <span className="md:hidden block text-[9px] uppercase text-muted-foreground">IDIA</span>
                    <span className="text-xs font-mono">{amt(h.idia, 2)}</span>
                  </div>
                  <div className="md:col-span-2 md:text-right">
                    <span className="md:hidden block text-[9px] uppercase text-muted-foreground">USDC</span>
                    <span className="text-xs font-mono">{amt(h.usdc, 2)}</span>
                  </div>
                  <div className="md:col-span-2 md:text-right">
                    <span className="md:hidden block text-[9px] uppercase text-muted-foreground">Value</span>
                    <span className="text-xs font-mono font-semibold">{value == null ? "—" : usd(value)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground pt-1">
            Value = USDC balance + IDIA valued at the live pool price. ETH is shown as a native balance only.
          </p>
        </div>
      )}
    </Card>
  );
};

export default ProtocolHoldings;
