import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Zap, Check, CreditCard, ShieldCheck, Tag, Loader2, ArrowRight } from 'lucide-react';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import SynapseGasGauge from './SynapseGasGauge';

const BASE_RATE = 0.75;

const creditTiers = [
  { id: 'tier1', name: 'Tier 1', credits: 1000, rate: 0.70, popular: false, description: 'Minimum bulk entry' },
  { id: 'tier2', name: 'Tier 2', credits: 5000, rate: 0.65, popular: true, description: 'Standard operational capacity' },
  { id: 'tier3', name: 'Tier 3', credits: 20000, rate: 0.60, popular: false, description: 'Maximum volume discount' },
];

interface SynapsePurchaseModalProps {
  trigger?: React.ReactNode;
}

const SynapsePurchaseModal = ({ trigger }: SynapsePurchaseModalProps) => {
  const { balanceData, refreshBalance } = useSynapseCredits();
  const currentBalance = balanceData?.available_credits ?? 0;
  const [selectedTier, setSelectedTier] = useState<string>('tier2');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [open, setOpen] = useState(false);

  const currentSelection = creditTiers.find(t => t.id === selectedTier) || creditTiers[1];
  const usdAmount = currentSelection.credits * currentSelection.rate;
  const baseRateCost = currentSelection.credits * BASE_RATE;
  const savings = baseRateCost - usdAmount;

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const response = await fetchApi('/api/v1/billing/worldpay/initiate', {
        method: 'POST',
        body: JSON.stringify({
          credit_amount: currentSelection.credits,
          usd_amount: usdAmount,
          rate_applied: currentSelection.rate,
          currency: 'USD',
        }),
      });

      if (response.payment_url && response.payment_url !== '#worldpay-mock') {
        window.location.href = response.payment_url;
      } else {
        toast.success('Worldpay Session Initialized (Mock)', {
          description: `Session ${response.session_id} created for ${currentSelection.credits.toLocaleString()} CRD ($${usdAmount.toLocaleString()}).`
        });
      }
      await refreshBalance();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize Worldpay secure checkout.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            Buy Credits
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Coins className="h-5 w-5 text-primary" />
            Purchase Synapse Credits
          </DialogTitle>
          <DialogDescription>
            Fuel your data operations with Synapse Gas credits
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Current Balance */}
          <div className="flex justify-center">
            <SynapseGasGauge />
          </div>

          {/* Credit Tiers */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Select Volume Tranche</h4>
            <div className="grid grid-cols-1 gap-3">
              {creditTiers.map((tier) => {
                const isSelected = selectedTier === tier.id;
                const usdCost = tier.credits * tier.rate;
                return (
                  <Card
                    key={tier.id}
                    className={`relative p-4 cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? 'ring-2 ring-primary border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    {tier.popular && (
                      <Badge className="absolute -top-2 right-3 text-xs">Most Popular</Badge>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-muted-foreground/50'}`}>
                          {isSelected && <div className="w-2 h-2 bg-primary rounded-full" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{tier.name}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                              ${tier.rate.toFixed(2)} / CRD
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-foreground font-mono">
                          {tier.credits.toLocaleString()} <span className="text-xs text-muted-foreground font-sans">CRD</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ${usdCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Transaction Summary */}
          <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Transaction Summary</h4>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Balance</span>
              <span className="text-foreground font-mono">{currentBalance.toLocaleString()} CRD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Credits to Add</span>
              <span className="text-emerald-400 font-mono">+{currentSelection.credits.toLocaleString()} CRD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Effective Rate</span>
              <span className="text-foreground font-mono">${currentSelection.rate.toFixed(2)} / CRD</span>
            </div>
            {savings > 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                <Tag className="w-4 h-4" />
                Volume discount applied. You save ${savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}.
              </div>
            )}
            <div className="pt-3 border-t border-border flex justify-between items-end">
              <span className="text-foreground font-medium">Total Due</span>
              <div className="text-right">
                <div className="text-xl font-bold text-foreground font-mono">
                  ${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground uppercase">USD</div>
              </div>
            </div>
          </div>

          {/* Purchase Button */}
          <Button
            className="w-full gap-2"
            size="lg"
            disabled={isPurchasing}
            onClick={handlePurchase}
          >
            {isPurchasing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Continue to Worldpay <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Encrypted & Secured by Worldpay</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Corporate Cards & ACH Accepted</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SynapsePurchaseModal;
