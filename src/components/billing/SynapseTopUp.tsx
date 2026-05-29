// src/components/billing/SynapseTopUp.tsx
import { useState } from "react";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import {
  CreditCard,
  Zap,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CircleDollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { toast } from "@/hooks/use-toast";
import { formatCredits } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const IDIA_SYNAPSE_WALLET = "0x649436db4d9352240d1132d9372293e5cc6af0e3";
const WIX_DOMAIN = "https://www.thebigidia.com";
const BASE_RATE = 0.75;

interface PricingTier {
  crd: number;
  label: string;
  rate: number;
  description: string;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  { crd: 1000, label: "Tier 1", rate: 0.7, description: "Minimum bulk entry" },
  { crd: 5000, label: "Tier 2", rate: 0.65, popular: true, description: "Standard operational capacity" },
  { crd: 20000, label: "Tier 3", rate: 0.6, description: "Maximum volume discount" },
];

const SynapseTopUp = () => {
  const { protocolState, refreshState: refreshSynapseBalance } = useSynapseCredits();
  const { balance: walletBalance, refreshBalance: refreshWalletBalance } = useWalletBalance();
  const availableUSDC = walletBalance?.usdc_balance ?? 0;

  const [selectedTier, setSelectedTier] = useState(5000);
  const [step, setStep] = useState<"select" | "payment" | "processing" | "success">("select");
  const [error, setError] = useState<string | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<"tier" | "alacarte">("tier");
  const [alacarteAmount, setAlacarteAmount] = useState("");
  const [paymentRail, setPaymentRail] = useState<"usdc" | "wix">("usdc");

  const currentSelection = pricingTiers.find((t) => t.crd === selectedTier) || pricingTiers[1];
  const alacarteUsd = parseInt(alacarteAmount) || 0;
  const alacarteCredits = alacarteUsd / BASE_RATE;
  const alacarteValid = alacarteUsd >= 2 && alacarteUsd <= 1000;

  const displayCredits = purchaseMode === "alacarte" ? alacarteCredits : currentSelection.crd;
  const usdAmount = purchaseMode === "alacarte" ? alacarteUsd : currentSelection.crd * currentSelection.rate;
  const canProceed = purchaseMode === "alacarte" ? alacarteValid : true;

  const handleProceedToPayment = () => {
    console.log(`[SynapseTopUp][handleProceedToPayment] [START] mode=${purchaseMode} credits=${displayCredits} usd=${usdAmount}`);
    if (!canProceed) {
      console.warn("[SynapseTopUp][handleProceedToPayment] [BLOCKED] canProceed=false");
      return;
    }
    setStep("payment");
    console.log("[SynapseTopUp][handleProceedToPayment] [END] step=payment");
  };

  const handlePurchase = async () => {
    console.log(`[SynapseTopUp][handlePurchase] [START] rail=${paymentRail} credits=${displayCredits} usd=${usdAmount}`);
    if (!canProceed) {
      console.warn("[SynapseTopUp][handlePurchase] [BLOCKED] canProceed=false");
      return;
    }

    setStep("processing");
    setError(null);

    try {
      console.log("[SynapseTopUp][handlePurchase] [AUTH_CHECK] [BEGIN] supabase.auth.getSession()");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log(`[SynapseTopUp][handlePurchase] [AUTH_CHECK] [END] hasSession=${!!session}`);
      if (!session) throw new Error("Authentication failed. Please re-login.");

      // ==========================================
      // RAIL 1: WIX DIRECT PORT HANDSHAKE
      // ==========================================
      if (paymentRail === "wix") {
        console.log("[SynapseTopUp][handlePurchase] [WIX_DIRECT] [START] minting paymentId");
        const idempotencyKey = crypto.randomUUID();
        console.log(`[SynapseTopUp][handlePurchase] [WIX_DIRECT] [REQUEST] POST ${WIX_DOMAIN}/_functions/checkout idem=${idempotencyKey}`);

        let wixResponse: Response;
        try {
          wixResponse = await fetch(`${WIX_DOMAIN}/_functions/checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Number(usdAmount.toFixed(2)),
              credits: Math.floor(displayCredits),
              userId: session.user.id,
              planId: "alacarte",
              type: "alacarte",
              idempotency_key: idempotencyKey,
            }),
          });
        } catch (netErr: any) {
          console.error(`🚨 [SynapseTopUp][handlePurchase] [WIX_DIRECT] [NETWORK_ERROR] ${netErr?.message}`);
          throw new Error(`Wix checkout network error: ${netErr?.message}`);
        }
        console.log(`[SynapseTopUp][handlePurchase] [WIX_DIRECT] [RESPONSE] status=${wixResponse.status} ok=${wixResponse.ok}`);

        if (!wixResponse.ok) {
          console.error(`🚨 [SynapseTopUp][handlePurchase] [WIX_DIRECT] [FAILED] HTTP ${wixResponse.status}`);
          throw new Error(`Wix checkout failed: ${wixResponse.status}`);
        }

        console.log("[SynapseTopUp][handlePurchase] [WIX_DIRECT] [PARSE] reading JSON body");
        const wixData = await wixResponse.json();
        console.log(`[SynapseTopUp][handlePurchase] [WIX_DIRECT] [PARSED] paymentId=${wixData?.paymentId ?? "<missing>"}`);

        if (!wixData?.paymentId) {
          console.error("🚨 [SynapseTopUp][handlePurchase] [WIX_DIRECT] [FAILED] Missing paymentId");
          throw new Error("Failed to get payment ID from Wix");
        }

        const returnUrl = encodeURIComponent(
          `${window.location.origin}/billing?success=true&paymentId=${wixData.paymentId}`,
        );
        const target = `${WIX_DOMAIN}/idia-checkout?paymentId=${wixData.paymentId}&returnUrl=${returnUrl}&uid=${session.user.id}&amount=${usdAmount}&credits=${Math.floor(displayCredits)}`;
        console.log(`[SynapseTopUp][handlePurchase] [WIX_DIRECT] [REDIRECT] ${target}`);
        window.location.href = target;
        return;
      }

      // ==========================================
      // RAIL 2: INTERNAL USDC CUSTODIAL FLOW
      // ==========================================
      console.log(
        `[SynapseTopUp][handlePurchase] [USDC_FLOW] [LIQUIDITY] required=$${usdAmount.toFixed(2)} available=$${availableUSDC.toFixed(2)}`,
      );
      if (availableUSDC < usdAmount) {
        console.error("🚨 [SynapseTopUp][handlePurchase] [USDC_FLOW] [INSUFFICIENT] aborting before dispatch");
        throw new Error(`Insufficient USDC balance ($${availableUSDC.toFixed(2)}). Please fund your wallet.`);
      }

      const txReference = `INT-${crypto.randomUUID().slice(0, 8)}`;
      const internalPayload = {
        user_id: session.user.id,
        credit_amount: displayCredits,
        usd_amount: usdAmount,
        payment_reference: txReference,
        payment_method: "internal_usdc",
        target_synapse_wallet: IDIA_SYNAPSE_WALLET,
        user_wallet: protocolState?.wallet_address || "user_wallet",
      };
      console.log("[SynapseTopUp][handlePurchase] [USDC_FLOW] [INVOKE_BEGIN] supabase.functions.invoke('top-up-credits')", internalPayload);

      const invokeStart = performance.now();
      const { error: topUpError } = await supabase.functions.invoke("top-up-credits", {
        body: internalPayload,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      console.log(
        `[SynapseTopUp][handlePurchase] [USDC_FLOW] [INVOKE_END] elapsed=${(performance.now() - invokeStart).toFixed(0)}ms error=${topUpError ? topUpError.message : "none"}`,
      );
      if (topUpError) throw topUpError;

      setStep("success");
      toast({ title: "Synapse Hydrated!", description: `${formatCredits(displayCredits)} added to your operational ledger.` });

      console.log("[SynapseTopUp][handlePurchase] [REFRESH_BEGIN] refreshing balances");
      await Promise.all([refreshSynapseBalance?.(), refreshWalletBalance?.()]);
      console.log("[SynapseTopUp][handlePurchase] [REFRESH_END] balances refreshed");

      setTimeout(() => {
        console.log("[SynapseTopUp][handlePurchase] [RESET] returning to select");
        setStep("select");
      }, 3500);
    } catch (err: any) {
      console.error(`🚨 [SynapseTopUp][handlePurchase] [FATAL] ${err?.message}`);
      setError(err?.message || "Settlement failed.");
      setStep("payment");
      toast({ title: "Settlement Failed", description: err?.message, variant: "destructive" });
    } finally {
      console.log("[SynapseTopUp][handlePurchase] [FINALLY] exit");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Purchase Synapse Credits
        </h1>
        <p className="text-muted-foreground mt-2">
          Dual-Rail Settlement Protocol. Secure <strong>On-Chain USDC</strong> or <strong>Credit/Debit</strong> funds to
          fuel data consumption operations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setPurchaseMode("tier")}
              className={`flex-1 text-sm font-medium py-2.5 px-4 transition-colors ${purchaseMode === "tier" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}
            >
              Volume Tranches
            </button>
            <button
              onClick={() => setPurchaseMode("alacarte")}
              className={`flex-1 text-sm font-medium py-2.5 px-4 transition-colors ${purchaseMode === "alacarte" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}
            >
              A La Carte
            </button>
          </div>

          {purchaseMode === "tier" ? (
            <div className="grid grid-cols-1 gap-4">
              {pricingTiers.map((tier) => {
                const usdCost = tier.crd * tier.rate;
                const isSelected = selectedTier === tier.crd;
                return (
                  <div
                    key={tier.crd}
                    onClick={() => setSelectedTier(tier.crd)}
                    className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSelected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                        Most Popular
                      </span>
                    )}
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-foreground font-semibold">{tier.label}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                          ${tier.rate.toFixed(2)}/CR
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{tier.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono">{formatCredits(tier.crd)}</div>
                      <div className="text-sm text-muted-foreground">${usdCost.toFixed(2)} USD</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 p-5 rounded-xl border-2 border-border bg-card">
              <Label>Purchase Amount (USD)</Label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md">$</span>
                <Input
                  className="rounded-none border-r-0"
                  placeholder="25"
                  value={alacarteAmount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    if (digits.length <= 4) setAlacarteAmount(digits);
                  }}
                />
                <span className="px-3 py-2 bg-muted border border-l-0 rounded-r-md">.00</span>
              </div>
              {alacarteValid && (
                <p className="text-sm text-emerald-400">
                  Yield: <span className="font-bold">{formatCredits(alacarteCredits)}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 h-fit sticky top-6">
          {step === "processing" ? (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="font-semibold text-center uppercase tracking-widest text-xs">
                {paymentRail === "wix" ? "Redirecting to Wix Gateway..." : "Executing Internal Swap..."}
              </p>
            </div>
          ) : step === "success" ? (
            <div className="flex flex-col items-center py-12 gap-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="font-bold text-xl">Synapse Hydrated!</p>
              <p className="text-sm text-muted-foreground">
                {formatCredits(displayCredits)} added to your operational ledger.
              </p>
            </div>
          ) : step === "payment" ? (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-4">Authorize Settlement</h2>
              <div className="bg-muted/50 border border-border rounded-xl p-3 flex justify-between items-center mb-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Settlement Rail</p>
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-primary" /> Verified dual-rail port
                  </p>
                </div>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <ShieldCheck className="h-3 w-3" /> Secure
                </Badge>
              </div>

              <div className="flex rounded-lg border border-border overflow-hidden mb-4">
                <button
                  onClick={() => setPaymentRail("usdc")}
                  className={`flex-1 flex items-center justify-center gap-2 text-xs py-3 ${paymentRail === "usdc" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                >
                  <CircleDollarSign className="h-4 w-4" /> Internal USDC
                </button>
                <button
                  onClick={() => setPaymentRail("wix")}
                  className={`flex-1 flex items-center justify-center gap-2 text-xs py-3 ${paymentRail === "wix" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                >
                  <CreditCard className="h-4 w-4" /> Credit/Debit
                </button>
              </div>

              <div className="bg-muted/30 border border-border rounded-xl p-3 text-center text-[11px] text-muted-foreground leading-relaxed mb-4">
                {paymentRail === "usdc" ? (
                  <p>
                    By clicking confirm, you authorize the secure transfer of{" "}
                    <strong>${usdAmount.toFixed(2)} USDC</strong> from your IDIA wallet to the Treasury.
                  </p>
                ) : (
                  <p>Bypassing standard gateway API handshakes. You will be sent directly to the root Wix portal.</p>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => setStep("select")}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button className="flex-1 gap-2" onClick={handlePurchase}>
                  {paymentRail === "usdc" ? (
                    <>
                      <CircleDollarSign className="h-4 w-4" /> Confirm & Spend USDC
                    </>
                  ) : (
                    <>Proceed to Wix</>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-6">Execution Summary</h2>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-muted-foreground">Credits to Add</span>
                <span className="text-emerald-400">+{formatCredits(displayCredits)}</span>
              </div>
              <div className="pt-6 border-t flex justify-between items-end mb-6">
                <span className="font-medium">Total Due</span>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono">${usdAmount.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    USDC On-Chain: ${availableUSDC.toFixed(2)}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button onClick={handleProceedToPayment} disabled={!canProceed} className="w-full py-6 font-bold gap-2">
                Continue to Payment <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Dual-Rail</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SynapseTopUp;
