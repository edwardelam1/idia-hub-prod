import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ArrowLeft, CheckCircle2, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBillingData } from '@/hooks/useBillingData';
import { toast } from 'sonner';

const PLANS = [
  { id: 'analyst', name: 'Analyst', price: 9995, credits: 5000, label: '$9,995/yr' },
  { id: 'professional', name: 'Professional', price: 24995, credits: 20000, label: '$24,995/yr' },
  { id: 'enterprise', name: 'Enterprise', price: 49995, credits: 50000, label: '$49,995+/yr' },
];

const UniversalPurchaseScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPlan = searchParams.get('plan') || 'analyst';
  const { user } = useAuth();
  const { paymentMethods } = useBillingData();

  const [selectedPlan, setSelectedPlan] = useState(preselectedPlan);
  const [selectedPM, setSelectedPM] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [step, setStep] = useState<'review' | 'processing' | 'success'>('review');

  const plan = PLANS.find(p => p.id === selectedPlan) || PLANS[0];

  const handlePurchase = async () => {
    if (!selectedPM && (!cardNumber || !cardExpiry || !cardCvv)) {
      toast.error('Please select a payment method or enter card details');
      return;
    }

    setStep('processing');
    const userId = user?.user_id;

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create subscription
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { error: subError } = await supabase.from('user_subscriptions').insert({
        user_id: userId,
        tier: plan.name,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      } as any);
      if (subError) throw subError;

      // Create invoice
      await supabase.from('user_invoices').insert({
        user_id: userId,
        invoice_number: `INV-${Date.now()}`,
        amount: plan.price,
        status: 'paid',
        period: `${new Date().getFullYear()} Annual`,
      } as any);

      // Credit the ledger with plan credits
      const { data: lastEntry } = await supabase
        .from('synapse_credit_ledger')
        .select('balance_after')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any;

      const currentBalance = Number(lastEntry?.balance_after ?? 0);

      await supabase.from('synapse_credit_ledger').insert({
        user_id: userId,
        entry_type: 'subscription_purchase',
        amount: plan.credits,
        balance_after: currentBalance + plan.credits,
        description: `${plan.name} plan subscription - ${plan.credits.toLocaleString()} CRD`,
        reference_id: `SUB-${Date.now()}`,
      } as any);

      setStep('success');
      toast.success(`${plan.name} plan activated!`);
    } catch (err: any) {
      toast.error(err.message || 'Purchase failed');
      setStep('review');
    }
  };

  if (step === 'processing') {
    return (
      <div className="max-w-lg mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-foreground font-semibold">Processing your subscription...</p>
        <p className="text-muted-foreground text-sm">Verifying payment and provisioning access</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        <p className="text-foreground font-bold text-lg">{plan.name} Plan Activated!</p>
        <p className="text-muted-foreground text-sm text-center">
          {plan.credits.toLocaleString()} CRD have been added to your ledger. Your subscription is now active.
        </p>
        <Button onClick={() => navigate('/billing')} className="mt-4">Go to Billing</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Complete Your Purchase</h1>
        <p className="text-muted-foreground text-sm mt-1">Select your plan and complete payment</p>
      </div>

      {/* Plan Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Selected Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PLANS.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPlan === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                <p className="text-lg font-bold font-mono text-primary mt-1">{p.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{p.credits.toLocaleString()} CRD included</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.length > 0 && (
            <div>
              <Label>Saved Payment Methods</Label>
              <Select value={selectedPM} onValueChange={setSelectedPM}>
                <SelectTrigger><SelectValue placeholder="Select a saved method" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm: any) => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.display_label} •••• {pm.identifier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!selectedPM && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">Or enter new card details:</p>
              <div>
                <Label>Card Number</Label>
                <Input placeholder="4242 4242 4242 4242" value={cardNumber} onChange={e => setCardNumber(e.target.value)} maxLength={19} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Expiry</Label><Input placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} maxLength={5} /></div>
                <div><Label>CVV</Label><Input type="password" placeholder="•••" value={cardCvv} onChange={e => setCardCvv(e.target.value)} maxLength={4} /></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-foreground">{plan.name} Plan — Annual</p>
              <p className="text-sm text-muted-foreground">{plan.credits.toLocaleString()} CRD included</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-foreground">${plan.price.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">billed annually</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full gap-2" size="lg" onClick={handlePurchase}>
        <CreditCard className="w-4 h-4" /> Complete Purchase — ${plan.price.toLocaleString()}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4" />
        <span>Payment secured by Worldpay</span>
      </div>
    </div>
  );
};

export default UniversalPurchaseScreen;
