import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ExternalLink, Plus, Minus, Eye, Settings, Loader2, AlertTriangle } from "lucide-react";
import { useUniswapPoolStats, useOrgSafeAddress, type UniswapPoolStat } from "@/hooks/useUniswapPoolStats";
import { useWalletLpPositions, useUserWalletAddress, type WalletPosition } from "@/hooks/useWalletLpPositions";
import { NoWalletState } from "./NoWalletState";

const IDIA = "0x6526f939d257e67896821c25b6c24daa404a01fb";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const uniswapAddUrl = (feeTier: number) => `https://app.uniswap.org/add/${USDC}/${IDIA}/${feeTier}?chain=base`;
const uniswapPoolUrl = (poolAddress: string) => `https://app.uniswap.org/explore/pools/base/${poolAddress}`;
const basescanUrl = (addr: string) => `https://basescan.org/address/${addr}`;
// Fallbacks used when live pool data is unavailable, so links never resolve to "#"
const UNISWAP_ADD_FALLBACK = uniswapAddUrl(3000);
const UNISWAP_TOKEN_FALLBACK = `https://app.uniswap.org/explore/tokens/base/${IDIA}`;
const BASESCAN_TOKEN_FALLBACK = `https://basescan.org/token/${IDIA}`;

const formatUSD = (n: number) =>
  n >= 1000 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${n.toFixed(2)}`;
const formatAPR = (n: number) => `${(n * 100).toFixed(2)}%`;
const sumValue = (positions: WalletPosition[] | undefined) => (positions ?? []).reduce((s, p) => s + p.valueUSD, 0);
const sumFees = (positions: WalletPosition[] | undefined) =>
  (positions ?? []).reduce((s, p) => s + p.uncollectedFeesUSD, 0);

const LiquidityPools = () => {
  const poolsQuery = useUniswapPoolStats();
  const safeQuery = useOrgSafeAddress();
  const userWalletQuery = useUserWalletAddress();

  const pools = poolsQuery.data ?? [];
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const selectedPool: UniswapPoolStat | undefined = pools.find((p) => p.id === selectedPoolId) ?? pools[0];

  const userPositionsQuery = useWalletLpPositions(userWalletQuery.data, pools);
  const orgPositionsQuery = useWalletLpPositions(safeQuery.data, pools);

  const userPositions = userPositionsQuery.data;
  const orgPositions = orgPositionsQuery.data;

  const totalTVL = useMemo(() => pools.reduce((s, p) => s + p.tvlUSD, 0), [pools]);
  const total24hVol = useMemo(() => pools.reduce((s, p) => s + p.volume24hUSD, 0), [pools]);
  const userValue = sumValue(userPositions);
  const orgValue = sumValue(orgPositions);
  const userFees = sumFees(userPositions);
  const hasUserWallet = !!userWalletQuery.data;

  const loading = poolsQuery.isLoading;
  const errored = poolsQuery.isError;

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Liquidity Pools</h1>
          <p className="text-sm text-muted-foreground">IDIA / USDC on Base · Uniswap v3 · live on-chain data</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Pool TVL: {formatUSD(totalTVL)}</Badge>
          <Badge variant="default">Org Position: {formatUSD(orgValue)}</Badge>
          {hasUserWallet && <Badge variant="outline">Your Position: {formatUSD(userValue)}</Badge>}
        </div>
      </div>

      {errored && (
        <Card className="p-3 border-destructive">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Could not load Uniswap pool data. Verify the THEGRAPH_API_KEY secret.
          </div>
        </Card>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-lg font-bold">{loading ? "—" : formatUSD(totalTVL)}</div>
          <div className="text-xs text-muted-foreground">Pool TVL (all fee tiers)</div>
        </Card>
        <Card className="p-3">
          <div className="text-lg font-bold">{loading ? "—" : formatUSD(total24hVol)}</div>
          <div className="text-xs text-muted-foreground">24h Volume</div>
        </Card>
        <Card className="p-3">
          {hasUserWallet ? (
            <>
              <div className="text-lg font-bold">{formatUSD(userValue)}</div>
              <div className="text-xs text-muted-foreground">
                Your Position{userFees > 0 && ` · ${formatUSD(userFees)} uncollected fees`}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-muted-foreground">—</div>
              <div className="text-xs text-muted-foreground">No wallet provisioned</div>
            </>
          )}
        </Card>
        <Card className="p-3">
          <div className="text-lg font-bold">{selectedPool ? formatAPR(selectedPool.feeApr) : "—"}</div>
          <div className="text-xs text-muted-foreground">
            Fee APR (30d){selectedPool && ` · ${(selectedPool.feeTier / 10_000).toFixed(2)}% tier`}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Performance chart */}
        <Card className="lg:col-span-2 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold">Pool Performance</h3>
              <p className="text-xs text-muted-foreground">30-day TVL & volume</p>
            </div>
            {selectedPool && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>IDIA/USDC · {(selectedPool.feeTier / 10_000).toFixed(2)}% · 30d</DialogTitle>
                    <DialogDescription>From Uniswap v3 subgraph on Base</DialogDescription>
                  </DialogHeader>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedPool.series}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(v: number) => formatUSD(v)} />
                        <Line type="monotone" dataKey="tvl" stroke="hsl(var(--primary))" strokeWidth={2} name="TVL" />
                        <Line
                          type="monotone"
                          dataKey="volume"
                          stroke="hsl(var(--accent-foreground))"
                          strokeWidth={2}
                          name="Volume"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="h-32">
            {loading ? (
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
                No pool data available
              </div>
            )}
          </div>
        </Card>

        {/* Manage on Uniswap */}
        <Card className="p-3">
          <h3 className="text-sm font-semibold mb-2">Manage on Uniswap</h3>
          <div className="space-y-2">
            <div className="p-2 bg-accent/50 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span>Selected tier:</span>
                <span>{selectedPool ? `${(selectedPool.feeTier / 10_000).toFixed(2)}%` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Pool TVL:</span>
                <span>{selectedPool ? formatUSD(selectedPool.tvlUSD) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Your position:</span>
                <span>{hasUserWallet ? formatUSD(userValue) : "No wallet"}</span>
              </div>
            </div>
            <Button asChild className="w-full h-8 text-xs">
              <a
                href={selectedPool ? uniswapAddUrl(selectedPool.feeTier) : UNISWAP_ADD_FALLBACK}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Liquidity <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
            <Button asChild variant="destructive" className="w-full h-8 text-xs">
              <a href="https://app.uniswap.org/pool" target="_blank" rel="noopener noreferrer">
                <Minus className="h-3 w-3 mr-1" /> Remove Liquidity <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
            {!hasUserWallet && (
              <p className="text-[10px] text-muted-foreground">
                Provision your wallet in Life by IDIA to interact directly.
              </p>
            )}
          </div>
        </Card>

        {/* Quick actions */}
        <Card className="p-3">
          <h3 className="text-sm font-semibold mb-2">Quick Actions</h3>
          <div className="space-y-2">
            <Button asChild variant="outline" size="sm" className="w-full text-xs">
              <a
                href={selectedPool ? uniswapPoolUrl(selectedPool.id) : UNISWAP_TOKEN_FALLBACK}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye className="h-3 w-3 mr-1" /> View Pool on Uniswap
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full text-xs">
              <a
                href={selectedPool ? basescanUrl(selectedPool.id) : BASESCAN_TOKEN_FALLBACK}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 mr-1" /> View on BaseScan
              </a>
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  My Positions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Your Liquidity Positions</DialogTitle>
                  <DialogDescription>Live from Base mainnet via on-chain reads</DialogDescription>
                </DialogHeader>
                {!hasUserWallet ? (
                  <NoWalletState />
                ) : userPositionsQuery.isLoading ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Reading on-chain positions…
                  </div>
                ) : (userPositions ?? []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No IDIA/USDC v3 positions found for this wallet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Uncollected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(userPositions ?? []).map((p) => (
                        <TableRow key={p.tokenId}>
                          <TableCell className="font-mono text-xs">#{p.tokenId}</TableCell>
                          <TableCell>{(p.fee / 10_000).toFixed(2)}%</TableCell>
                          <TableCell>
                            <Badge variant={p.inRange ? "default" : "secondary"}>
                              {p.inRange ? "In range" : "Out of range"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatUSD(p.valueUSD)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatUSD(p.uncollectedFeesUSD)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </div>

      {/* Fee tier strip + Pool Inspector */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">IDIA/USDC Fee Tiers</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Settings className="h-3 w-3 mr-1" /> Pool Inspector
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle>Pool Inspector</DialogTitle>
                <DialogDescription>All IDIA/USDC pools on Base with org & user positions</DialogDescription>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee tier</TableHead>
                    <TableHead>Pool address</TableHead>
                    <TableHead className="text-right">TVL</TableHead>
                    <TableHead className="text-right">24h vol</TableHead>
                    <TableHead className="text-right">Fee APR</TableHead>
                    <TableHead className="text-right">Org pos</TableHead>
                    <TableHead className="text-right">Your pos</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pools.map((p) => {
                    const orgVal = (orgPositions ?? [])
                      .filter((pos) => pos.fee === p.feeTier)
                      .reduce((s, pos) => s + pos.valueUSD, 0);
                    const userVal = (userPositions ?? [])
                      .filter((pos) => pos.fee === p.feeTier)
                      .reduce((s, pos) => s + pos.valueUSD, 0);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{(p.feeTier / 10_000).toFixed(2)}%</TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.id.slice(0, 8)}…{p.id.slice(-6)}
                        </TableCell>
                        <TableCell className="text-right">{formatUSD(p.tvlUSD)}</TableCell>
                        <TableCell className="text-right">{formatUSD(p.volume24hUSD)}</TableCell>
                        <TableCell className="text-right">{formatAPR(p.feeApr)}</TableCell>
                        <TableCell className="text-right">{formatUSD(orgVal)}</TableCell>
                        <TableCell className="text-right">
                          {hasUserWallet ? formatUSD(userVal) : <NoWalletState compact />}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button asChild size="sm" variant="ghost" className="h-6 px-2">
                            <a href={uniswapPoolUrl(p.id)} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="h-6 px-2">
                            <a href={basescanUrl(p.id)} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {pools.length === 0 && !loading && (
            <div className="col-span-full text-xs text-muted-foreground p-4 text-center">
              No IDIA/USDC pools returned. Subgraph may be syncing.
            </div>
          )}
          {pools.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPoolId(p.id)}
              className={`p-2 border rounded text-xs hover:bg-accent transition-colors text-left ${
                selectedPool?.id === p.id ? "bg-accent border-primary" : ""
              }`}
            >
              <div className="font-medium">IDIA/USDC · {(p.feeTier / 10_000).toFixed(2)}%</div>
              <div className="text-green-600">{formatAPR(p.feeApr)} fee APR</div>
              <div className="text-muted-foreground">
                {formatUSD(p.tvlUSD)} TVL · {formatUSD(p.volume24hUSD)} 24h
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default LiquidityPools;
