
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, ArrowUpRight, History, Banknote, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SettlementData {
  available_balance: number;
  pending_balance: number;
  lifetime_earnings: number;
  bank_last4: string;
  last_settlement_at: string;
}

interface EarningsSettlementProps {
  businessId?: string;
}

const EarningsSettlement = ({ businessId = 'ENT-MOCK' }: EarningsSettlementProps) => {
  const navigate = useNavigate();
  const [earningsData, setEarningsData] = useState<SettlementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettling, setIsSettling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadEarnings = async () => {
      try {
        const data = await fetchApi<SettlementData>(`/api/v1/settlement/balance?id=${businessId}`);
        setEarningsData(data);
      } catch (err) {
        console.error('Failed to load settlement data');
      } finally {
        setIsLoading(false);
      }
    };
    loadEarnings();
  }, [businessId]);

  const handleInitiateSettlement = async () => {
    if (!earningsData || earningsData.available_balance <= 0) return;
    setIsSettling(true);
    try {
      await fetchApi('/api/v1/settlement/egress', {
        method: 'POST',
        body: JSON.stringify({ amount: earningsData.available_balance }),
      });
      setSuccessMessage('Settlement initiated. Funds will arrive via ACH/RTP within 24 hours.');
    } catch (err) {
      console.error('Settlement failed');
    } finally {
      setIsSettling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-400" />
            Earnings &amp; Settlement
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your ecosystem revenue and bank transfers.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase">Worldpay Egress Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <div className="md:col-span-2 bg-card border border-border rounded-2xl p-8 flex flex-col justify-between shadow-xl">
          <div>
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Available for Settlement</span>
            <div className="text-5xl font-mono font-bold text-foreground mt-2">
              ${earningsData?.available_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-4 mt-6">
              <div className="text-xs text-muted-foreground">
                <span className="block text-muted-foreground/70 uppercase font-bold text-[10px]">Pending Clearing</span>
                <span className="font-mono text-foreground">${earningsData?.pending_balance.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="block text-muted-foreground/70 uppercase font-bold text-[10px]">Lifetime Earnings</span>
                <span className="font-mono text-foreground">${earningsData?.lifetime_earnings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleInitiateSettlement}
              disabled={isSettling || !earningsData || earningsData.available_balance <= 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
            >
              {isSettling ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  <Banknote className="w-5 h-5" /> Settle to Bank Account
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bank Connection Card */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground/80 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" /> Destination
            </h3>
            <div className="p-4 bg-muted/30 border border-border rounded-xl mb-4">
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Verified Bank Account</div>
              <div className="text-sm text-foreground font-mono">**** **** {earningsData?.bank_last4}</div>
              <div className="text-[10px] text-emerald-500 mt-1 font-bold">RTP/ACH Enabled</div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Settlements are processed via <strong>Worldpay Egress Rails</strong>.
              Funds are pushed directly to your verified commercial account.
            </p>
          </div>
          <button onClick={() => navigate('/earnings/banking')} className="mt-4 text-[10px] text-primary hover:underline flex items-center gap-1">
            Update Banking Details <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 p-4 rounded-xl flex items-center gap-3 text-emerald-200 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          {successMessage}
        </div>
      )}

      {/* Compliance Note */}
      <div className="p-4 bg-muted/20 border border-border rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-tight">
          IDIA Data Inc. maintains a zero-commingling treasury. These funds are held in a <strong>For Benefit Of (FBO)</strong> custody account and are legally distinct from IDIA operating revenue.
        </p>
      </div>
    </div>
  );
};

export default EarningsSettlement;
