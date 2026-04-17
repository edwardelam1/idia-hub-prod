import { Database, RefreshCw } from "lucide-react";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { Button } from "@/components/ui/button";

const SynapseGasGauge = () => {
  const { balanceData, isLoading, refreshBalance } = useSynapseCredits();

  if (isLoading) return <div className="p-3 animate-pulse font-mono text-[10px] text-primary">SYNCING_LEDGERS...</div>;

  const synapseCredits = balanceData?.available_credits ?? 0;

  return (
    <div className="w-full space-y-1 p-1">
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
  );
};

export default SynapseGasGauge;
