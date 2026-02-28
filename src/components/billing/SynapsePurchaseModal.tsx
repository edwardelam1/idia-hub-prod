import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Coins, Zap, Star, Rocket, CreditCard, Check } from 'lucide-react';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { toast } from 'sonner';
import SynapseGasGauge from './SynapseGasGauge';

const creditTiers = [
  { id: 'starter', name: 'Starter', credits: 500, price: 49, icon: Zap, popular: false, perCredit: '0.098' },
  { id: 'pro', name: 'Professional', credits: 2500, price: 199, icon: Star, popular: true, perCredit: '0.080' },
  { id: 'enterprise', name: 'Enterprise', credits: 10000, price: 649, icon: Rocket, popular: false, perCredit: '0.065' },
];

interface SynapsePurchaseModalProps {
  trigger?: React.ReactNode;
}

const SynapsePurchaseModal = ({ trigger }: SynapsePurchaseModalProps) => {
  const { balanceData, refreshBalance } = useSynapseCredits();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [open, setOpen] = useState(false);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    // Mock purchase flow
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('Synapse Credits purchased successfully!', {
      description: `Credits will be available in your wallet shortly.`
    });
    setIsPurchasing(false);
    setSelectedTier(null);
    setCustomAmount('');
    await refreshBalance();
    setOpen(false);
  };

  const customCredits = customAmount ? parseFloat(customAmount) : 0;
  const customPrice = customCredits > 0 ? (customCredits * 0.085).toFixed(2) : '0.00';

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
            <h4 className="text-sm font-semibold text-foreground">Select a Credit Package</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {creditTiers.map((tier) => {
                const Icon = tier.icon;
                const isSelected = selectedTier === tier.id;
                return (
                  <Card
                    key={tier.id}
                    className={`relative p-4 cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? 'ring-2 ring-primary border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => { setSelectedTier(tier.id); setCustomAmount(''); }}
                  >
                    {tier.popular && (
                      <Badge className="absolute -top-2 right-3 text-xs">Most Popular</Badge>
                    )}
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className={`p-2 rounded-full ${isSelected ? 'bg-primary/20' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h5 className="font-semibold text-sm">{tier.name}</h5>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {tier.credits.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">credits</p>
                      </div>
                      <div className="pt-2 border-t border-border w-full">
                        <p className="text-lg font-bold text-foreground">${tier.price}</p>
                        <p className="text-xs text-muted-foreground">${tier.perCredit}/credit</p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary absolute top-3 left-3" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Or Enter Custom Amount</h4>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Enter credit amount"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedTier(null); }}
                className="flex-1"
              />
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                = <span className="font-semibold text-foreground">${customPrice}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">$0.085 per credit for custom amounts</p>
          </div>

          {/* Purchase Button */}
          <Button
            className="w-full gap-2"
            size="lg"
            disabled={!selectedTier && customCredits <= 0 || isPurchasing}
            onClick={handlePurchase}
          >
            {isPurchasing ? (
              <>Processing...</>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                {selectedTier
                  ? `Purchase ${creditTiers.find(t => t.id === selectedTier)?.credits.toLocaleString()} Credits — $${creditTiers.find(t => t.id === selectedTier)?.price}`
                  : customCredits > 0
                    ? `Purchase ${customCredits.toLocaleString()} Credits — $${customPrice}`
                    : 'Select a Package'
                }
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SynapsePurchaseModal;
