import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Zap, CreditCard, ShieldCheck, Tag, Loader2, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCredits } from '@/lib/utils';
import SynapseGasGauge from './SynapseGasGauge';

const BASE_RATE = 0.75;

const creditTiers = [
  { id: 'tier1', name: 'Tier 1', credits: 1000, rate: 0.70, popular: false, description: 'Minimum bulk entry' },
  { id: 'tier2', name: 'Tier 2', credits: 5000, rate: 0.65, popular: true, description: 'Standard operational capacity' },
  { id: 'tier3', name: 'Tier 3', credits: 20000, rate: 0.60, popular: false, description: 'Maximum volume discount' },
];

interface SynapsePurchaseModalProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  insufficientWarning?: string;
}

const SynapsePurchaseModal = ({ trigger, defaultOpen, onOpenChange, insufficientWarning }: SynapsePurchaseModalProps) => {
  const { balanceData, refreshBalance } = useSynapseCredits();
  const currentBalance = balanceData?.available_credits ?? 0;
  const [selectedTier, setSelectedTier] = useState<string>('tier2');
  const [step, setStep] = useState<'select' | 'payment' | 'processing' | 'success'>('select');
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [purchaseMode, setPurchaseMode] = useState<'tier' | 'alacarte'>('tier');
  const [alacarteAmount, setAlacarteAmount] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const currentTier = creditTiers.find(t => t.id === selectedTier) || creditTiers[1];

  const alacarteUsd = parseInt(alacarteAmount) || 0;
  const alacarteCredits = Math.floor(alacarteUsd / BASE_RATE);
  const alacarteValid = alacarteUsd >= 10 && alacarteUsd <= 1000;

  const displayCredits = purchaseMode === 'alacarte' ? alacarteCredits : currentTier.credits;
  const usdAmount = purchaseMode === 'alacarte' ? alacarteUsd : currentTier.credits * currentTier.rate;
  const baseRateCost = purchaseMode === 'alacarte' ? alacarteUsd : currentTier.credits * BASE_RATE;
  const savings = purchaseMode === 'alacarte' ? 0 : baseRateCost - usdAmount;
  const canProceed = purchaseMode === 'alacarte' ? alacarteValid : true;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChange?.(isOpen);
    if (!isOpen) {
      setStep('select');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setPurchaseMode('tier');
      setAlacarteAmount('');
    }
  };

  const handleProceedToPayment = () => {
    if (!canProceed) return;
    setStep('payment');
  };

  const handleAlacarteInput = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 4) {
      setAlacarteAmount(digits);
    }
  };

  const handlePurchase = async () => {
    if (!cardNumber || !cardExpiry || !cardCvv) {
      toast.error('Please fill in all payment fields');
      return;
    }
    setStep('processing');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data, error } = await supabase.functions.invoke('top-up-credits', {
        body: {
          user_id: (await supabase.auth.getUser()).data.user?.id ?? 'mock-ent-9921',
          credit_amount: displayCredits,
          usd_amount: usdAmount,
          payment_reference: `WP-${crypto.randomUUID().slice(0, 8)}`,
        },
      });

      if (error) throw error;

      setStep('success');
      toast.success('Synapse Credits added successfully!', {
        description: `${formatCredits(displayCredits)} added to your account.`,
      });
      await refreshBalance();

      setTimeout(() => handleOpenChange(false), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Payment processing failed.');
      setStep('payment');
    }
  };

  const formatCardNumber = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            {step === 'payment' ? 'Enter Payment Details' : step === 'processing' ? 'Processing...' : step === 'success' ? 'Purchase Complete' : 'Purchase Synapse Credits'}
          </DialogTitle>
          <DialogDescription>
            {step === 'payment' ? 'Securely enter your card details' : 'Fuel your data operations with Synapse Credits'}
          </DialogDescription>
        </DialogHeader>

        {insufficientWarning && step === 'select' && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="text-sm text-destructive font-medium">{insufficientWarning}</span>
          </div>
        )}

        <div className="space-y-6 pt-2">
          {step === 'select' && (
            <>
              <div className="flex justify-center">
                <SynapseGasGauge />
              </div>

              {/* Mode Toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setPurchaseMode('tier')}
                  className={`flex-1 text-sm font-medium py-2.5 px-4 transition-colors ${
                    purchaseMode === 'tier'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Volume Tranches
                </button>
                <button
                  onClick={() => setPurchaseMode('alacarte')}
                  className={`flex-1 text-sm font-medium py-2.5 px-4 transition-colors ${
                    purchaseMode === 'alacarte'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  A La Carte
                </button>
              </div>

              {purchaseMode === 'tier' ? (
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
                            isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedTier(tier.id)}
                        >
                          {tier.popular && <Badge className="absolute -top-2 right-3 text-xs">Most Popular</Badge>}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-muted-foreground/50'}`}>
                                {isSelected && <div className="w-2 h-2 bg-primary rounded-full" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-foreground">{tier.name}</span>
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">${tier.rate.toFixed(2)} / CR</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{tier.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-foreground font-mono">
                                {formatCredits(tier.credits)}
                              </div>
                              <p className="text-xs text-muted-foreground">${usdCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Custom Amount</h4>
                  <p className="text-xs text-muted-foreground">Enter a whole dollar amount between $10 and $1,000. Credits are calculated at the base rate of ${BASE_RATE.toFixed(2)}/CR.</p>
                  <div className="space-y-2">
                    <Label>Purchase Amount</Label>
                    <div className="flex items-center gap-0">
                      <span className="flex items-center justify-center h-10 px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm font-medium text-muted-foreground">$</span>
                      <Input
                        className="rounded-none border-r-0 font-mono text-lg"
                        placeholder="100"
                        value={alacarteAmount}
                        onChange={(e) => handleAlacarteInput(e.target.value)}
                        inputMode="numeric"
                      />
                      <span className="flex items-center justify-center h-10 px-3 bg-muted border border-l-0 border-input rounded-r-md text-sm font-medium text-muted-foreground">.00</span>
                    </div>
                    {alacarteAmount && !alacarteValid && (
                      <p className="text-xs text-destructive">
                        {alacarteUsd < 10 ? 'Minimum purchase is $10.00' : 'Maximum purchase is $1,000.00'}
                      </p>
                    )}
                    {alacarteValid && (
                      <p className="text-xs text-emerald-500">
                        You will receive <span className="font-mono font-bold">{formatCredits(alacarteCredits)}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction Summary */}
              <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Transaction Summary</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="text-foreground font-mono">{formatCredits(currentBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credits to Add</span>
                  <span className="text-emerald-500 font-mono">+{formatCredits(displayCredits)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="text-foreground font-mono">
                    ${purchaseMode === 'alacarte' ? BASE_RATE.toFixed(2) : currentTier.rate.toFixed(2)} / CR
                  </span>
                </div>
                {savings > 0 && (
                  <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                    <Tag className="w-4 h-4" />
                    Volume discount applied. You save ${savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}.
                  </div>
                )}
                <div className="pt-3 border-t border-border flex justify-between items-end">
                  <span className="text-foreground font-medium">Total Due</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-foreground font-mono">${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div className="text-xs text-muted-foreground uppercase">USD</div>
                  </div>
                </div>
              </div>

              <Button className="w-full gap-2" size="lg" onClick={handleProceedToPayment} disabled={!canProceed}>
                Continue to Payment <ArrowRight className="w-4 h-4" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">Funds held in secure FBO account at Airwallex</p>
            </>
          )}

          {step === 'payment' && (
            <>
              <div className="space-y-4">
                <div className="bg-muted/50 border border-border rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Purchasing</p>
                    <p className="font-bold text-foreground">{formatCredits(displayCredits)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-bold text-foreground font-mono">${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Card Number</Label>
                    <Input
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Expiry</Label>
                      <Input
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value.replace(/[^\d/]/g, '').slice(0, 5))}
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      <Input
                        type="password"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="gap-2" onClick={() => setStep('select')}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button className="flex-1 gap-2" size="lg" onClick={handlePurchase}>
                  <CreditCard className="w-4 h-4" /> Pay ${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Button>
              </div>

              <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Encrypted & Secured by Worldpay</span>
                </div>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-foreground font-semibold">Verifying payment...</p>
              <p className="text-muted-foreground text-sm">Please do not close this window</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="text-foreground font-bold text-lg">Payment Successful!</p>
              <p className="text-muted-foreground text-sm">
                {formatCredits(displayCredits)} have been added to your ledger.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SynapsePurchaseModal;
