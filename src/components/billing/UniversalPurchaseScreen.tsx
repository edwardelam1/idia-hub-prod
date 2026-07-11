import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft, CheckCircle2, Loader2, CreditCard, ShoppingCart, Wallet, CircleDollarSign, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { connectEmbeddedWallet } from "@/lib/metamask-sdk";
import { ensureUsdcApproval } from "@/lib/usdc-approval";
import { unpackEdgeError } from "@/lib/unpack-edge-error";
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
  const { balance: walletBalance, refreshBalance: refreshWalletBalance } = useWalletBalance();
  const queryClient = useQueryClient();
  const paymentId = searchParams.get("paymentId");

  const [selectedPlan, setSelectedPlan] = useState(preselectedPlan);
  const [step, setStep] = useState<"review" | "processing" | "success">(isSuccessReturn ? "success" : "review");
  const [isProcessing, setIsProcessing] = useState(false);
  const [verifyState, setVerifyState] = useState<"idle" | "verifying" | "verified" | "failed">(
    isSuccessReturn ? "verifying" : "idle",
  );
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [paymentRail, setPaymentRail] = useState<"usdc" | "wix">("usdc");
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isAuthorizingRelayer, setIsAuthorizingRelayer] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];
  const availableUSDC = walletBalance?.usdc_balance ?? 0;
  const shortfall = Math.max(0, plan.price - availableUSDC);
  const hasEnoughBalance = shortfall <= 0;

  useEffect(() => {
    if (!isSuccessReturn) return;
    console.log("[UniversalPurchaseScreen][Lifecycle] Detected Wix success return.");
    if (!paymentId) {
      setVerifyState("failed");
      setVerifyError("Missing paymentId in return URL — cannot verify with Wix.");
      return;
    }
    void confirmPayment(paymentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccessReturn, paymentId]);

  const confirmPayment = async (pid: string) => {
    setVerifyState("verifying");
    setVerifyError(null);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-wix-payment", {
        body: { paymentId: pid },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Verification failed");
      setVerifyState("verified");
      toast.success(
        data.alreadyRecorded
          ? "Payment already on ledger."
          : `Payment verified — ${Number(data.credits).toFixed(2)} CR credited.`,
      );
      queryClient.invalidateQueries({ queryKey: ["activity-ledger"] });
    } catch (err: any) {
      console.error("[UniversalPurchaseScreen][confirmPayment] failed", err);
      setVerifyState("failed");
      setVerifyError(err?.message || "Could not verify payment with Wix.");
    }
  };

  const handleConnectMetaMask = async () => {
    setIsConnectingWallet(true);
    try {
      const accounts = await connectEmbeddedWallet();
      const connected = accounts?.[0];
      if (!connected) throw new Error("No accounts were returned from MetaMask.");
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { error } = await supabase
          .from("profiles")
          .update({ wallet_address: connected })
          .eq("id", session.user.id);
        if (error) console.warn("[UniversalPurchaseScreen] persist wallet failed:", error.message);
      }
      await refreshWalletBalance();
      toast.success("Wallet connected");
    } catch (err: any) {
      toast.error(err?.message || "MetaMask onboarding interrupted");
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleAuthorizeRelayer = async () => {
    setIsAuthorizingRelayer(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", session?.user?.id ?? "")
        .maybeSingle();
      const owner = profile?.wallet_address as string | undefined;
      if (!owner) throw new Error("No wallet linked. Connect MetaMask first.");
      const r = await ensureUsdcApproval({ owner });
      if (!r.ok) throw new Error(r.reason || "Approval failed");
      setNeedsApproval(false);
      toast.success("Relayer authorized. Retry your purchase.");
    } catch (err: any) {
      toast.error(err?.message || "Authorization failed");
    } finally {
      setIsAuthorizingRelayer(false);
    }
  };

  const handlePurchase = async () => {
    console.log("[UniversalPurchaseScreen][handlePurchase] [START] Initiating checkout protocol.");
    const userId = user?.user_id;

    if (!userId) {
      console.error("[UniversalPurchaseScreen][handlePurchase] [AUTH_CHECK] [FAILED] User ID missing.");
      toast.error("Authentication error. Please log in again.");
      return;
    }

    // ============================================
    // RAIL 1: INTERNAL USDC (MetaMask / on-chain)
    // ============================================
    if (paymentRail === "usdc") {
      if (availableUSDC < plan.price) {
        toast.error(`Insufficient USDC balance ($${availableUSDC.toFixed(2)}). Please fund your wallet.`);
        return;
      }
      setIsProcessing(true);
      setStep("processing");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expired. Please sign in again.");

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profileErr) throw new Error(`Profile lookup failed: ${profileErr.message}`);
        const buyerWallet = profile?.wallet_address as string | undefined;
        if (!buyerWallet || !/^0x[a-fA-F0-9]{40}$/.test(buyerWallet)) {
          throw new Error("No IDIA Life wallet linked. Connect MetaMask first.");
        }

        const txReference = `PLAN-${plan.id.toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`;
        const payload = {
          user_id: session.user.id,
          usd_amount: Number(plan.price.toFixed(2)),
          credit_amount: plan.credits,
          payment_reference: txReference,
          payment_method: "internal_usdc",
          routing: "on-chain",
          user_wallet: buyerWallet,
          idempotency_key: txReference,
          plan_id: plan.id,
        };

        console.log("[UniversalPurchaseScreen][USDC_FLOW] Invoking top-up-credits", payload);
        const { data, error } = await supabase.functions.invoke("top-up-credits", {
          body: payload,
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) {
          const detail = await unpackEdgeError(error);
          if (/APPROVAL_REQUIRED/i.test(detail)) {
            setNeedsApproval(true);
            setStep("review");
            setIsProcessing(false);
            toast.warning("Relayer authorization required.");
            return;
          }
          throw new Error(detail);
        }

        console.log("[UniversalPurchaseScreen][USDC_FLOW] success hash=", (data as any)?.hash);
        toast.success(`${plan.name} plan activated — ${plan.credits.toLocaleString()} CRD credited.`);
        await refreshWalletBalance();
        queryClient.invalidateQueries({ queryKey: ["activity-ledger"] });
        queryClient.invalidateQueries({ queryKey: ["synapse-credits"] });
        setStep("success");
        setVerifyState("verified");
      } catch (err: any) {
        console.error("[UniversalPurchaseScreen][USDC_FLOW] failed", err);
        toast.error(err?.message || "On-chain settlement failed");
        setStep("review");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // ============================================
    // RAIL 2: WIX FIAT REDIRECT (fallback)
    // ============================================
    setIsProcessing(true);
    setStep("processing");
    try {
      console.log(`[UniversalPurchaseScreen][handlePurchase] [WIX_DIRECT] [START] Requesting Wix paymentId directly for ${plan.name} ($${plan.price}).`);

      const WIX_DOMAIN = "https://www.thebigidia.com";

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
      const returnUrl = encodeURIComponent(
        `${window.location.origin}/billing?success=true&paymentId=${wixData.paymentId}`,
      );
      window.location.href = `${WIX_DOMAIN}/idia-checkout?paymentId=${wixData.paymentId}&returnUrl=${returnUrl}&uid=${userId}&amount=${plan.price}&credits=${plan.credits}`;
    } catch (err: any) {
      console.error("[UniversalPurchaseScreen][handlePurchase] [END_WITH_ERROR] Transaction stalled.", err);
      toast.error(err.message || "Purchase initialization failed");
      setStep("review");
      setIsProcessing(false);
    }
  };

  if (step === "processing") {
    return (
      <div className="max-w-lg mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-foreground font-semibold">
          {paymentRail === "usdc" ? "Executing on-chain settlement…" : "Connecting to Secure Gateway…"}
        </p>
        <p className="text-muted-foreground text-sm">
          {paymentRail === "usdc"
            ? "Relayer pulling USDC from your wallet on Base."
            : "Preparing your dynamic Wix checkout session."}
        </p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        {verifyState === "verifying" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-foreground font-semibold">Verifying payment with Wix…</p>
            <p className="text-muted-foreground text-xs">paymentId: {paymentId}</p>
          </>
        )}
        {verifyState === "verified" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <p className="text-foreground font-bold text-lg">Payment recorded on ledger</p>
            <p className="text-muted-foreground text-sm text-center">
              Your credits are now reflected in the Historical Settlement Ledger.
            </p>
          </>
        )}
        {verifyState === "failed" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-amber-500" />
            <p className="text-foreground font-bold text-lg">Payment captured by Wix</p>
            <p className="text-muted-foreground text-sm text-center">
              {verifyError ?? "We couldn't verify with Wix from the browser."} The webhook backstop will reconcile this shortly.
            </p>
            {paymentId && (
              <Button variant="outline" size="sm" onClick={() => confirmPayment(paymentId)}>
                Retry verification
              </Button>
            )}
          </>
        )}
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
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rail selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentRail("usdc")}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                paymentRail === "usdc"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <CircleDollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">On-Chain USDC</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">MetaMask / IDIA Life wallet on Base</p>
            </button>
            <button
              type="button"
              onClick={() => setPaymentRail("wix")}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                paymentRail === "wix"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Fiat (Wix)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Card / bank via Wix checkout</p>
            </button>
          </div>

          {/* USDC rail panel */}
          {paymentRail === "usdc" && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">USDC Balance (On-Chain)</span>
                <span className="text-primary font-bold font-mono">${availableUSDC.toFixed(2)} USDC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Required</span>
                <span className="text-foreground font-mono">${plan.price.toLocaleString()}</span>
              </div>
              {!walletBalance?.wallet_address && (
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={handleConnectMetaMask}
                  disabled={isConnectingWallet}
                >
                  {isConnectingWallet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  Connect MetaMask
                </Button>
              )}
              {walletBalance?.wallet_address && !hasEnoughBalance && (
                <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Shortfall of ${shortfall.toFixed(2)}. Fund your wallet with USDC on Base to continue.
                  </span>
                </div>
              )}
              {needsApproval && (
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={handleAuthorizeRelayer}
                  disabled={isAuthorizingRelayer}
                >
                  {isAuthorizingRelayer ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Authorize Relayer (one-time)
                </Button>
              )}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center pt-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Settlement executed by IDIA Relayer on Base (gasless for buyer)</span>
              </div>
            </div>
          )}

          {/* Wix rail panel */}
          {paymentRail === "wix" && (
            <div className="min-h-[120px] border border-border rounded-lg flex flex-col items-center justify-center bg-muted/30 p-6 text-center">
              <ShoppingCart className="mx-auto h-8 w-8 text-primary mb-3" />
              <p className="text-sm font-medium text-foreground">Checkout via Wix Processing</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md">
                You will be redirected to our unified, secure Wix checkout portal. Fiat processing is separated strictly from on-chain logic.
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center mt-3">
                <ShieldCheck className="h-3 w-3" />
                <span>Encryption & Settlement provided by Wix (PCI-DSS Level 1)</span>
              </div>
            </div>
          )}
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

      <Button
        className="w-full gap-2"
        size="lg"
        onClick={handlePurchase}
        disabled={
          isProcessing ||
          (paymentRail === "usdc" && (!walletBalance?.wallet_address || !hasEnoughBalance))
        }
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {isProcessing
          ? paymentRail === "usdc" ? "Settling on-chain…" : "Connecting to Wix…"
          : paymentRail === "usdc"
            ? `Pay $${plan.price.toLocaleString()} with USDC`
            : "Proceed to Wix Checkout"}
      </Button>
    </div>
  );
};

export default UniversalPurchaseScreen;