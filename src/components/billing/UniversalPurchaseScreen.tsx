import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  CreditCard,
  ShoppingCart,
  Wallet,
  CircleDollarSign,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { connectEmbeddedWallet } from "@/lib/metamask-sdk";
import { authorizeRelayerViaLife } from "@/lib/relayer-authorization";
import { unpackEdgeError } from "@/lib/unpack-edge-error";
import {
  pollLedgerStatus,
  invokeWithTimeout,
  rememberPendingPurchase,
  clearPendingPurchase,
  readPendingPurchase,
} from "@/lib/poll-ledger-status";
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

  const { user } = useAuth();
  const { balance: walletBalance, refreshBalance: refreshWalletBalance } = useWalletBalance();
  const queryClient = useQueryClient();

  const [selectedPlan, setSelectedPlan] = useState(preselectedPlan);
  const [step, setStep] = useState<"review" | "processing" | "success">("review");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isAuthorizingRelayer, setIsAuthorizingRelayer] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [linkedWallet, setLinkedWallet] = useState<string | null>(null);

  const plan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];
  const availableUSDC = walletBalance?.usdc_balance ?? 0;
  const shortfall = Math.max(0, plan.price - availableUSDC);
  const hasEnoughBalance = shortfall <= 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data } = await supabase.from("profiles").select("wallet_address").eq("id", session.user.id).maybeSingle();
      if (!cancelled) setLinkedWallet((data?.wallet_address as string | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve a settlement by polling the ledger — never by holding a socket open.
  const resolveSettlement = async (idempotencyKey: string, silent = false) => {
    console.log(`[UniversalPurchaseScreen][resolveSettlement] BEGIN key=${idempotencyKey} silent=${silent}`);
    if (!silent) {
      setStep("processing");
      setIsProcessing(true);
    }
    try {
      const result = await pollLedgerStatus(idempotencyKey, silent ? 4 : 15);
      if (result.outcome === "completed") {
        clearPendingPurchase();
        toast.success(`${plan.name} plan activated — ${plan.credits.toLocaleString()} CRD credited.`);
        await refreshWalletBalance();
        queryClient.invalidateQueries({ queryKey: ["activity-ledger"] });
        queryClient.invalidateQueries({ queryKey: ["synapse-credits"] });
        setStep("success");
        setVerifyState("verified");
      } else if (result.outcome === "failed") {
        clearPendingPurchase();
        toast.error(result.reason || "The payment could not be completed. No credits were added.");
        setStep("review");
      } else if (!silent) {
        toast.warning("Payment still confirming on the network. Reopen this page shortly to see the result.");
        setStep("review");
      }
    } finally {
      if (!silent) setIsProcessing(false);
      console.log(`[UniversalPurchaseScreen][resolveSettlement] END key=${idempotencyKey}`);
    }
  };

  // Resume an unresolved purchase after a tab kill / screen lock, and re-check
  // whenever the tab returns to the foreground (Chromium throttles background tabs).
  useEffect(() => {
    const pending = readPendingPurchase();
    if (pending) {
      console.log(`[UniversalPurchaseScreen][Lifecycle] Resuming unresolved purchase key=${pending}`);
      void resolveSettlement(pending, true);
    }
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const key = readPendingPurchase();
      if (key) {
        console.log(`[UniversalPurchaseScreen][Lifecycle] Foregrounded — re-polling key=${key}`);
        void resolveSettlement(key, true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleConnectMetaMask = async () => {
    setIsConnectingWallet(true);
    try {
      const accounts = await connectEmbeddedWallet();
      const connected = accounts?.[0];
      if (!connected) throw new Error("No accounts were returned from MetaMask.");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { error } = await supabase
          .from("profiles")
          .update({ wallet_address: connected })
          .eq("id", session.user.id);
        if (error) console.warn("[UniversalPurchaseScreen] persist wallet failed:", error.message);
      }
      await refreshWalletBalance();
      setLinkedWallet(connected);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", session?.user?.id ?? "")
        .maybeSingle();
      const owner = profile?.wallet_address as string | undefined;
      if (!owner) throw new Error("No Life wallet is linked to this account yet.");
      toast.info("Opening Life to authorize your wallet…");
      const r = await authorizeRelayerViaLife({ owner, requiredUsd: plan.price });
      if (!r.ok) {
        if (r.pending) {
          toast.warning(r.reason);
          return;
        }
        throw new Error(r.reason);
      }
      setNeedsApproval(false);
      toast.success("Wallet authorized. You can complete your purchase.");
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
    // ON-CHAIN USDC SETTLEMENT (MetaMask / Life wallet)
    // ============================================
    {
      if (availableUSDC < plan.price) {
        toast.error(`Insufficient USDC balance ($${availableUSDC.toFixed(2)}). Please fund your wallet.`);
        return;
      }
      setIsProcessing(true);
      setStep("processing");
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expired. Please sign in again.");

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profileErr) throw new Error(`Profile lookup failed: ${profileErr.message}`);
        const buyerWallet = profile?.wallet_address as string | undefined;
        if (!buyerWallet || !/^0x[a-fA-F0-9]{40}$/.test(buyerWallet)) {
          throw new Error("No Life wallet linked. Connect MetaMask first.");
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
        rememberPendingPurchase(txReference);
        const { data, error, timedOut } = await invokeWithTimeout("top-up-credits", {
          body: payload,
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) {
          const detail = await unpackEdgeError(error);
          if (/APPROVAL_REQUIRED/i.test(detail)) {
            clearPendingPurchase();
            setNeedsApproval(true);
            setStep("review");
            setIsProcessing(false);
            toast.warning("Your wallet hasn't authorized settlement yet — one-time step below.");
            return;
          }
          clearPendingPurchase();
          if (/INSUFFICIENT_BUYER_BALANCE/i.test(detail)) {
            setStep("review");
            setIsProcessing(false);
            toast.error(`Not enough USDC in your Life wallet for $${plan.price.toFixed(2)}. Add funds and try again.`);
            return;
          }
          throw new Error(detail);
        }

        if (timedOut) {
          console.warn("[UniversalPurchaseScreen][USDC_FLOW] invoke timed out — polling ledger instead.");
        } else {
          console.log("[UniversalPurchaseScreen][USDC_FLOW] dispatched hash=", (data as any)?.hash);
        }

        await resolveSettlement(txReference);
      } catch (err: any) {
        console.error("[UniversalPurchaseScreen][USDC_FLOW] failed", err);
        toast.error(err?.message || "On-chain settlement failed");
        setStep("review");
      } finally {
        setIsProcessing(false);
      }
      return;
    }
  };

  if (step === "processing") {
    return (
      <div className="max-w-lg mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-foreground font-semibold">Executing on-chain settlement…</p>
        <p className="text-muted-foreground text-sm">Relayer pulling USDC from your wallet on Base.</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        <p className="text-foreground font-bold text-lg">Payment recorded on ledger</p>
        <p className="text-muted-foreground text-sm text-center">
          Your credits are now reflected in the Historical Settlement Ledger.
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
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* USDC rail panel */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">On-Chain USDC</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">USDC Balance (On-Chain)</span>
              <span className="text-primary font-bold font-mono">${availableUSDC.toFixed(2)} USDC</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Required</span>
              <span className="text-foreground font-mono">${plan.price.toLocaleString()}</span>
            </div>
            {!linkedWallet && (
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
            {linkedWallet && !hasEnoughBalance && (
              <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Shortfall of ${shortfall.toFixed(2)}. Fund your wallet with USDC on Base to continue.</span>
              </div>
            )}
            {needsApproval && (
              <div className="space-y-1">
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={handleAuthorizeRelayer}
                  disabled={isAuthorizingRelayer}
                >
                  {isAuthorizingRelayer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  {isAuthorizingRelayer ? "Waiting for Life…" : "Authorize in Life (one-time)"}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Opens the Life by IDIA app to approve settlement with your own wallet. Return here when it's done.
                </p>
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-center pt-1">
              <ShieldCheck className="h-3 w-3" />
              <span>Settlement executed by IDIA Relayer on Base (gasless for buyer)</span>
            </div>
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

      <Button
        className="w-full gap-2"
        size="lg"
        onClick={handlePurchase}
        disabled={isProcessing || !linkedWallet || !hasEnoughBalance}
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {isProcessing ? "Settling on-chain…" : `Pay $${plan.price.toLocaleString()} with USDC`}
      </Button>
    </div>
  );
};

export default UniversalPurchaseScreen;
