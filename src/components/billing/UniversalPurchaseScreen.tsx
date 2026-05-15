import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ArrowLeft, CheckCircle2, Loader2, CreditCard, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBillingData } from "@/hooks/useBillingData";
import { toast } from "sonner";

const PLANS = [
  { id: "analyst", name: "Analyst", price: 9995, credits: 5000, label: "$9,995/yr" },
  { id: "professional", name: "Professional", price: 24995, credits: 20000, label: "$24,995/yr" },
  { id: "enterprise", name: "Enterprise", price: 49995, credits: 50000, label: "$49,995+/yr" },
];

const UniversalPurchaseScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPlan = searchParams.get("plan") || "analyst";
  // Detect if user is returning from a successful Wix checkout redirect
  const isSuccessReturn = searchParams.get("success") === "true";
  
  const { user } = useAuth();
  const { paymentMethods } = useBillingData();

  const [selectedPlan, setSelectedPlan] = useState(preselectedPlan);
  const [selectedPM, setSelectedPM] = useState("");
  const [step, setStep] = useState<"review" | "processing" | "success">(isSuccessReturn ? "success" : "review");
  const [isProcessing, setIsProcessing] = useState(false);

  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];

  useEffect(() => {
    if (isSuccessReturn) {
      console.log("[UniversalPurchaseScreen][Lifecycle] [START] Detected success parameter from Wix redirect.");
      toast.success("Payment successfully processed via Wix.");
    }
  }, [isSuccessReturn]);

  const handlePurchase = async () => {
    console.log("[UniversalPurchaseScreen][handlePurchase] [START] Initiating checkout protocol.");
    setStep("processing");
    const userId = user?.user_id;

    if (!userId) {
      console.error("[UniversalPurchaseScreen][handlePurchase] [AUTH_CHECK] [FAILED] User ID missing.");
      toast.error("Authentication error. Please log in again.");
      setStep("review");
      return;
    }

    try {
      console.log(`[UniversalPurchaseScreen][handlePurchase] [WIX_DIRECT] [START] Requesting Wix paymentId directly for ${plan.name} ($${plan.price}).`);

      const WIX_DOMAIN = "https://www.thebigidia.com";
      const returnUrl = encodeURIComponent(`${window.location.origin}/billing?success=true`);

      const wixResponse = await fetch(`${WIX_DOMAIN}/_functions/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.price,
          credits: plan.credits,
          userId,
          planId: plan.id,
          type: "subscription",
        }),
      });

      if (!wixResponse.ok) {
        console.error(`[UniversalPurchaseScreen][handlePurchase] [WIX_DIRECT] [FAILED] HTTP ${wixResponse.status}`);
        throw new Error(`Wix checkout failed: ${wixResponse.status}`);
      }

      const wixData = await wixResponse.json();
      if (!wixData?.paymentId) {
        console.error("[UniversalPurchaseScreen][handlePurchase] [WIX_DIRECT] [FAILED] Payload missing paymentId.");
        throw new Error("Failed to get payment ID from Wix");
      }

      console.log("[UniversalPurchaseScreen][handlePurchase] [WIX_DIRECT] [SUCCESS] Received paymentId. Redirecting to Wix checkout page.");
      window.location.href = `${WIX_DOMAIN}/idia-checkout?paymentId=${wixData.paymentId}&returnUrl=${returnUrl}`;
    } catch (err: any) {
      console.error("[UniversalPurchaseScreen][handlePurchase] [END_WITH_ERROR] Transaction stalled.", err);
      toast.error(err.message || "Purchase initialization failed");
      setStep("review");
    }
  };

  if (step === "processing") {
    return (
      <div className="max-w-lg mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-foreground font-semibold">Connecting to Secure Gateway...</p>
        <p className="text-muted-foreground text-sm">Preparing your dynamic Wix checkout session.</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        <p className="text-foreground font-bold text-lg">{plan.name} Plan Activated!</p>
        <p className="text-muted-foreground text-sm text-center">
          {plan.credits.toLocaleString()} CRD have been automatically minted by the settlement engine. Your subscription is now active.
        </p>
        <Button onClick={() => navigate("/billing")} className="mt-4">
          Go to Billing
        </Button>
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
        <p className="text-muted-foreground text-sm mt-1">Select your plan and proceed to secure checkout</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Selected Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PLANS.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPlan === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
            Secure Payment Gateway
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="min-h-[120px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center bg-muted/30 p-6 text-center">
            <ShoppingCart className="mx-auto h-8 w-8 text-primary mb-3" />
            <p className="text-sm font-medium text-foreground">Checkout via Wix Processing</p>
            <p className="text-xs text-muted-foreground mt-2 max-w-md">
              You will be redirected to our unified, secure Wix checkout portal to complete your transaction. Fiat processing is separated strictly from on-chain logic.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center">
            <ShieldCheck className="h-3 w-3" />
            <span>Encryption & Settlement provided by Wix (PCI-DSS Level 1)</span>
          </div>
        </CardContent>
      </Card>

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

      <Button className="w-full gap-2" size="lg" onClick={handlePurchase} disabled={isProcessing}>
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {isProcessing ? "Connecting to Wix..." : "Proceed to Wix Checkout"}
      </Button>
    </div>
  );
};

export default UniversalPurchaseScreen;