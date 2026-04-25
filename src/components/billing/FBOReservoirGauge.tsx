import { Wallet, RefreshCw, Zap } from "lucide-react";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const HubOperatingGauge = () => {
  const { balanceData, isLoading, refreshBalance } = useSynapseCredits();

  // Granular Render Logging for State Discovery
  useEffect(() => {
    if (balanceData) {
      console.info(
        `[UI: HubOperatingGauge] Ingested State - Hub Fuel: $${balanceData.available_credits} | Life FBO: $${balanceData.fbo_balance}`,
      );
    }
  }, [balanceData]);

  if (isLoading) {
    return (
      <div className="p-3 animate-pulse font-mono text-[10px] text-muted-foreground uppercase tracking-tighter">
        SYNCING_VAULT_STATE...
      </div>
    );
  }

  // BINDING FIX: Pointing to available_credits (hub_cash_balance) for pipeline testing
  const hubFuel = balanceData?.available_credits ?? 0;

  return (
    <div className="w-full space-y-1 p-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-primary">
          <Zap className="w-3.5 h-3.5 fill-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Synapse Operating Fuel</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            console.info("[UI: HubOperatingGauge] Manual Pulse Requested.");
            refreshBalance();
          }}
          className="h-4 w-4 hover:bg-primary/10"
        >
          <RefreshCw className="w-2.5 h-2.5" />
        </Button>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-mono font-bold tracking-tighter text-foreground">
          ${hubFuel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase">Credits</span>
      </div>

      <p className="text-[9px] text-muted-foreground leading-tight italic font-medium">
        Hub Liquidity Silo: Active for Pipeline Execution
      </p>
    </div>
  );
};

export default HubOperatingGauge;
