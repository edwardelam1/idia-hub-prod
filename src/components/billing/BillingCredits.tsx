import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Download, TrendingUp, AlertTriangle, FileText, Building, Wallet, Landmark, Plus } from 'lucide-react';
import { useBillingData } from '@/hooks/useBillingData';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const PAYMENT_TYPES = [
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { value: 'bank_ach', label: 'Bank (ACH)', icon: Landmark },
  { value: 'bank_wire', label: 'Bank (Wire)', icon: Building },
  { value: 'dex_wallet', label: 'DEX Wallet', icon: Wallet },
  { value: 'idia_life_wallet', label: 'IDIA Life Wallet', icon: Wallet },
];

const PLANS = [
  { name: 'Analyst', price: '$9,995/yr', credits: '5,000', calls: '10,000', id: 'analyst' },
  { name: 'Professional', price: '$24,995/yr', credits: '20,000', calls: '100,000', id: 'professional' },
  { name: 'Enterprise', price: '$49,995+/yr', credits: '50,000+', calls: 'Unlimited', id: 'enterprise' },
];

const BillingCredits = () => {
  const navigate = useNavigate();
  const {
    currentUsage, subscriptionPlan, subscription, daysRemaining, paymentMethods, invoices,
    isLoading, addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod, downloadInvoice,
  } = useBillingData();
  const { balanceData } = useSynapseCredits();

  const [showAddPM, setShowAddPM] = useState(false);
  const [pmType, setPmType] = useState('credit_card');
  const [pmLabel, setPmLabel] = useState('');
  const [pmIdentifier, setPmIdentifier] = useState('');
  const [showPlans, setShowPlans] = useState(false);

  const liveBalance = balanceData?.available_credits ?? 0;
  const usagePercentage = currentUsage.limit > 0 ? (currentUsage.used / currentUsage.limit) * 100 : 0;
  const projectedUsage = new Date().getDate() > 0 ? Math.round(currentUsage.used * (30 / new Date().getDate())) : 0;

  const handleAddPM = () => {
    if (!pmLabel.trim() || !pmIdentifier.trim()) { toast.error('Fill in all fields'); return; }
    addPaymentMethod.mutate({ paymentToken: pmIdentifier, display_label: pmLabel });
    setPmLabel('');
    setPmIdentifier('');
    setShowAddPM(false);
  };

  const getMethodIcon = (type: string) => {
    const found = PAYMENT_TYPES.find(p => p.value === type);
    const Icon = found?.icon ?? CreditCard;
    return <Icon className="h-5 w-5" />;
  };

  const getMethodLabel = (type: string) => PAYMENT_TYPES.find(p => p.value === type)?.label ?? type;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Credits</h1>
          <p className="text-muted-foreground">Manage your subscription, credits, and billing</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={liveBalance > 1000 ? "default" : "destructive"}>
            {liveBalance.toLocaleString()} Credits Remaining
          </Badge>
          <Dialog open={showAddPM} onOpenChange={setShowAddPM}>
            <DialogTrigger asChild>
              <Button><CreditCard className="h-4 w-4 mr-2" /> Add Payment Method</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>Choose your payment type and enter details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Payment Type</Label>
                  <Select value={pmType} onValueChange={setPmType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map(pt => (
                        <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{pmType.includes('wallet') ? 'Wallet Name' : pmType.includes('bank') ? 'Bank Name' : 'Card Brand'}</Label>
                  <Input placeholder={pmType.includes('wallet') ? 'e.g. MetaMask' : pmType.includes('bank') ? 'e.g. Chase' : 'e.g. Visa'} value={pmLabel} onChange={e => setPmLabel(e.target.value)} />
                </div>
                <div>
                  <Label>{pmType.includes('wallet') ? 'Wallet Address (prefix)' : pmType.includes('bank') ? 'Account Last 4' : 'Card Last 4'}</Label>
                  <Input placeholder={pmType.includes('wallet') ? '0x71C7...' : '1234'} value={pmIdentifier} onChange={e => setPmIdentifier(e.target.value)} maxLength={pmType.includes('wallet') ? 42 : 4} />
                </div>
                <Button onClick={handleAddPM} disabled={addPaymentMethod.isPending} className="w-full">
                  {addPaymentMethod.isPending ? 'Adding...' : 'Add Payment Method'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Current Usage</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUsage.used.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">of {currentUsage.limit.toLocaleString()} credits</div>
            <Progress value={usagePercentage} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Plan</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionPlan.cost}</div>
            <div className="text-sm text-muted-foreground">{subscriptionPlan.name} Plan</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Projected Usage</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectedUsage.toLocaleString()}</div>
            <div className={`text-sm flex items-center ${projectedUsage > currentUsage.limit ? 'text-destructive' : 'text-emerald-500'}`}>
              {projectedUsage > currentUsage.limit ? <><AlertTriangle className="h-4 w-4 mr-1" />Over limit</> : <><TrendingUp className="h-4 w-4 mr-1" />Within limit</>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Next Billing</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daysRemaining > 0 ? daysRemaining : '—'}</div>
            <div className="text-sm text-muted-foreground">{daysRemaining > 0 ? 'days remaining' : 'No active period'}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>Download and view your billing history</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No invoices yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice: any) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><FileText className="h-5 w-5" /></div>
                        <div>
                          <div className="font-medium">Invoice #{invoice.invoice_number}</div>
                          <div className="text-sm text-muted-foreground">{new Date(invoice.created_at).toLocaleDateString()} • {invoice.period}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">${Number(invoice.amount).toLocaleString()}</div>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>{invoice.status}</Badge>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => downloadInvoice(invoice.id)}>
                          <Download className="h-4 w-4 mr-2" /> Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Manage your subscription plan and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!subscription ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">No active subscription. Choose a plan to get started.</p>
                  <Button onClick={() => setShowPlans(true)}>View Plans</Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <div className="font-medium text-lg">{subscriptionPlan.name} Plan</div>
                      <div className="text-muted-foreground">{subscriptionPlan.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Status: <Badge variant="outline">{subscription.status}</Badge>
                        {subscription.expires_at && ` • Expires: ${new Date(subscription.expires_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{subscriptionPlan.cost}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Features Included:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {subscriptionPlan.features.map((f: string, i: number) => (
                          <li key={i} className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Usage Limits:</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Credits: {subscriptionPlan.limits.credits.toLocaleString()}/year</div>
                        <div>API Calls: {subscriptionPlan.limits.apiCalls.toLocaleString()}/month</div>
                        <div>Data Export: {subscriptionPlan.limits.dataExport}GB/month</div>
                        <div>Team Members: {subscriptionPlan.limits.teamMembers}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={() => setShowPlans(true)}>Upgrade Plan</Button>
                    <Button variant="outline" onClick={() => setShowPlans(true)}>View All Plans</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Dialog open={showPlans} onOpenChange={setShowPlans}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Available Plans</DialogTitle>
                <DialogDescription>Choose the plan that fits your needs</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-3">
                {PLANS.map(plan => (
                  <div key={plan.name} className={`border rounded-lg p-4 space-y-3 ${subscription?.tier?.toLowerCase() === plan.id ? 'border-primary bg-primary/5' : ''}`}>
                    <h4 className="font-semibold">{plan.name}</h4>
                    <div className="text-2xl font-bold">{plan.price}</div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• {plan.credits} credits included</li>
                      <li>• {plan.calls} API calls/month</li>
                    </ul>
                    <Button
                      variant={subscription?.tier?.toLowerCase() === plan.id ? 'outline' : 'default'}
                      className="w-full"
                      disabled={subscription?.tier?.toLowerCase() === plan.id}
                      onClick={() => {
                        setShowPlans(false);
                        navigate(`/purchase?plan=${plan.id}`);
                      }}
                    >
                      {subscription?.tier?.toLowerCase() === plan.id ? 'Current Plan' : 'Select Plan'}
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your payment methods and billing preferences</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="mb-4">No payment methods added yet.</p>
                  <Button variant="outline" onClick={() => setShowAddPM(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Payment Method
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method: any) => (
                    <div key={method.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">{getMethodIcon(method.method_type)}</div>
                        <div>
                          <div className="font-medium">{method.display_label} •••• {method.identifier}</div>
                          <div className="text-sm text-muted-foreground">{getMethodLabel(method.method_type)}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {method.is_default && <Badge variant="default">Default</Badge>}
                        {!method.is_default && (
                          <Button size="sm" variant="outline" onClick={() => setDefaultPaymentMethod.mutate(method.id)}>Set Default</Button>
                        )}
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => removePaymentMethod.mutate(method.id)} disabled={removePaymentMethod.isPending}>Remove</Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => setShowAddPM(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Add New Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BillingCredits;
