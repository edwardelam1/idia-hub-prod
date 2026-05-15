import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  TrendingUp,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  CreditCard,
  Coins,
  Receipt,
} from "lucide-react";
import { useBillingData } from "@/hooks/useBillingData";
import { Skeleton } from "@/components/ui/skeleton";
import AvailablePlansDialog from "./AvailablePlansDialog";
import { formatCredits } from "@/lib/utils";

const BillingCredits = () => {
  const {
    currentUsage,
    subscriptionPlan,
    subscription,
    daysRemaining,
    invoices,
    isLoading,
    downloadInvoice,
  } = useBillingData();
  const ledgerTransactions: any[] = [];

  const [showPlans, setShowPlans] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const usagePercentage = currentUsage.limit > 0 ? (currentUsage.used / currentUsage.limit) * 100 : 0;
  const projectedUsage = new Date().getDate() > 0 ? Math.round(currentUsage.used * (30 / new Date().getDate())) : 0;
  const currentTier = subscription?.tier?.toLowerCase() ?? "base";

  const toggleExpand = (id: string) => {
    setExpandedTx(expandedTx === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="flex flex-col h-full bg-background/50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-6 pt-6 pb-4 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Hub</h1>
            <p className="text-muted-foreground">Settlement ledger, credit provisioning, and subscription management</p>
          </div>
          <Badge variant="outline" className="mb-1 py-1 px-3 border-primary/30 bg-primary/5 text-primary">
            Genesis Network Status: Active
          </Badge>
        </div>

        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview">Network Overview</TabsTrigger>
          <TabsTrigger value="ledger">Activity Ledger</TabsTrigger>
          <TabsTrigger value="invoices">Invoice Archive</TabsTrigger>
          <TabsTrigger value="subscription">Protocol Tier</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="border-primary/10 bg-gradient-to-br from-card to-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Available Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">
                  {formatCredits(currentUsage.limit - currentUsage.used)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Operational Capacity</div>
                <Progress value={usagePercentage} className="mt-4 h-1.5" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Current Protocol
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{subscriptionPlan.name}</div>
                <div className="text-sm font-mono text-muted-foreground mt-1">{subscriptionPlan.cost} / Year</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Projected Burn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{projectedUsage.toLocaleString()}</div>
                <div
                  className={`text-xs flex items-center mt-1 ${projectedUsage > currentUsage.limit ? "text-destructive" : "text-emerald-500"}`}
                >
                  {projectedUsage > currentUsage.limit ? (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" /> Provisioning Required
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1" /> Safe Operational Margin
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Renewal Countdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysRemaining > 0 ? daysRemaining : "—"} Days</div>
                <div className="text-xs text-muted-foreground mt-1">Remaining in cycle</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats / Visual Chart Placeholder */}
          <Card className="p-6 flex items-center justify-center border-dashed bg-muted/20">
            <div className="text-center py-10">
              <History className="h-10 w-10 mx-auto mb-4 text-primary opacity-20" />
              <p className="text-sm text-muted-foreground">Detailed usage telemetry visualization coming soon</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-0">
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Historical Settlement Ledger
              </CardTitle>
              <CardDescription>Comprehensive record of all fiat and on-chain credit transactions.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="grid grid-cols-12 bg-muted/50 p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground border-b">
                  <div className="col-span-1">Status</div>
                  <div className="col-span-4">Transaction / Method</div>
                  <div className="col-span-3">Type</div>
                  <div className="col-span-2 text-right">Value</div>
                  <div className="col-span-2 text-right">Credits</div>
                </div>

                {ledgerTransactions.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-10" />
                    <p>No financial activity detected in this cycle.</p>
                  </div>
                ) : (
                  ledgerTransactions.map((tx: any) => (
                    <div key={tx.id} className="border-b last:border-none">
                      <div
                        className="grid grid-cols-12 p-4 items-center hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => toggleExpand(tx.id)}
                      >
                        <div className="col-span-1">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {tx.payment_method === "usdc" ? (
                              <Coins className="h-4 w-4" />
                            ) : (
                              <CreditCard className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{tx.reference || "Purchase Intent"}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {new Date(tx.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="col-span-3">
                          <Badge variant="outline" className="text-[10px] capitalize bg-background">
                            {tx.routing || "Direct"}
                          </Badge>
                        </div>
                        <div className="col-span-2 text-right font-mono text-sm">${Number(tx.amount).toFixed(2)}</div>
                        <div className="col-span-2 text-right">
                          <div className="text-sm font-bold font-mono">+{formatCredits(tx.credits)}</div>
                          {expandedTx === tx.id ? (
                            <ChevronUp className="h-4 w-4 ml-auto text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-auto text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {expandedTx === tx.id && (
                        <div className="px-14 pb-6 pt-2 grid grid-cols-2 gap-8 animate-in slide-in-from-top-2">
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
                                Settlement Proof
                              </p>
                              <p className="text-xs font-mono break-all bg-muted p-2 rounded mt-1">
                                {tx.transaction_hash || tx.transaction_id || "Internal Settlement"}
                              </p>
                            </div>
                            <div className="flex gap-4">
                              <div>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
                                  Gateway
                                </p>
                                <p className="text-xs mt-1 capitalize">{tx.payment_method || "Wix Velo Port"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">
                                  ACA Metadata
                                </p>
                                <p className="text-xs mt-1">
                                  {tx.aca_id ? "Verified Consent Artifact" : "Standard Purchase"}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Base Unit Price:</span>
                              <span className="font-mono text-primary">${(tx.amount / tx.credits).toFixed(4)}/CR</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Ledger Hydration:</span>
                              <span className="font-mono text-emerald-500">COMPLETE</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Compliance ID:</span>
                              <span className="font-mono">{tx.id.slice(0, 13)}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2 h-8 text-[10px] uppercase tracking-widest"
                            >
                              <FileText className="h-3 w-3 mr-2" /> View JSON Audit Trace
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 mt-0">
          {/* Keep your existing Invoice Logic here but with the new styling */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>Legal billing artifacts and annual statements.</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No invoices generated for this cycle.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice: any) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">Annual Statement #{invoice.invoice_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(invoice.created_at).toLocaleDateString()} • {invoice.period}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="font-bold font-mono">${Number(invoice.amount).toLocaleString()}</div>
                          <Badge
                            className="h-5 text-[10px] uppercase tracking-tighter"
                            variant={invoice.status === "paid" ? "default" : "destructive"}
                          >
                            {invoice.status}
                          </Badge>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => downloadInvoice(invoice.id)}>
                          <Download className="h-4 w-4" />
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
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-primary/5 px-6 py-4 border-b border-primary/10">
              <CardTitle className="text-lg">Network Protocol Status</CardTitle>
            </div>
            <CardContent className="p-6 space-y-8">
              {!subscription ? (
                <div className="text-center py-12">
                  <p className="mb-6 text-muted-foreground">
                    No active network subscription detected. Genesis status pending.
                  </p>
                  <Button onClick={() => setShowPlans(true)} size="lg" className="px-8">
                    View Network Plans
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-6 rounded-2xl border bg-gradient-to-r from-card to-primary/5">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-2xl tracking-tighter uppercase">
                          {subscriptionPlan.name} TIER
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-none"
                        >
                          ACTIVE
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-1 max-w-md">{subscriptionPlan.description}</div>
                      <div className="text-xs font-mono text-muted-foreground mt-4">
                        UID: {subscription.id.slice(0, 18).toUpperCase()} | EXPIRES:{" "}
                        {new Date(subscription.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold font-mono">{subscriptionPlan.cost}</div>
                      <div className="text-[10px] uppercase text-muted-foreground tracking-widest mt-1 italic">
                        Annual Settlement
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Protocol Features
                      </h4>
                      <ul className="grid grid-cols-1 gap-3">
                        {subscriptionPlan.features.map((f: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-center text-sm p-3 rounded-lg bg-muted/30 border border-transparent hover:border-primary/20 transition-all"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mr-3" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" /> Allocation Limits
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(subscriptionPlan.limits).map(([key, value]: [string, any]) => (
                          <div
                            key={key}
                            className="flex justify-between items-center p-3 rounded-lg bg-muted/10 border"
                          >
                            <span className="text-xs text-muted-foreground uppercase font-medium">
                              {key.replace(/([A-Z])/g, " $1")}
                            </span>
                            <span className="text-sm font-bold font-mono">
                              {typeof value === "number" ? value.toLocaleString() : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6 border-t">
                    <Button onClick={() => setShowPlans(true)} className="px-8">
                      Reconfigure Tier
                    </Button>
                    <Button variant="outline" onClick={() => setShowPlans(true)}>
                      View Documentation
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <AvailablePlansDialog open={showPlans} onOpenChange={setShowPlans} currentTier={currentTier} />
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default BillingCredits;
