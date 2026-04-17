import { Database, Wallet, RefreshCw, TrendingDown } from "lucide-react";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const SynapseGasGauge = () => {
  const { balanceData, isLoading, error, refreshBalance } = useSynapseCredits();

  if (isLoading) return <div className="p-3 animate-pulse font-mono text-[10px] text-primary">SYNCING_LEDGERS...</div>;

  const synapseCredits = balanceData?.synapse ?? 0; // Value is now e.g. 950
  const fboLiquidity = balanceData?.fbo ?? 0; // Value is e.g. 15000.00

  return (
    <div className="w-full space-y-4 p-1">
      {/* SYNAPSE CREDITS (The Fuel) */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-primary">
            <Database className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Synapse Gas</span>
          </div>
          <Button variant="ghost" size="icon" onClick={refreshBalance} className="h-4 w-4 hover:bg-primary/10">
            <RefreshCw className="w-2.5 h-2.5" />
          </Button>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-mono font-bold tracking-tighter text-primary">
            {Math.floor(synapseCredits).toLocaleString()}
          </span>
          <span className="text-[10px] font-bold text-primary/70 uppercase">Units</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Live Ledger Verified</span>
        </div>
      </div>

      <Separator className="bg-border/40" />

      {/* FBO RESERVOIR (The Funds) */}
      <div className="space-y-1 opacity-80">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Wallet className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-widest">FBO Reservoir</span>
        </div>
        <div className="text-md font-mono font-semibold tracking-tight text-foreground">
          ${fboLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <p className="text-[9px] text-muted-foreground leading-tight italic font-medium">Airwallex FBO Settlement</p>
      </div>
    </div>
  );
};

export default SynapseGasGauge;
