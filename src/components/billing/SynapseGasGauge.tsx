import { Database, Zap, RefreshCw, AlertCircle, TrendingDown } from 'lucide-react';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { Button } from '@/components/ui/button';
import { formatCredits } from '@/lib/utils';

const SynapseGasGauge = () => {
  const { balanceData, burnRate, isLoading, error, refreshBalance } = useSynapseCredits();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-card rounded-xl border border-border animate-pulse w-full max-w-sm">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-muted-foreground font-mono text-sm">Querying Synapse Ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start p-4 bg-destructive/10 border border-destructive/50 rounded-xl w-full max-w-sm">
        <AlertCircle className="w-5 h-5 text-destructive mr-3 flex-shrink-0 mt-0.5" />
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  const credits = balanceData?.available_credits ?? 0;
  const burnStatus = burnRate?.burn_status ?? 'healthy';
  const dailyAvg = burnRate?.daily_average ?? 0;

  const statusColor = burnStatus === 'critical' ? 'text-destructive' : burnStatus === 'warning' ? 'text-amber-500' : 'text-primary';
  const dotColor = burnStatus === 'critical' ? 'bg-destructive animate-pulse' : burnStatus === 'warning' ? 'bg-amber-500 animate-pulse' : 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]';
  const statusLabel = burnStatus === 'critical' ? 'Critical — Refill Now' : burnStatus === 'warning' ? 'Low Balance' : 'Live Wire';

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-lg w-full max-w-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="text-foreground font-semibold tracking-wide text-sm uppercase">Synapse Credit Balance</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={refreshBalance}
          title="Refresh Balance"
          className="h-8 w-8"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-4xl font-bold tracking-tight ${statusColor}`}>
          {formatCredits(credits)}
        </span>
      </div>

      {/* FBO custody subtitle */}
      <p className="text-xs text-muted-foreground mt-1">Held in FBO custody at Airwallex</p>

      {/* Burn Rate */}
      {dailyAvg > 0 && (
        <div className="flex items-center gap-1.5 mt-3">
          <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-mono">
            ~{formatCredits(dailyAvg)}/day burn rate
          </span>
          {credits > 0 && dailyAvg > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              ({Math.floor(credits / dailyAvg)}d remaining)
            </span>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground text-xs font-mono truncate w-32">
            {balanceData?.wallet_address.substring(0, 6)}...{balanceData?.wallet_address.substring(38)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SynapseGasGauge;
