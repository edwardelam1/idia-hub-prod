import { useState } from 'react';
import { CreditCard, Zap, ShieldCheck, Loader2, ArrowRight, Tag } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { toast } from '@/hooks/use-toast';

interface PricingTier {
  crd: number;
  label: string;
  rate: number;
  description: string;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  { crd: 1000, label: 'Tier 1', rate: 0.70, description: 'Minimum bulk entry' },
  { crd: 5000, label: 'Tier 2', rate: 0.65, popular: true, description: 'Standard operational capacity' },
  { crd: 20000, label: 'Tier 3', rate: 0.60, description: 'Maximum volume discount' },
];

const BASE_RATE = 0.75;

const SynapseTopUp = () => {
  const { balanceData } = useSynapseCredits();
  const currentBalance = balanceData?.available_credits ?? 0;

  const [selectedTier, setSelectedTier] = useState(5000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSelection = pricingTiers.find(t => t.crd === selectedTier) || pricingTiers[1];
  const usdAmount = currentSelection.crd * currentSelection.rate;
  const baseRateCost = currentSelection.crd * BASE_RATE;
  const savings = baseRateCost - usdAmount;

  const handleWorldpayCheckout = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetchApi('/api/v1/billing/worldpay/initiate', {
        method: 'POST',
        body: JSON.stringify({
          credit_amount: currentSelection.crd,
          usd_amount: usdAmount,
          rate_applied: currentSelection.rate,
          currency: 'USD',
        }),
      });

      if (response.payment_url && response.payment_url !== '#worldpay-mock') {
        window.location.href = response.payment_url;
      } else {
        toast({
          title: 'Worldpay Session Initialized (Mock)',
          description: `Session ${response.session_id} created for ${currentSelection.crd.toLocaleString()} CRD ($${usdAmount.toLocaleString()}).`,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Worldpay secure checkout.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Fund Synapse Wallet
        </h1>
        <p className="text-muted-foreground mt-2">
          Purchase bulk Synapse Credits (CRD) to execute data queries and fund Liability Shield protocol transfers. Larger tranches unlock lower per-credit rates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Tiers */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Select Volume Tranche</h2>
          <div className="grid grid-cols-1 gap-4">
            {pricingTiers.map((tier) => {
              const usdCost = tier.crd * tier.rate;
              const isSelected = selectedTier === tier.crd;
              return (
                <div
                  key={tier.crd}
                  onClick={() => setSelectedTier(tier.crd)}
                  className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-muted-foreground/30'
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-muted-foreground/50'}`}>
                        {isSelected && <div className="w-2 h-2 bg-primary rounded-full" />}
                      </div>
                      <span className="text-foreground font-semibold">{tier.label}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                        ${tier.rate.toFixed(2)} / CRD
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-7">{tier.description}</p>
                  </div>

                  <div className="text-left sm:text-right ml-7 sm:ml-0">
                    <div className="text-2xl font-bold text-foreground font-mono">
                      {tier.crd.toLocaleString()} <span className="text-sm text-muted-foreground font-sans">CRD</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${usdCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Summary */}
        <div className="bg-card border border-border rounded-xl p-6 h-fit sticky top-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Transaction Summary</h2>

          <div className="flex justify-between text-sm mb-4">
            <span className="text-muted-foreground">Current Balance</span>
            <span className="text-foreground font-mono">{currentBalance.toLocaleString()} CRD</span>
          </div>

          <div className="flex justify-between text-sm mb-4">
            <span className="text-muted-foreground">Credits to Add</span>
            <span className="text-emerald-400 font-mono">+{currentSelection.crd.toLocaleString()} CRD</span>
          </div>

          <div className="flex justify-between text-sm mb-4">
            <span className="text-muted-foreground">Effective Rate</span>
            <span className="text-foreground font-mono">${currentSelection.rate.toFixed(2)} / CRD</span>
          </div>

          {savings > 0 && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg mb-6">
              <Tag className="w-4 h-4" />
              Volume discount applied. You save ${savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}.
            </div>
          )}

          <div className="pt-6 border-t border-border flex justify-between items-end mb-8">
            <span className="text-foreground font-medium">Total Due</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground font-mono">
                ${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground uppercase">USD</div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-xs text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleWorldpayCheckout}
            disabled={isProcessing}
            className="w-full flex justify-center items-center px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Continue to Worldpay <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4" />
            <span>Encrypted & Secured by Worldpay</span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span>Corporate Cards & ACH Accepted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SynapseTopUp;
