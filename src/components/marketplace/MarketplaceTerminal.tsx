import { useState } from 'react';
import { Search, Database, ShieldAlert, Play, Loader2, Info } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface MarketplaceTerminalProps {
  synapseBalance?: number;
  isBioKeyVerified?: boolean;
}

const MarketplaceTerminal = ({ synapseBalance = 0, isBioKeyVerified = false }: MarketplaceTerminalProps) => {
  const [query, setQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const QUERY_COST_CRD = 1.0;

  const handleRunQuery = async () => {
    if (synapseBalance < QUERY_COST_CRD) return;

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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Terminal Header */}
      <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="ml-4 text-xs font-mono text-slate-400 uppercase tracking-widest">
            Synapse Terminal v1.0
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-md border border-slate-700">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-mono text-slate-300">{synapseBalance.toFixed(2)} CRD</span>
        </div>
      </div>

      <div className="p-6">
        {/* Bio-Key Warning */}
        {!isBioKeyVerified && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500/50 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-200">Bio-Sovereign Auth Required</h4>
              <p className="text-xs text-amber-200/70">
                Please verify your biological stability via the IDIA Life app to unlock the Synapse Engine.
              </p>
            </div>
          </div>
        )}

        {/* Query Input */}
        <div className="relative group">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Query metadata for iOS users in Kentucky with HRI > 85.0..."
            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 font-mono text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none resize-none"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono uppercase">
              <Info className="w-3 h-3" />
              Est. Cost: 1.00 CRD ($0.75)
            </div>
            <button
              onClick={handleRunQuery}
              disabled={isExecuting || !isBioKeyVerified || synapseBalance < QUERY_COST_CRD}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4" /> Run Query
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Query Results</h3>
          <div className="bg-slate-950 border border-slate-800 rounded-xl h-64 flex items-center justify-center">
            {results ? (
              <pre className="p-4 w-full h-full overflow-auto font-mono text-xs text-emerald-400 whitespace-pre-wrap">
                {JSON.stringify(results, null, 2)}
              </pre>
            ) : (
              <div className="text-center">
                <Search className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                <p className="text-slate-600 text-xs">Execute a query to view Iceberg Lakehouse metadata.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceTerminal;
