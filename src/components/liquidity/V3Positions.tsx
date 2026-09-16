import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Layers, Loader2 } from "lucide-react";
import type { WalletPosition } from "@/hooks/useWalletLpPositions";
import { NoWalletState } from "./NoWalletState";

interface Props {
  positions: WalletPosition[] | undefined;
  hasWallet: boolean;
  isLoading: boolean;
  isError: boolean;
}

const formatUSD = (n: number) =>
  n >= 1000 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${n.toFixed(2)}`;

const formatAmount = (n: number) =>
  n >= 1
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : n.toLocaleString(undefined, { maximumFractionDigits: 6 });

const positionUrl = (tokenId: string) => `https://app.uniswap.org/positions/v3/base/${tokenId}`;

const V3Positions = ({ positions = [], hasWallet, isLoading, isError }: Props) => {
  const total = positions.reduce((sum, position) => sum + position.valueUSD, 0);
  const fees = positions.reduce((sum, position) => sum + position.uncollectedFeesUSD, 0);

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <div>
            <h3 className="font-mono text-sm font-semibold">Uniswap v3 Positions</h3>
            <p className="text-xs text-muted-foreground">Live on-chain · IDIA pools on Base</p>
          </div>
        </div>
        {positions.length > 0 && <Badge variant="secondary">Total: {formatUSD(total)}</Badge>}
      </div>

      {!hasWallet && <NoWalletState />}

      {hasWallet && isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Reading positions from Base…
        </div>
      )}

      {hasWallet && isError && (
        <div className="text-xs text-destructive">Could not read v3 positions from Base right now.</div>
      )}

      {hasWallet && !isLoading && !isError && positions.length === 0 && (
        <div className="text-xs text-muted-foreground">No Uniswap v3 IDIA/USDC positions found for your wallet.</div>
      )}

      {positions.length > 0 && (
        <div className="space-y-2">
          {positions.map((position) => (
            <div key={position.tokenId} className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">IDIA / USDC</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      v3 · {(position.fee / 10_000).toFixed(2)}%
                    </Badge>
                    <Badge variant={position.inRange ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                      {position.inRange ? "In range" : "Out of range"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">#{position.tokenId} · your wallet</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-bold">{formatUSD(position.valueUSD)}</div>
                  <div className="text-[11px] text-muted-foreground">position value</div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3 text-xs">
                <div className="min-w-0 text-muted-foreground">
                  <div>{formatAmount(position.amount0)} token 0 · {formatAmount(position.amount1)} token 1</div>
                  <div className="mt-1">Uncollected fees: {formatUSD(position.uncollectedFeesUSD)}</div>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0">
                  <a href={positionUrl(position.tokenId)} target="_blank" rel="noreferrer">
                    Uniswap <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
            <div>
              <div className="font-mono font-semibold">{formatUSD(total)}</div>
              <div className="text-muted-foreground">Total position value</div>
            </div>
            <div>
              <div className="font-mono font-semibold">{formatUSD(fees)}</div>
              <div className="text-muted-foreground">Uncollected fees</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default V3Positions;