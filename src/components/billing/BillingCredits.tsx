import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  History,
  Loader2,
} from "lucide-react";
import { useBillingData } from "@/hooks/useBillingData";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { Skeleton } from "@/components/ui/skeleton";
import AvailablePlansDialog from "./AvailablePlansDialog";
import { formatCredits } from "@/lib/utils";


import { toast } from "sonner";

const BillingCredits = () => {
  const {
    currentUsage,
    subscriptionPlan,
    subscription,
    subscriptionStatus,
    cycleEnd,
    tier,
    daysRemaining,
    dailyBurn,
    projectedBurn,
    projectionDays,
    invoices,
    isLoading,
    downloadInvoice,
  } = useBillingData();
  const { balanceData } = useSynapseCredits();
  const queryClient = useQueryClient();

  const [showPlans, setShowPlans] = useState(false);

  const balance = Number(balanceData?.available_credits ?? 0);
  const usagePercentage = currentUsage.limit > 0 ? Math.min(100, (currentUsage.used / currentUsage.limit) * 100) : 0;
  const projectedUsage = projectedBurn;
  const currentTier = tier;


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
                  {formatCredits(balance)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {currentUsage.limit > 0 ? `${formatCredits(currentUsage.used)} of ${formatCredits(currentUsage.limit)} used this cycle` : `${formatCredits(currentUsage.used)} used (30 days)`}
                </div>
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
                <div className="text-sm font-mono text-muted-foreground mt-1">{subscriptionPlan.cost}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Projected Burn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{formatCredits(projectedUsage)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCredits(dailyBurn)} CR/day · next {projectionDays} days
                </div>
                <div
                  className={`text-xs flex items-center mt-1 ${projectedUsage > balance ? "text-destructive" : "text-primary"}`}
                >
                  {projectedUsage > balance ? (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" /> Exceeds balance — top up
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1" /> Covered by balance
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
                {subscriptionStatus === "active" && cycleEnd ? (
                  <>
                    <div className="text-2xl font-bold">{daysRemaining} Days</div>
                    <div className="text-xs text-muted-foreground mt-1">Renews {cycleEnd.toLocaleDateString()}</div>
                  </>
                ) : subscriptionStatus === "expired" ? (
                  <>
                    <div className="text-2xl font-bold text-destructive">Expired</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      on {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : "—"}
                    </div>
                    <Button size="sm" variant="outline" className="mt-2 h-7" onClick={() => setShowPlans(true)}>Renew</Button>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">No cycle</div>
                    <div className="text-xs text-muted-foreground mt-1">Pay-as-you-go, no renewal</div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Ledger relocated */}
          <Card className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-dashed bg-muted/20">
            <div className="flex items-center gap-4">
              <History className="h-8 w-8 text-primary opacity-40" />
              <div>
                <p className="text-sm font-medium">Activity Ledger has moved</p>
                <p className="text-xs text-muted-foreground">
                  Fiat and on-chain settlement history now lives on the Earnings &amp; Settlement page.
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/earnings">Open Earnings &amp; Settlement</Link>
            </Button>
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
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">
                            {invoice.kind === "purchase" ? "Credit Purchase" : invoice.kind === "usage" ? "Usage Statement" : "Invoice"} #{invoice.invoice_number}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {new Date(invoice.created_at).toLocaleDateString()} • {invoice.period}
                            {invoice.line_count ? ` • ${invoice.line_count} charges` : ""}
                            {invoice.tx_hash && (
                              <> • <a className="text-primary underline" href={`https://basescan.org/tx/${invoice.tx_hash}`} target="_blank" rel="noreferrer">BaseScan</a></>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="font-bold font-mono text-sm">
                            {invoice.unit === "USDC" ? `$${invoice.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `${formatCredits(invoice.amount)} CR`}
                          </div>
                          <Badge
                            className="h-5 text-[10px] uppercase tracking-tighter"
                            variant={["paid", "settled", "completed", "confirmed"].includes(invoice.status) ? "default" : invoice.status === "failed" ? "destructive" : "secondary"}
                          >
                            {invoice.status}
                          </Badge>
                        </div>
                        <Button size="icon" variant="ghost" aria-label="Download statement" onClick={() => downloadInvoice(invoice.id)}>
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
              {subscriptionStatus === "none" && tier === "base" ? (
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
                          variant={subscriptionStatus === "expired" ? "destructive" : "secondary"}
                          className="border-none uppercase"
                        >
                          {subscriptionStatus === "active" ? "Active" : subscriptionStatus === "expired" ? "Expired" : "Account tier"}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-1 max-w-md">{subscriptionPlan.description}</div>
                      <div className="text-xs font-mono text-muted-foreground mt-4">
                        {subscription ? `UID: ${subscription.id.slice(0, 18).toUpperCase()} | ${subscriptionStatus === "expired" ? "EXPIRED" : "EXPIRES"}: ` : "No subscription record"}
                        {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : ""}
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
