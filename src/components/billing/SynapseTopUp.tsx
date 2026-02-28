import { useState } from 'react';
import { CreditCard, Zap, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { toast } from '@/hooks/use-toast';

interface PricingTier {
  crd: number;
  label: string;
  popular?: boolean;
}

const CRD_RATE = 0.75;

const pricingTiers: PricingTier[] = [
  { crd: 1000, label: 'Scout Pack' },
  { crd: 5000, label: 'Standard Acquisition' },
  { crd: 15000, label: 'Enterprise Reserve', popular: true },
  { crd: 50000, label: 'Volume Tranche' },
];

const SynapseTopUp = () => {
  const { balanceData } = useSynapseCredits();
  const currentBalance = balanceData?.available_credits ?? 0;

  const [selectedTier, setSelectedTier] = useState(5000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWorldpayCheckout = async () => {
    setIsProcessing(true);
    setError(null);
    const usdAmount = selectedTier * CRD_RATE;

    try {
      const response = await fetchApi('/api/v1/billing/worldpay/initiate', {
        method: 'POST',
        body: JSON.stringify({
          credit_amount: selectedTier,
          usd_amount: usdAmount,
          currency: 'USD',
        }),
      });

      if (response.payment_url && response.payment_url !== '#worldpay-mock') {
        window.location.href = response.payment_url;
      } else {
        // Mock mode — show success toast
        toast({
          title: 'Worldpay Session Initialized (Mock)',
          description: `Session ${response.session_id} created for ${selectedTier.toLocaleString()} CRD ($${usdAmount.toLocaleString()}).`,
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
          Acquire Synapse Credits (CRD) to execute data queries and fund Liability Shield protocol transfers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Tiers */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Select Capacity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pricingTiers.map((tier) => {
              const usdCost = tier.crd * CRD_RATE;
              const isSelected = selectedTier === tier.crd;
              return (
                <div
                  key={tier.crd}
                  onClick={() => setSelectedTier(tier.crd)}
                  className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-muted-foreground/30'
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-foreground text-sm font-medium">{tier.label}</span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-muted-foreground/50'}`}>
                      {isSelected && <div className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground font-mono mb-1">
                    {tier.crd.toLocaleString()} <span className="text-sm text-muted-foreground font-sans">CRD</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${usdCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
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
            <span className="text-muted-foreground">Synapse Credits</span>
            <span className="text-emerald-400 font-mono">+{selectedTier.toLocaleString()} CRD</span>
          </div>

          <div className="flex justify-between text-sm mb-6 pb-6 border-b border-border">
            <span className="text-muted-foreground">Exchange Rate</span>
            <span className="text-foreground font-mono">$0.75 / CRD</span>
          </div>

          <div className="flex justify-between items-end mb-8">
            <span className="text-foreground font-medium">Total Due</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground font-mono">
                ${(selectedTier * CRD_RATE).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
