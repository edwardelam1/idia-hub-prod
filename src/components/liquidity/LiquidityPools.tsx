import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  CircleDollarSign,
  ExternalLink,
  FileCode2,
  Loader2,
  Settings,
  WalletCards,
} from "lucide-react";
import { useUniswapPoolStats, type UniswapPoolStat } from "@/hooks/useUniswapPoolStats";
import { useV4Positions } from "@/hooks/useV4Positions";
import { useWalletLpPositions, useUserWalletAddress } from "@/hooks/useWalletLpPositions";
import ProtocolHoldings from "./ProtocolHoldings";
import ContractInformation from "./ContractInformation";
import V4Positions from "./V4Positions";
import V3Positions from "./V3Positions";
import { deriveIdiaUsdPrice } from "@/lib/idia-price";
import { cn } from "@/lib/utils";

const IDIA = "0x6526f939d257e67896821c25b6c24daa404a01fb";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const uniswapPoolUrl = (poolAddress: string) => `https://app.uniswap.org/explore/pools/base/${poolAddress}`;
const basescanUrl = (address: string) => `https://basescan.org/address/${address}`;
const UNISWAP_TOKEN_FALLBACK = `https://app.uniswap.org/explore/tokens/base/${IDIA}`;
const BASESCAN_TOKEN_FALLBACK = `https://basescan.org/token/${IDIA}`;

const formatUSD = (value: number) =>
  value >= 1000 ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${value.toFixed(2)}`;
const formatAPR = (value: number) => `${(value * 100).toFixed(2)}%`;
const formatAmount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: value >= 1 ? 2 : 6 });
const shortPoolId = (id: string) => `${id.slice(0, 8)}…${id.slice(-6)}`;

type Slice = "pool" | "holdings" | "positions" | "contracts";

export const handleAddLiquidityRedirect = (
  tokenAAddress: string | undefined,
  tokenBAddress: string | undefined,
  feeTier?: string,
) => {
  try {
    if (!tokenAAddress || !tokenBAddress) {
      console.warn("[handleAddLiquidityRedirect] Missing required token addresses.");
      return;
    }

    // Uniswap's frontend router frequently crashes when parsing mixed-case contract addresses
    // directly inside the URL path. Bypassing the path segments in favor of query parameters
    // ensures stability.
    let targetUrl = `https://app.uniswap.org/add/?chain=base&inputCurrency=${tokenAAddress}&outputCurrency=${tokenBAddress}`;

    if (feeTier) {
      targetUrl += `&feeAmount=${feeTier}`;
    }

    const newWindow = window.open(targetUrl, "_blank", "noopener,noreferrer");

    if (!newWindow) {
      console.warn("Popup blocked. Could not redirect to Uniswap.");
    }
  } catch (error) {
    console.error("Failed to execute Uniswap redirect:", error);
  }
};

