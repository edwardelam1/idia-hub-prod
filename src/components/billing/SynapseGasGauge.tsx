import { Database, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { Button } from '@/components/ui/button';

const SynapseGasGauge = () => {
  const { balanceData, isLoading, error, refreshBalance } = useSynapseCredits();

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

  const isLowBalance = (balanceData?.available_credits ?? 0) < 100;

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-lg w-full max-w-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="text-foreground font-semibold tracking-wide text-sm uppercase">Synapse Gas</h3>
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
        <span className={`text-4xl font-bold tracking-tight ${isLowBalance ? 'text-destructive' : 'text-primary'}`}>
          {balanceData?.available_credits.toFixed(2)}
        </span>
        <span className="text-muted-foreground font-mono text-sm">CRD</span>
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground text-xs font-mono truncate w-32">
            {balanceData?.wallet_address.substring(0, 6)}...{balanceData?.wallet_address.substring(38)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLowBalance ? 'bg-destructive animate-pulse' : 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]'}`} />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {isLowBalance ? 'Refill Needed' : 'Live Wire'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SynapseGasGauge;
