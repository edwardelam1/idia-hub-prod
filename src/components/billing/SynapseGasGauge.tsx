import { Database, RefreshCw, AlertCircle, TrendingDown } from "lucide-react";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { Button } from "@/components/ui/button";
import { formatCredits } from "@/lib/utils";

const SynapseGasGauge = () => {
  const { balanceData, burnRate, isLoading, error, refreshBalance } = useSynapseCredits();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-3 animate-pulse w-full">
        <RefreshCw className="w-4 h-4 text-primary animate-spin mr-2" />
        <p className="text-muted-foreground font-mono text-[10px]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start p-2 bg-destructive/10 border border-destructive/50 rounded w-full">
        <AlertCircle className="w-3 h-3 text-destructive mr-1.5 flex-shrink-0 mt-0.5" />
        <p className="text-destructive text-[10px]">{error}</p>
      </div>
    );
  }

  const credits = balanceData?.available_credits ?? 0;
  const burnStatus = burnRate?.burn_status ?? "healthy";
  const dailyAvg = burnRate?.daily_average ?? 0;

  const statusColor =
    burnStatus === "critical" ? "text-destructive" : burnStatus === "warning" ? "text-amber-500" : "text-primary";
  const dotColor =
    burnStatus === "critical"
      ? "bg-destructive animate-pulse"
      : burnStatus === "warning"
        ? "bg-amber-500 animate-pulse"
        : "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]";
  const statusLabel =
    burnStatus === "critical" ? "Critical — Refill Now" : burnStatus === "warning" ? "Low Balance" : "Live Wire";

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-foreground font-medium text-[11px] uppercase tracking-wide">Synapse Balance</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={refreshBalance} title="Refresh Balance" className="h-5 w-5">
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      <div className={`text-lg font-bold tracking-tight ${statusColor}`}>{Math.floor(credits)}</div>

      <p className="text-[10px] text-muted-foreground leading-tight">FBO @ Airwallex</p>

      {dailyAvg > 0 && (
        <div className="flex items-center gap-1 mt-1">
          <TrendingDown className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-mono">~{formatCredits(dailyAvg)}/d</span>
          {credits > 0 && (
            <span className="text-[10px] text-muted-foreground">({Math.floor(credits / dailyAvg)}d left)</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-1">
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{statusLabel}</span>
      </div>
    </div>
  );
};

export default SynapseGasGauge;
