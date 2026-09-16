import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import {
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
  TrendingUp,
  Copy,
  Check,
} from "lucide-react";
import SynapseVisualizer from "@/components/visualizer/SynapseVisualizer";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useUniswapPoolStats } from "@/hooks/useUniswapPoolStats";
import { deriveIdiaUsdPrice } from "@/lib/idia-price";

const IndividualDashboard = () => {
  const { user, piiData } = useAuth();
  const { protocolState, isLoading: creditsLoading } = useSynapseCredits();
  const { balance: walletBalance } = useWalletBalance();
  const { data: uniswapPools } = useUniswapPoolStats();
  const [guidCopied, setGuidCopied] = useState(false);

  // ========================================================================
  // IDENTITY RECONCILIATION: Resolved GUID Bridge
  // ========================================================================
  const activeUserId = user?.user_id || (user as any)?.id;

  useEffect(() => {
    console.info(`[BEGIN: Dashboard.Hydration] Verifying Identity for GUID: ${activeUserId}`);
    if (!activeUserId) {
      console.warn("[STATUS: Dashboard.Hydration] Identity Missing. UI Stalling.");
    }
  }, [activeUserId]);

  // ========================================================================
  // TRIPLE-RAIL FINALITY: Straight-Through Flow Mapping
  // Values are `null` when the wallets row / on-chain address is missing.
  // Render as "--" instead of $0 so real zero balances stay distinguishable.
  // ========================================================================
  const rail2_Gas = protocolState?.synapse_gas_credits ?? 0;
  const rail3_USDC = protocolState?.usdc_balance ?? null;
  const rail1_Eth = walletBalance?.eth_balance ?? null;
  const silo3_IdiaTokens = walletBalance?.idia_balance ?? null;

  // Derive on-chain IDIA→USD price from the live IDIA/USDC Uniswap pool.
  const idiaUsdPrice: number | null = deriveIdiaUsdPrice(uniswapPools);

  const silo3_IdiaUsd =
    silo3_IdiaTokens != null && idiaUsdPrice != null ? silo3_IdiaTokens * idiaUsdPrice : null;

  const formatSilo = (value: number | null | undefined, formatter: (n: number) => string): string =>
    value == null ? "--" : formatter(value);

  useEffect(() => {
    if (protocolState) {
      console.info(
        `[STATUS: Dashboard.DataSync] Rail State Resolved - R1-ETH: ${rail1_Eth} | R2: ${rail2_Gas} | R3-USDC: ${rail3_USDC} | S3-IDIA: ${silo3_IdiaTokens} ($${silo3_IdiaUsd})`,
      );
    }
  }, [protocolState, rail1_Eth, rail2_Gas, rail3_USDC, silo3_IdiaTokens, silo3_IdiaUsd]);

  return (
    <div className="flex flex-col h-full font-sans max-w-full mx-auto w-full px-4 py-1 space-y-2 overflow-hidden">
      {/* COMPACT HEADER */}
      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">
            {piiData?.displayName ? `${piiData.displayName}'s IDIA Hub` : "My IDIA Hub"}
          </h1>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono break-all flex items-start gap-1">
            <span>
              GUID: <span className="text-primary">{activeUserId ?? "—"}</span>
            </span>
            {activeUserId && (
              <button
                type="button"
                aria-label="Copy GUID"
                title="Copy GUID"
                onClick={() => {
                  navigator.clipboard.writeText(activeUserId);
                  setGuidCopied(true);
                  setTimeout(() => setGuidCopied(false), 1500);
                }}
                className="text-muted-foreground hover:text-primary transition-colors shrink-0"
              >
                {guidCopied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[9px] border-primary/20 text-primary py-0 h-5">
            {creditsLoading ? "SYNCING..." : "STATE: settled"}
          </Badge>
          <ShieldCheck className="h-4 w-4 text-primary opacity-30" />
        </div>
      </div>

      {/* NEURAL VISUALIZER: NO HEIGHT RESTRICTION */}
      <Card className="border-primary/10 bg-black/20 backdrop-blur-sm relative">
        <div className="absolute top-2 left-3 z-10">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
            Neural Interaction Matrix
          </span>
        </div>
        <CardContent className="p-0">
          <SynapseVisualizer />
        </CardContent>
      </Card>

      {/* THE OPERATING GRID: FOUR-RAIL LIQUIDITY FLOW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* RAIL 1: ETH (NATIVE GAS) */}
        <Card className="bg-sky-500/5 border-sky-500/20 p-2.5 flex flex-col justify-between min-h-[85px] relative overflow-hidden group">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-sky-400 flex items-center gap-2">
            <Wallet className="h-3 w-3" /> ETH
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-sky-300">
              {formatSilo(rail1_Eth, (n) => n.toFixed(4))}
            </span>
            <span className="text-[8px] font-bold text-sky-400/70 uppercase">ETH (Base)</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-sky-500/20" />
        </Card>

        {/* RAIL 2: GAS (COMPUTATIONAL) */}
        <Card className="bg-primary/5 border-primary/20 p-2.5 flex flex-col justify-between min-h-[85px] relative overflow-hidden group">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Zap className="h-3 w-3 fill-primary" /> Synapse Credits
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-primary">{rail2_Gas.toLocaleString()}</span>
            <span className="text-[8px] font-bold text-primary/70 uppercase">Credits</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-primary/20" />
        </Card>

        {/* RAIL 3: STABLECOIN (LIQUIDITY) */}
        <Card className="bg-amber-500/5 border-amber-500/10 p-2.5 flex flex-col justify-between min-h-[85px] relative overflow-hidden group">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
            <TrendingUp className="h-3 w-3" /> USDC
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-amber-500">
              {formatSilo(
                rail3_USDC,
                (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              )}
            </span>
            <span className="text-[8px] font-bold text-amber-500/70 uppercase">On-Chain (Base)</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-amber-500/20" />
        </Card>

        {/* SILO 3: IDIA TOKEN (ON-CHAIN GOVERNANCE) */}
        <Card className="bg-emerald-500/5 border-emerald-500/10 p-2.5 flex flex-col justify-between min-h-[85px] relative overflow-hidden group">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
            <Sparkles className="h-3 w-3" /> IDIA
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-emerald-500">
              {formatSilo(silo3_IdiaTokens, (n) =>
                n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
              )}
            </span>
            <span className="text-[8px] font-bold text-emerald-500/70 uppercase">IDIA (Base)</span>
          </div>
          <div className="text-[9px] font-mono text-emerald-500/70 mt-0.5">
            {silo3_IdiaUsd == null
              ? "—"
              : `≈ $${silo3_IdiaUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-emerald-500/20" />
        </Card>
      </div>

    </div>
  );
};

export default IndividualDashboard;
