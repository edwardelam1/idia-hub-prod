import { useState } from 'react';
import { Search, Database, ShieldAlert, Play, Loader2, Info, Terminal, ChevronDown } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';

interface MarketplaceTerminalProps {
  synapseBalance?: number;
  isBioKeyVerified?: boolean;
}

const MarketplaceTerminal = ({ synapseBalance: propBalance, isBioKeyVerified = false }: MarketplaceTerminalProps) => {
  const [query, setQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { balanceData } = useSynapseCredits();
  const displayCredits = propBalance ?? balanceData?.available_credits ?? 0;

  const QUERY_COST_CRD = 1.0;

  const handleRunQuery = async () => {
    if (displayCredits < QUERY_COST_CRD) return;
    setIsExecuting(true);
    try {
      const response = await fetchApi<{ data: any }>('/api/v1/synapse/query', {
        method: 'POST',
        body: JSON.stringify({
          query_string: query,
          cost_credits: QUERY_COST_CRD,
          auth_type: 'BIO_SOVEREIGN',
        }),
      });
      setResults(response.data);
    } catch (err) {
      console.error('Query failed', err);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Trigger bar — always visible */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                <Terminal className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold text-foreground">Synapse Terminal</span>
                <span className="text-[10px] text-muted-foreground ml-2 font-mono">v1.0</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
                <Database className="w-3 h-3" />
                <span className="text-[11px] font-mono font-medium">{displayCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })} CRD</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Expanded panel */}
        <CollapsibleContent>
          <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
            {/* Bio-Key Warning */}
            {!isBioKeyVerified && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-destructive">Bio-Sovereign Auth Required</p>
                  <p className="text-[11px] text-destructive/70 mt-0.5">
                    Verify via the IDIA Life app to unlock the Synapse Engine.
                  </p>
                </div>
              </div>
            )}

            {/* Query Input */}
            <div className="relative">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Query metadata for iOS users in Kentucky with HRI > 85.0..."
                className="w-full h-24 bg-muted/50 border border-border rounded-lg p-3 text-foreground font-mono text-xs focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none resize-none placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                <Info className="w-3 h-3" />
                Est. Cost: 1.00 CRD ($0.75)
              </div>
              <Button
                size="sm"
                onClick={handleRunQuery}
                disabled={isExecuting || !isBioKeyVerified || displayCredits < QUERY_COST_CRD}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {isExecuting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Run Query
                  </>
                )}
              </Button>
            </div>

            {/* Results */}
            {(results || isExecuting) && (
              <div className="bg-muted/30 border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Query Results
                  </span>
                </div>
                <div className="h-48 overflow-auto">
                  {results ? (
                    <pre className="p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
                      {JSON.stringify(results, null, 2)}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty state — only when no results and not executing */}
            {!results && !isExecuting && (
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/20">
                <Search className="w-4 h-4 text-muted-foreground/50" />
                <p className="text-[11px] text-muted-foreground">
                  Execute a query to view Iceberg Lakehouse metadata.
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default MarketplaceTerminal;
