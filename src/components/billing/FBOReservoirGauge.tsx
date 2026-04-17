import { Wallet, RefreshCw } from "lucide-react";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { Button } from "@/components/ui/button";

const FBOReservoirGauge = () => {
  const { balanceData, isLoading, refreshBalance } = useSynapseCredits();

  if (isLoading) {
    return <div className="p-3 animate-pulse font-mono text-[10px] text-muted-foreground">SYNCING_FBO...</div>;
  }

  const fboBalance = balanceData?.fbo_balance ?? 0;

  return (
    <div className="w-full space-y-1 p-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Wallet className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">FBO Reservoir</span>
        </div>
        <Button variant="ghost" size="icon" onClick={refreshBalance} className="h-4 w-4 hover:bg-primary/10">
          <RefreshCw className="w-2.5 h-2.5" />
        </Button>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-mono font-bold tracking-tighter text-foreground">
          ${fboBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase">USD</span>
      </div>

      <p className="text-[9px] text-muted-foreground leading-tight italic font-medium">Airwallex FBO Settlement</p>
    </div>
  );
};

export default FBOReservoirGauge;
