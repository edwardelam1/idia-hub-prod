import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  ChevronDown,
  ChevronUp,
  History,
  CreditCard,
  Coins,
  Receipt,
  ArrowDownCircle,
  Loader2,
} from "lucide-react";
import { useBillingData } from "@/hooks/useBillingData";
import { Skeleton } from "@/components/ui/skeleton";
import AvailablePlansDialog from "./AvailablePlansDialog";
import { formatCredits } from "@/lib/utils";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const userId = user?.user_id;
  const queryClient = useQueryClient();
  const [verifyState, setVerifyState] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const verifyAttempted = useRef<string | null>(null);

  // ============================================================
  // Wix Return-URL Settlement Loop
  // Triggered when Wix redirects back to /billing?success=true&paymentId=...
  // Idempotent: confirm-wix-payment uses ON CONFLICT (transaction_id) DO NOTHING.
  // ============================================================
  useEffect(() => {
    console.log("[BillingCredits][WixReturn] >>> START: mount effect — scanning URL for Wix settlement parameters.");
    if (!userId) {
      console.log("[BillingCredits][WixReturn] --- HALT: no userId yet, deferring until auth context hydrates.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const paymentId = params.get("paymentId");
    console.log(`[BillingCredits][WixReturn] --- PARAMS: success=${success} paymentId=${paymentId}`);

    if (success !== "true" || !paymentId) {
      console.log("[BillingCredits][WixReturn] <<< END: no actionable Wix return params; idle.");
      return;
    }

    if (verifyAttempted.current === paymentId) {
      console.log(`[BillingCredits][WixReturn] <<< END: paymentId ${paymentId} already attempted in this mount, skipping duplicate invoke.`);
      return;
    }
    verifyAttempted.current = paymentId;

    const verify = async () => {
      console.log(`[BillingCredits][WixReturn] >>> START: invoking confirm-wix-payment edge function for paymentId=${paymentId}, userId=${userId}.`);
      setVerifyState("verifying");
      setVerifyError(null);
      const startedAt = performance.now();

      try {
        const { data, error } = await supabase.functions.invoke("confirm-wix-payment", {
          body: { paymentId },
        });
        const elapsed = Math.round(performance.now() - startedAt);
        console.log(`[BillingCredits][WixReturn] --- INVOKE_RETURNED: elapsed=${elapsed}ms data=`, data, "error=", error);

        if (error) {
          console.error("[BillingCredits][WixReturn] !!! INVOKE_ERROR:", error);
          setVerifyState("error");
          setVerifyError(error.message || "Edge function invocation failed.");
          toast.error("Verification stalled", {
            description: error.message || "Could not reach the Wix settlement gateway. The webhook backstop will reconcile.",
          });
          return;
        }

        if (data?.ok) {
          console.log("[BillingCredits][WixReturn] --- LEDGER_WRITE: confirmed by edge function.");
          setVerifyState("success");
          toast.success("Payment recorded on ledger", {
            description: "Synapse Credits have been provisioned to your account.",
          });
          console.log(`[BillingCredits][WixReturn] --- INVALIDATING query key ["activity-ledger", "${userId}"].`);
          await queryClient.invalidateQueries({ queryKey: ["activity-ledger", userId] });
          // Strip the params so a refresh doesn't re-trigger.
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          console.warn("[BillingCredits][WixReturn] --- NOT_OK response payload:", data);
          setVerifyState("error");
          const reason = data?.reason || data?.error || "Wix has not yet marked this payment as paid.";
          setVerifyError(reason);
          toast("Payment captured by Wix", {
            description: `${reason} The webhook backstop will finalize the ledger once Wix confirms.`,
          });
        }
      } catch (err: any) {
        const elapsed = Math.round(performance.now() - startedAt);
        console.error(`[BillingCredits][WixReturn] !!! EXCEPTION after ${elapsed}ms:`, err);
        setVerifyState("error");
        setVerifyError(err?.message || "Unknown failure during verification.");
        toast.error("Verification stalled", {
          description: err?.message || "Unexpected error. Webhook backstop will reconcile.",
        });
      } finally {
        console.log("[BillingCredits][WixReturn] <<< END: verification loop complete.");
      }
    };

    verify();
  }, [userId, queryClient]);

  const retryVerification = () => {
    console.log("[BillingCredits][WixReturn] --- RETRY requested by user; resetting attempt guard.");
    verifyAttempted.current = null;
    setVerifyState("idle");
    setVerifyError(null);
    // Re-trigger by nudging effect dependencies via a microtask; simplest is to reload the search.
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true" && params.get("paymentId")) {
      // Force re-run by replacing state with same URL (effect deps don't change, so manually invoke).
      window.location.reload();
    }
  };

  const [showPlans, setShowPlans] = useState(false);

  const usagePercentage = currentUsage.limit > 0 ? (currentUsage.used / currentUsage.limit) * 100 : 0;
  const projectedUsage = new Date().getDate() > 0 ? Math.round(currentUsage.used * (30 / new Date().getDate())) : 0;
  const currentTier = subscription?.tier?.toLowerCase() ?? "base";


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
          <TabsTrigger value="invoices">Invoice Archive</TabsTrigger>
          <TabsTrigger value="subscription">Protocol Tier</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {verifyState !== "idle" && (
          <div
            className={`mb-6 rounded-xl border p-4 flex items-start gap-3 ${
              verifyState === "verifying"
                ? "border-primary/30 bg-primary/5"
                : verifyState === "success"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
            }`}
          >
            {verifyState === "verifying" && <Loader2 className="h-5 w-5 text-primary animate-spin mt-0.5" />}
            {verifyState === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />}
            {verifyState === "error" && <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />}
            <div className="flex-1 text-sm">
              {verifyState === "verifying" && (
                <>
                  <div className="font-medium">Verifying payment with Wix…</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Confirming the settlement and provisioning Synapse Credits to your ledger.
                  </div>
                </>
              )}
              {verifyState === "success" && (
                <>
                  <div className="font-medium">Payment recorded on ledger</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Your Synapse Credits are now available. The transaction appears in the Activity Ledger below.
                  </div>
                </>
              )}
              {verifyState === "error" && (
                <>
                  <div className="font-medium">Payment captured by Wix — ledger sync pending</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {verifyError ?? "Wix has not yet confirmed the payment. The webhook backstop will reconcile automatically."}
                  </div>
                  <Button size="sm" variant="outline" className="mt-3 h-7 text-xs" onClick={retryVerification}>
                    Retry verification
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

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
