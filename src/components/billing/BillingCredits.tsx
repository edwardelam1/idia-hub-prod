import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, TrendingUp, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { useBillingData } from '@/hooks/useBillingData';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { Skeleton } from '@/components/ui/skeleton';
import AvailablePlansDialog from './AvailablePlansDialog';

const BillingCredits = () => {
  const {
    currentUsage, subscriptionPlan, subscription, daysRemaining, invoices,
    isLoading, downloadInvoice,
  } = useBillingData();
  const { balanceData } = useSynapseCredits();

  const [showPlans, setShowPlans] = useState(false);

  const liveBalance = balanceData?.available_credits ?? 0;
  const usagePercentage = currentUsage.limit > 0 ? (currentUsage.used / currentUsage.limit) * 100 : 0;
  const projectedUsage = new Date().getDate() > 0 ? Math.round(currentUsage.used * (30 / new Date().getDate())) : 0;

  const currentTier = subscription?.tier?.toLowerCase() ?? 'base';

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
    <Tabs defaultValue="overview" className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 pt-6 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hub Enrollment</h1>
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

                  {pmType.includes('wallet') ? (
                    <>
                      <div>
                        <Label>Wallet Name</Label>
                        <Input placeholder="e.g. MetaMask" value={pmLabel} onChange={e => setPmLabel(e.target.value)} />
                      </div>
                      <div>
                        <Label>Wallet Address (prefix)</Label>
                        <Input placeholder="0x71C7..." value={pmIdentifier} onChange={e => setPmIdentifier(e.target.value)} maxLength={42} />
                      </div>
                      <Button onClick={handleAddPM} disabled={addPaymentMethod.isPending} className="w-full">
                        {addPaymentMethod.isPending ? 'Adding...' : 'Add Payment Method'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        id="worldpay-sdk-container"
                        className="min-h-[150px] border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50"
                      >
                        <div className="text-center p-4">
                          <CreditCard className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground">Worldpay Secure SDK Port Initializing...</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Card & bank details captured securely by Worldpay</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                        <ShieldCheck className="h-3 w-3" />
                        PCI-DSS Level 1 — Encryption provided by Worldpay
                      </div>
                      <Button disabled className="w-full">
                        Authorize via Worldpay
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <TabsContent value="overview" className="space-y-4 mt-0">
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
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 mt-0">
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

        <TabsContent value="subscription" className="space-y-4 mt-0">
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
                          <li key={i} className="flex items-center"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-2 shrink-0" />{f}</li>
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
            <DialogContent className="max-w-2xl max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>Available Plans</DialogTitle>
                <DialogDescription>Choose the plan that fits your needs</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="analyst">
                <TabsList className="w-full">
                  {PLAN_TIERS.map(tier => (
                    <TabsTrigger key={tier} value={tier} className="flex-1 capitalize">
                      {PLAN_PRICING[tier].name}
                      {currentTier === tier && <Badge variant="outline" className="ml-2 text-[10px]">Current</Badge>}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {PLAN_TIERS.map(tier => {
                  const plan = PLAN_PRICING[tier];
                  const isCurrent = currentTier === tier;
                  return (
                    <TabsContent key={tier} value={tier} className="mt-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{plan.cost}</div>
                          {isCurrent && <Badge className="mt-1">Active</Badge>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Features & Benefits</h4>
                          <ul className="space-y-1.5 text-sm text-muted-foreground">
                            {plan.features.map((f, i) => (
                              <li key={i} className="flex items-start">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mr-2 mt-0.5 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Usage Limits</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg border">
                              <div className="text-lg font-bold">{plan.limits.credits.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">Credits / year</div>
                            </div>
                            <div className="p-3 rounded-lg border">
                              <div className="text-lg font-bold">{plan.limits.apiCalls >= 10000000 ? 'Unlimited' : plan.limits.apiCalls.toLocaleString()}</div>
                              <div className="text-xs text-muted-foreground">API Calls / mo</div>
                            </div>
                            <div className="p-3 rounded-lg border">
                              <div className="text-lg font-bold">{plan.limits.dataExport >= 1000 ? 'Unlimited' : `${plan.limits.dataExport}GB`}</div>
                              <div className="text-xs text-muted-foreground">Data Export / mo</div>
                            </div>
                            <div className="p-3 rounded-lg border">
                              <div className="text-lg font-bold">{plan.limits.teamMembers}</div>
                              <div className="text-xs text-muted-foreground">Team Members</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        variant={isCurrent ? 'outline' : 'default'}
                        disabled={isCurrent}
                        onClick={() => {
                          setShowPlans(false);
                          navigate(`/purchase?plan=${tier}`);
                        }}
                      >
                        {isCurrent ? 'Current Plan' : 'Select Plan'}
                      </Button>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4 mt-0">
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
      </div>
    </Tabs>
  );
};

export default BillingCredits;
