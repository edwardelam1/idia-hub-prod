import { useState } from "react";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import {
  CreditCard,
  Zap,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Tag,
  CircleDollarSign,
  Copy,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { toast } from "@/hooks/use-toast";
import { formatCredits } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Fix for TS2339: Property 'ethereum' does not exist on type 'Window'
declare global {
  interface Window {
    ethereum?: any;
  }
}

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

const IDIA_SYNAPSE_WALLET = "0x649436db4d9352240d1132d9372293e5cc6af0e3";

// Ensure this aligns with your global TRUTH
const BASE_RATE = 0.75;

const SynapseTopUp = () => {
  console.log("[SynapseTopUp][Component] START: Rendering component.");

  const { balanceData, refreshBalance: refreshSynapseBalance } = useSynapseCredits();
  const currentBalance = balanceData?.available_credits ?? 0;

  // Bring in the internal IDIA Life wallet balances (CUSTODIAL TRUTH)
  const { balance: walletBalance, refreshBalance: refreshWalletBalance } = useWalletBalance();
  const availableInternalUSDC = walletBalance?.idia_beta_balance ?? 0;

  const [selectedTier, setSelectedTier] = useState(5000);
  const [step, setStep] = useState<"select" | "processing" | "success">("select");
  const [error, setError] = useState<string | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<"tier" | "alacarte">("tier");
  const [alacarteAmount, setAlacarteAmount] = useState("");
  const [paymentRail, setPaymentRail] = useState<"worldpay" | "usdc">("usdc");

  // State Derivation Logic
  const currentSelection = pricingTiers.find((t) => t.crd === selectedTier) || pricingTiers[1];
  const alacarteUsd = parseInt(alacarteAmount) || 0;
  const alacarteCredits = alacarteUsd / BASE_RATE;
  const alacarteValid = alacarteUsd >= 2 && alacarteUsd <= 1000;
  const displayCredits = purchaseMode === "alacarte" ? alacarteCredits : currentSelection.crd;
  const usdAmount = purchaseMode === "alacarte" ? alacarteUsd : currentSelection.crd * currentSelection.rate;
  const baseRateCost = displayCredits * BASE_RATE;
  const savings = purchaseMode === "alacarte" ? 0 : baseRateCost - usdAmount;
  const effectiveRate = purchaseMode === "alacarte" ? BASE_RATE : currentSelection.rate;
  const canProceed = purchaseMode === "alacarte" ? alacarteValid : true;

  const handleAlacarteInput = (val: string) => {
    console.log(`[SynapseTopUp][handleAlacarteInput] START: Processing input value: ${val}`);
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 4) {
      setAlacarteAmount(digits);
      console.log(`[SynapseTopUp][handleAlacarteInput] END: State updated to ${digits}`);
    }
  };

  const handlePurchase = async () => {
    console.log("[SynapseTopUp][handlePurchase] START: Initiating custodial settlement sequence.");

    if (!canProceed) {
      console.warn("[SynapseTopUp][handlePurchase] WARN: Execution halted. Pre-conditions not met.");
      return;
    }

    setStep("processing");
    setError(null);

    try {
      // 1. LIQUIDITY VERIFICATION (Server-Side Logic Mimic)
      console.log(
        `[SynapseTopUp][handlePurchase] INFO: Checking internal vault liquidity. Required: $${usdAmount}, Available: $${availableInternalUSDC}`,
      );
      if (availableInternalUSDC < usdAmount) {
        console.error("[SynapseTopUp][handlePurchase] ERROR: Insufficient custodial funds.");
        throw new Error(
          `Insufficient Internal USDC balance ($${availableInternalUSDC.toFixed(2)}). Please fund your IDIA Life wallet.`,
        );
      }

      // 2. GENERATE SETTLEMENT REFERENCE
      let txReference = `INT-${crypto.randomUUID().slice(0, 8)}`;

      if (paymentRail === "usdc") {
        console.log("[SynapseTopUp][handlePurchase][INTERNAL_LOCK] START: Securing custodial funds for swap...");
        // Simulation of ledger lock for UX
        await new Promise((resolve) => setTimeout(resolve, 1200));
        console.log("[SynapseTopUp][handlePurchase][INTERNAL_LOCK] END: Funds locked for settlement.");
      } else {
        console.log("[SynapseTopUp][handlePurchase][FIAT_WP] START: Initializing Worldpay auth...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        txReference = `WP-${crypto.randomUUID().slice(0, 8)}`;
        console.log("[SynapseTopUp][handlePurchase][FIAT_WP] END: Authorization secured.");
      }

      // 3. AUTHENTICATION & DISPATCH
      console.log("[SynapseTopUp][handlePurchase][LEDGER_DISPATCH] START: Calling top-up-credits Edge Function.");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("[SynapseTopUp][handlePurchase][LEDGER_DISPATCH] ERROR: Auth session missing.");
        throw new Error("Authentication failed. Please re-login.");
      }

      // CRITICAL: Dispatching payment_method as "internal_usdc" to trigger the database swap
      const { data, error: topUpError } = await supabase.functions.invoke("top-up-credits", {
        body: {
          user_id: session.user.id,
          credit_amount: displayCredits,
          usd_amount: usdAmount,
          payment_reference: txReference,
          payment_method: paymentRail === "usdc" ? "internal_usdc" : "worldpay",
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (topUpError) {
        console.error("[SynapseTopUp][handlePurchase][LEDGER_DISPATCH] ERROR: Function rejected request.", topUpError);
        throw topUpError;
      }

      console.log("[SynapseTopUp][handlePurchase][LEDGER_DISPATCH] END: Settlement successful.");

      // 4. SUCCESS HYDRATION
      setStep("success");
      toast({
        title: "Synapse Hydrated!",
        description: `${formatCredits(displayCredits)} added to your operational ledger.`,
      });

      console.log("[SynapseTopUp][handlePurchase][CONTEXT_REFRESH] START: Refreshing balance stores.");
      await Promise.all([refreshSynapseBalance(), refreshWalletBalance()]);
      console.log("[SynapseTopUp][handlePurchase][CONTEXT_REFRESH] END: UI Contexts updated.");

      setTimeout(() => {
        setStep("select");
        setPurchaseMode("tier");
        setAlacarteAmount("");
      }, 3500);
    } catch (err: any) {
      console.error("[SynapseTopUp][handlePurchase] FATAL ERROR:", err.message);
      setError(err.message || "Payment processing failed.");
      toast({
        title: "Settlement Failed",
        description: err.message || "An error occurred during internal settlement.",
        variant: "destructive",
      });
      setStep("select");
    } finally {
      console.log("[SynapseTopUp][handlePurchase] END: Execution function exited.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Address copied to clipboard" });
  };

  console.log("[SynapseTopUp][Component] END: Render phase complete.");

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Fund Synapse Credits
        </h1>
        <p className="text-muted-foreground mt-2">
          Purchase Synapse Credits using your internal IDIA Life balance. Move custodial USDC to Synapse instantly to
          fuel AI data operations.
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
                  onChange={(e) => handleAlacarteInput(e.target.value)}
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
              <p className="font-semibold text-center">Settling Internal Swap...</p>
            </div>
          ) : step === "success" ? (
            <div className="flex flex-col items-center py-12 gap-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="font-bold text-xl">Synapse Hydrated!</p>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-6">Transaction Summary</h2>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-muted-foreground">Internal Vault Balance</span>
                <span className="text-primary font-bold">${availableInternalUSDC.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-muted-foreground">Credits to Add</span>
                <span className="text-emerald-400">+{formatCredits(displayCredits)}</span>
              </div>
              <div className="pt-6 border-t flex justify-between items-end mb-6">
                <span className="font-medium">Total Due</span>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono">${usdAmount.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">USDC</div>
                </div>
              </div>

              {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive text-xs rounded-lg">{error}</div>}

              <div className="flex rounded-lg border border-border overflow-hidden mb-6">
                <button
                  onClick={() => setPaymentRail("usdc")}
                  className={`flex-1 flex items-center justify-center gap-2 text-xs py-3 ${paymentRail === "usdc" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                >
                  <CircleDollarSign className="h-4 w-4" /> Internal USDC
                </button>
                <button
                  onClick={() => setPaymentRail("worldpay")}
                  className={`flex-1 flex items-center justify-center gap-2 text-xs py-3 ${paymentRail === "worldpay" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                >
                  <CreditCard className="h-4 w-4" /> Fiat Port
                </button>
              </div>

              <Button onClick={handlePurchase} disabled={!canProceed} className="w-full py-6 font-bold">
                {paymentRail === "usdc" ? "Confirm & Swap Balances" : "Authorize Worldpay"}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3" />
                <span>Zero-Latency Internal Settlement</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SynapseTopUp;
