import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Layers } from "lucide-react";
import { useV4Positions, type V4Position } from "@/hooks/useV4Positions";

interface Props {
  owners: (string | null | undefined)[];
  userWallet?: string | null;
}

const formatUSD = (n: number) =>
  n >= 1000 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${n.toFixed(2)}`;

const formatAmount = (n: number) =>
  n >= 1
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : n.toLocaleString(undefined, { maximumFractionDigits: 6 });

const shorten = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const positionUrl = (tokenId: string) => `https://app.uniswap.org/positions/v4/base/${tokenId}`;

const V4PositionRow = ({ p, isUser }: { p: V4Position; isUser: boolean }) => (
  <div className="rounded-lg border border-border/60 p-3 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">
            {p.symbol0} / {p.symbol1}
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            v4 · {(p.fee / 10_000).toFixed(2)}%
          </Badge>
          <Badge
            variant={p.inRange ? "default" : "outline"}
            className="text-[10px] px-1.5 py-0"
          >
            {p.inRange ? "In range" : "Out of range"}
          </Badge>
          {p.fullRange && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Full range
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          #{p.tokenId} · {isUser ? "your wallet" : shorten(p.owner)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold">{formatUSD(p.valueUSD)}</div>
        <div className="text-[11px] text-muted-foreground">position value</div>
      </div>
    </div>

    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="text-muted-foreground">
        {formatAmount(p.amount0)} {p.symbol0} · {formatAmount(p.amount1)} {p.symbol1}
      </div>
      <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
        <a href={positionUrl(p.tokenId)} target="_blank" rel="noreferrer">
          Uniswap <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </Button>
    </div>
  </div>
);

const V4Positions = ({ owners, userWallet }: Props) => {
  const query = useV4Positions(owners);
  const positions = query.data?.positions ?? [];
  const pool = query.data?.pools?.[0];
  const total = positions.reduce((s, p) => s + p.valueUSD, 0);

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold">Uniswap v4 Positions</h3>
            <p className="text-xs text-muted-foreground">
              Live on-chain · IDIA pools on Base
            </p>
          </div>
        </div>
        {positions.length > 0 && (
          <Badge variant="secondary">Total: {formatUSD(total)}</Badge>
        )}
      </div>

      {query.isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Reading positions from Base…
        </div>
      )}

      {query.isError && (
        <div className="text-xs text-destructive">
          Could not read v4 positions from Base right now.
        </div>
      )}

      {!query.isLoading && !query.isError && positions.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No Uniswap v4 positions found for the connected wallets.
        </div>
      )}

      {positions.length > 0 && (
        <div className="space-y-2">
          {positions.map((p) => (
            <V4PositionRow
              key={p.tokenId}
              p={p}
              isUser={!!userWallet && p.owner.toLowerCase() === userWallet.toLowerCase()}
            />
          ))}
        </div>
      )}

      {pool && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
          <div>
            <div className="font-semibold">{formatUSD(pool.tvlUSD)}</div>
            <div className="text-muted-foreground">Pool depth (active tick)</div>
          </div>
          <div>
            <div className="font-semibold">
              {formatAmount(pool.amount0)} {pool.token0.symbol} · {formatAmount(pool.amount1)}{" "}
              {pool.token1.symbol}
            </div>
            <div className="text-muted-foreground">Pool reserves</div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default V4Positions;