const LiquidityPools = () => {
  const poolsQuery = useUniswapPoolStats();
  const userWalletQuery = useUserWalletAddress();
  const v4Query = useV4Positions([userWalletQuery.data]);
  const pools = poolsQuery.data ?? [];
  const v4Pools = v4Query.data?.pools ?? [];
  const [activeSlice, setActiveSlice] = useState<Slice>("pool");
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const selectedPool: UniswapPoolStat | undefined = pools.find((pool) => pool.id === selectedPoolId) ?? pools[0];
  const userPositionsQuery = useWalletLpPositions(userWalletQuery.data, pools);
  const userPositions = userPositionsQuery.data ?? [];
  const idiaUsdPrice = useMemo(() => deriveIdiaUsdPrice(pools), [pools]);
  const totalTVL = useMemo(() => pools.reduce((sum, pool) => sum + pool.tvlUSD, 0), [pools]);
  const total24hVol = useMemo(() => pools.reduce((sum, pool) => sum + pool.volume24hUSD, 0), [pools]);
  const userValue = useMemo(
    () =>
      userPositions.reduce((sum, position) => sum + position.valueUSD, 0) +
      (v4Query.data?.positions ?? []).reduce((sum, position) => sum + position.valueUSD, 0),
    [userPositions, v4Query.data?.positions],
  );
  const hasUserWallet = Boolean(userWalletQuery.data);

  const slices: Array<{ id: Slice; label: string; value: string; icon: typeof CircleDollarSign }> = [
    { id: "pool", label: "Pool TVL", value: poolsQuery.isLoading ? "—" : formatUSD(totalTVL), icon: CircleDollarSign },
    { id: "holdings", label: "Protocol Holdings", value: "All wallets", icon: Building2 },
    {
      id: "positions",
      label: "Your Position",
      value: hasUserWallet ? formatUSD(userValue) : "No wallet",
      icon: WalletCards,
    },
    { id: "contracts", label: "Contract Info", value: "Base mainnet", icon: FileCode2 },
  ];

  return (
    <div className="p-3 space-y-3 font-sans">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-mono text-2xl font-bold">Liquidity Pools</h1>
          <p className="text-sm text-muted-foreground">IDIA / USDC on Base · Uniswap v4 and v3 · live on-chain data</p>
        </div>
      </header>

      <section aria-label="Quick actions" className="border-y border-border/70 py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <span className="font-mono text-[10px] font-semibold uppercase text-muted-foreground shrink-0 mr-1">
            Quick actions
          </span>
          <Button
            onClick={() =>
              handleAddLiquidityRedirect(USDC, IDIA, selectedPool ? selectedPool.feeTier.toString() : "3000")
            }
            size="sm"
            className="h-8 shrink-0 text-xs"
          >
            <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" /> Add Liquidity
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 shrink-0 text-xs">
            <a href="https://app.uniswap.org/positions" target="_blank" rel="noopener noreferrer">
              <ArrowUpFromLine className="h-3.5 w-3.5 mr-1.5" /> Remove Liquidity
            </a>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 shrink-0 text-xs">
                <Settings className="h-3.5 w-3.5 mr-1.5" /> Pool Inspector
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="font-mono">Pool Inspector</DialogTitle>
                <DialogDescription>Live IDIA/USDC Uniswap v4 and v3 pools on Base.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <section aria-labelledby="v4-pools-heading" className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id="v4-pools-heading" className="font-mono text-xs font-semibold">
                      Uniswap v4
                    </h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {v4Pools.length} pool{v4Pools.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {v4Query.isLoading && (
                    <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading v4 pool state from Base…
                    </div>
                  )}
                  {v4Query.isError && (
                    <p className="text-xs text-destructive">Could not read v4 pool state from Base.</p>
                  )}
                  {!v4Query.isLoading && !v4Query.isError && v4Pools.length === 0 && (
                    <p className="py-3 text-xs text-muted-foreground">
                      No IDIA/USDC v4 pool was found for the connected wallet.
                    </p>
                  )}
                  {v4Pools.map((pool) => (
                    <div key={pool.id} className="rounded-md border border-border/60 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-semibold">
                              {pool.token0.symbol} / {pool.token1.symbol}
                            </span>
                            <Badge className="text-[10px] px-1.5 py-0">v4</Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {(pool.feeTier / 10_000).toFixed(2)}% fee
                            </Badge>
                          </div>
                          <p className="font-mono text-[10px] text-muted-foreground mt-1 truncate" title={pool.id}>
                            {shortPoolId(pool.id)}
                          </p>
                        </div>
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          aria-label="Open v4 pool on Uniswap"
                        >
                          <a href={uniswapPoolUrl(pool.id)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="block text-[10px] text-muted-foreground">Pool depth</span>
                          <span className="font-mono font-semibold">{formatUSD(pool.tvlUSD)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-muted-foreground">Current tick</span>
                          <span className="font-mono font-semibold">{pool.tick.toLocaleString()}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-[10px] text-muted-foreground">Reserves</span>
                          <span className="font-mono font-semibold break-words">
                            {formatAmount(pool.amount0)} {pool.token0.symbol} · {formatAmount(pool.amount1)}{" "}
                            {pool.token1.symbol}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </section>

                <section aria-labelledby="v3-pools-heading" className="space-y-2 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id="v3-pools-heading" className="font-mono text-xs font-semibold">
                      Uniswap v3
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      {pools.length} pool{pools.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {poolsQuery.isLoading ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading v3 pools…
                    </div>
                  ) : pools.length === 0 ? (
                    <p className="py-3 text-xs text-muted-foreground">No IDIA/USDC v3 pools exist on Base.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fee</TableHead>
                            <TableHead>Pool</TableHead>
                            <TableHead className="text-right">TVL</TableHead>
                            <TableHead className="text-right">24h volume</TableHead>
                            <TableHead className="text-right">APR</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pools.map((pool) => (
                            <TableRow key={pool.id}>
                              <TableCell>{(pool.feeTier / 10_000).toFixed(2)}%</TableCell>
                              <TableCell className="font-mono text-xs">{shortPoolId(pool.id)}</TableCell>
                              <TableCell className="text-right font-mono">{formatUSD(pool.tvlUSD)}</TableCell>
                              <TableCell className="text-right font-mono">{formatUSD(pool.volume24hUSD)}</TableCell>
                              <TableCell className="text-right font-mono">{formatAPR(pool.feeApr)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  asChild
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  aria-label="Open v3 pool on Uniswap"
                                >
                                  <a href={uniswapPoolUrl(pool.id)} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </section>
              </div>
            </DialogContent>
          </Dialog>
          <Button asChild variant="ghost" size="sm" className="h-8 shrink-0 text-xs">
            <a
              href={selectedPool ? uniswapPoolUrl(selectedPool.id) : UNISWAP_TOKEN_FALLBACK}
              target="_blank"
              rel="noopener noreferrer"
            >
              Uniswap <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 shrink-0 text-xs">
            <a
              href={selectedPool ? basescanUrl(selectedPool.id) : BASESCAN_TOKEN_FALLBACK}
              target="_blank"
              rel="noopener noreferrer"
            >
              BaseScan <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
        </div>
      </section>

      <nav aria-label="Liquidity views" className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {slices.map(({ id, label, value, icon: Icon }) => {
          const active = activeSlice === id;
          return (
            <Button
              key={id}
              type="button"
              variant={active ? "default" : "outline"}
              onClick={() => setActiveSlice(id)}
              aria-pressed={active}
              className="h-14 justify-start px-3"
            >
              <Icon className="h-4 w-4 mr-2 shrink-0" />
              <span className="min-w-0 text-left">
                <span className="block text-xs font-medium truncate">{label}</span>
                <span
                  className={cn(
                    "block font-mono text-[10px] truncate",
                    active ? "text-primary-foreground/75" : "text-muted-foreground",
                  )}
                >
                  {value}
                </span>
              </span>
            </Button>
          );
        })}
      </nav>

      {poolsQuery.isError && (
        <Card className="p-3 border-destructive">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Could not load Uniswap pool data. Verify the live data connection.
          </div>
        </Card>
      )}

      <main>
        {activeSlice === "pool" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                [poolsQuery.isLoading ? "—" : formatUSD(totalTVL), "Pool TVL"],
                [poolsQuery.isLoading ? "—" : formatUSD(total24hVol), "24h Volume"],
                [selectedPool ? formatAPR(selectedPool.feeApr) : "—", "Fee APR (30d)"],
                [selectedPool ? `${(selectedPool.feeTier / 10_000).toFixed(2)}%` : "v4", "Active fee tier"],
              ].map(([value, label]) => (
                <Card key={label} className="p-3">
                  <div className="font-mono text-lg font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </Card>
              ))}
            </div>
            <Card className="p-3">
              <div className="mb-2">
                <h2 className="font-mono text-sm font-semibold">Pool Performance</h2>
                <p className="text-xs text-muted-foreground">30-day TVL and volume</p>
              </div>
              <div className="h-44">
                {poolsQuery.isLoading ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
                  </div>
                ) : selectedPool ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedPool.series}>
                      <Line type="monotone" dataKey="tvl" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line
                        type="monotone"
                        dataKey="volume"
                        stroke="hsl(var(--accent-foreground))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No v3 pool history available. Your current IDIA liquidity is on v4.
                  </div>
                )}
              </div>
              {pools.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/60">
                  {pools.map((pool) => (
                    <Button
                      key={pool.id}
                      size="sm"
                      variant={selectedPool?.id === pool.id ? "secondary" : "ghost"}
                      onClick={() => setSelectedPoolId(pool.id)}
                      className="h-7 text-xs"
                    >
                      {(pool.feeTier / 10_000).toFixed(2)}% fee
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeSlice === "holdings" && <ProtocolHoldings idiaUsdPrice={idiaUsdPrice} />}

        {activeSlice === "positions" && (
          <div className="space-y-3">
            <V4Positions owners={[userWalletQuery.data]} userWallet={userWalletQuery.data} />
            <V3Positions
              positions={userPositions}
              hasWallet={hasUserWallet}
              isLoading={userPositionsQuery.isLoading}
              isError={userPositionsQuery.isError}
            />
          </div>
        )}

        {activeSlice === "contracts" && <ContractInformation idiaUsdPrice={idiaUsdPrice} />}
      </main>
    </div>
  );
};

export default LiquidityPools;
