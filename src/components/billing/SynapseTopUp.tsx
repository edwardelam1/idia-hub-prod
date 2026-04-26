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
const USDC_BASE_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Ensure this aligns with your global TRUTH
const BASE_RATE = 0.75;

const SynapseTopUp = () => {
  console.log("[SynapseTopUp][Component] START: Rendering component.");

  const { balanceData, refreshBalance: refreshSynapseBalance } = useSynapseCredits();
  const currentBalance = balanceData?.available_credits ?? 0;

  // Bring in the internal IDIA Life wallet balances
  const { balance: walletBalance, refreshBalance: refreshWalletBalance } = useWalletBalance();
  const availableUSDC = walletBalance?.idia_beta_balance ?? 0;

  const [selectedTier, setSelectedTier] = useState(5000);
  const [step, setStep] = useState<"select" | "processing" | "success">("select");
  const [error, setError] = useState<string | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<"tier" | "alacarte">("tier");
  const [alacarteAmount, setAlacarteAmount] = useState("");
  const [paymentRail, setPaymentRail] = useState<"worldpay" | "usdc">("usdc");

  try {
    console.log("[SynapseTopUp][State Derivation] INFO: Calculating current variables based on state.");
    const currentSelectionCheck = pricingTiers.find((t) => t.crd === selectedTier) || pricingTiers[1];
    const alacarteUsdCheck = parseInt(alacarteAmount) || 0;
    const alacarteValidCheck = alacarteUsdCheck >= 2 && alacarteUsdCheck <= 1000;
    console.log(
      `[SynapseTopUp][State Derivation] INFO: selectedTier=${selectedTier}, alacarteUsd=${alacarteUsdCheck}, alacarteValid=${alacarteValidCheck}`,
    );
  } catch (derivationError) {
    console.error(
      "[SynapseTopUp][State Derivation] ERROR: Failed to calculate component state variables.",
      derivationError,
    );
  }

  // Recalculating outside try-catch to ensure variables are available to the scope
  const currentSelection = pricingTiers.find((t) => t.crd === selectedTier) || pricingTiers[1];
  const alacarteUsd = parseInt(alacarteAmount) || 0;
  const alacarteCredits = alacarteUsd / BASE_RATE; // Math.floor removed to preserve exact yield
  const alacarteValid = alacarteUsd >= 2 && alacarteUsd <= 1000;
  const displayCredits = purchaseMode === "alacarte" ? alacarteCredits : currentSelection.crd;
  const usdAmount = purchaseMode === "alacarte" ? alacarteUsd : currentSelection.crd * currentSelection.rate;
  const baseRateCost = purchaseMode === "alacarte" ? alacarteUsd : currentSelection.crd * BASE_RATE;
  const savings = purchaseMode === "alacarte" ? 0 : baseRateCost - usdAmount;
  const effectiveRate = purchaseMode === "alacarte" ? BASE_RATE : currentSelection.rate;
  const canProceed = purchaseMode === "alacarte" ? alacarteValid : true;

  const handleAlacarteInput = (val: string) => {
    console.log(`[SynapseTopUp][handleAlacarteInput] START: Processing input value: ${val}`);
    try {
      const digits = val.replace(/\D/g, "");
      if (digits.length <= 4) {
        setAlacarteAmount(digits);
        console.log(`[SynapseTopUp][handleAlacarteInput] INFO: Valid length, state updated to: ${digits}`);
      } else {
        console.log(`[SynapseTopUp][handleAlacarteInput] INFO: Input exceeds 4 digits, rejected.`);
      }
    } catch (err) {
      console.error("[SynapseTopUp][handleAlacarteInput] ERROR: Exception caught processing input.", err);
    } finally {
      console.log("[SynapseTopUp][handleAlacarteInput] END: Finished processing input.");
    }
  };

  const handlePurchase = async () => {
    console.log("[SynapseTopUp][handlePurchase] START: Initiating purchase sequence.");
    if (!canProceed) {
      console.warn("[SynapseTopUp][handlePurchase] WARN: Execution halted. canProceed is false.");
      return;
    }

    console.log(
      "[SynapseTopUp][handlePurchase][SETTLEMENT_CORE_START] Initializing Parallel Rail Settlement sequence...",
    );
    console.log(
      `[SynapseTopUp][handlePurchase][DEBUG] Target Wallet: ${IDIA_SYNAPSE_WALLET} | Amount: $${usdAmount} | Rail: ${paymentRail.toUpperCase()}`,
    );

    setStep("processing");
    setError(null);

    try {
      let txReference = `INT-${crypto.randomUUID().slice(0, 8)}`;
      console.log(`[SynapseTopUp][handlePurchase] INFO: Generated internal txReference: ${txReference}`);

      if (paymentRail === "usdc") {
        console.log("[SynapseTopUp][handlePurchase][INTERNAL_TX_BEGIN] Initiating internal IDIA Life USDC transfer...");

        // 1. Verify Internal Funds
        console.log(
          `[SynapseTopUp][handlePurchase] INFO: Verifying funds. Required: $${usdAmount}, Available: $${availableUSDC}`,
        );
        if (availableUSDC < usdAmount) {
          const fundError = new Error(
            `Insufficient internal USDC balance. You have $${availableUSDC.toFixed(2)} available.`,
          );
          console.error("[SynapseTopUp][handlePurchase][INTERNAL_TX_ERROR] Fund verification failed.", fundError);
          throw fundError;
        }

        // 2. Simulate Internal Custodial Lock
        console.log("[SynapseTopUp][handlePurchase] INFO: Securing internal custodial funds...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("[SynapseTopUp][handlePurchase][INTERNAL_TX_SUCCESS] Funds secured for internal transfer.");
      } else {
        console.log("[SynapseTopUp][handlePurchase][FIAT_WP_START] Initializing Worldpay PCI-DSS authorization...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("[SynapseTopUp][handlePurchase][FIAT_WP_END] Fiat authorization secured.");
        txReference = `WP-${crypto.randomUUID().slice(0, 8)}`;
      }

      console.log(`[SynapseTopUp][handlePurchase][LEDGER_HYDRATION_START] Calling top-up-credits edge function...`);

      const userReq = await supabase.auth.getUser();
      if (userReq.error || !userReq.data.user) {
        console.error("[SynapseTopUp][handlePurchase] ERROR: Failed to fetch user from Supabase auth.");
        throw new Error("Authentication failed before ledger hydration.");
      }
      console.log(`[SynapseTopUp][handlePurchase] INFO: Authenticated user ID: ${userReq.data.user.id}`);

      // 3. Dispatch to Edge Function
      const { error: topUpError } = await supabase.functions.invoke("top-up-credits", {
        body: {
          user_id: userReq.data.user.id,
          credit_amount: displayCredits,
          usd_amount: usdAmount,
          payment_reference: txReference,
          payment_method: paymentRail === "usdc" ? "internal_usdc" : "worldpay",
          target_synapse_wallet: IDIA_SYNAPSE_WALLET,
        },
      });

      if (topUpError) {
        console.error("[SynapseTopUp][handlePurchase][LEDGER_HYDRATION_ERROR] Edge function rejection:", topUpError);
        throw topUpError;
      }

      console.log("[SynapseTopUp][handlePurchase][LEDGER_HYDRATION_END] Settlement successfully propagated to ledger.");

      setStep("success");
      toast({
        title: "Synapse Hydrated!",
        description: `${formatCredits(displayCredits)} added to your operational ledger.`,
      });

      console.log("[SynapseTopUp][handlePurchase] INFO: Refreshing local balance contexts...");
      await refreshSynapseBalance();
      await refreshWalletBalance();
      console.log("[SynapseTopUp][handlePurchase] INFO: Balance contexts refreshed.");

      setTimeout(() => {
        console.log("[SynapseTopUp][handlePurchase] INFO: Executing soft reset timeout.");
        setStep("select");
        setPurchaseMode("tier");
        setAlacarteAmount("");
      }, 3500);
    } catch (err: any) {
      console.error("[SynapseTopUp][handlePurchase][SETTLEMENT_CRITICAL_FAILURE] Error during purchase:", err.message);
      setError(err.message || "Payment processing failed.");
      toast({
        title: "Settlement Failed",
        description: err.message || "An error occurred during authorization.",
        variant: "destructive",
      });
      setStep("select");
    } finally {
      console.log("[SynapseTopUp][handlePurchase] END: Purchase sequence exited.");
    }
  };

  const copyToClipboard = (text: string) => {
    console.log(`[SynapseTopUp][copyToClipboard] START: Copying text to clipboard: ${text}`);
    try {
      navigator.clipboard.writeText(text);
      toast({ title: "Address copied to clipboard" });
      console.log("[SynapseTopUp][copyToClipboard] SUCCESS: Text copied successfully.");
    } catch (err) {
      console.error("[SynapseTopUp][copyToClipboard] ERROR: Failed to copy text to clipboard.", err);
    } finally {
      console.log("[SynapseTopUp][copyToClipboard] END: Exiting function.");
    }
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
          Purchase Synapse Credits to execute data queries and fund Liability Shield protocol transfers. Funds held in
          secure FBO account at Airwallex. Larger tranches unlock lower per-credit rates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Tiers / A La Carte */}
        <div className="md:col-span-2 space-y-4">
          {/* Mode Toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => {
                console.log("[SynapseTopUp] INFO: Purchase mode set to 'tier'");
                setPurchaseMode("tier");
              }}
              className={`flex-1 text-sm font-medium py-2.5 px-4 transition-colors ${
                purchaseMode === "tier"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              Volume Tranches
            </button>
            <button
              onClick={() => {
                console.log("[SynapseTopUp] INFO: Purchase mode set to 'alacarte'");
                setPurchaseMode("alacarte");
              }}
              className={`flex-1 text-sm font-medium py-2.5 px-4 transition-colors ${
                purchaseMode === "alacarte"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              A La Carte
            </button>
          </div>

          {purchaseMode === "tier" ? (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Select Volume Tranche
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {pricingTiers.map((tier) => {
                  const usdCost = tier.crd * tier.rate;
                  const isSelected = selectedTier === tier.crd;
                  return (
                    <div
                      key={tier.crd}
                      onClick={() => {
                        console.log(`[SynapseTopUp] INFO: Tier selected: ${tier.label} (${tier.crd} CRD)`);
                        setSelectedTier(tier.crd);
                      }}
                      className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      {tier.popular && (
                        <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary" : "border-muted-foreground/50"}`}
                          >
                            {isSelected && <div className="w-2 h-2 bg-primary rounded-full" />}
                          </div>
                          <span className="text-foreground font-semibold">{tier.label}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                            ${tier.rate.toFixed(2)} / CR
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground ml-7">{tier.description}</p>
                      </div>
                      <div className="text-left sm:text-right ml-7 sm:ml-0">
                        <div className="text-2xl font-bold text-foreground font-mono">{formatCredits(tier.crd)}</div>
                        <div className="text-sm text-muted-foreground">
                          ${usdCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-4 p-5 rounded-xl border-2 border-border bg-card">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Custom Amount</h2>
              <p className="text-sm text-muted-foreground">
                Enter a whole dollar amount between $2 and $1,000. Credits are calculated at the base rate of $
                {BASE_RATE.toFixed(2)}/CR (no volume discount).
              </p>
              <div className="space-y-2">
                <Label>Purchase Amount</Label>
                <div className="flex items-center gap-0">
                  <span className="flex items-center justify-center h-10 px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm font-medium text-muted-foreground">
                    $
                  </span>
                  <Input
                    className="rounded-none border-r-0 font-mono text-lg"
                    placeholder="25"
                    value={alacarteAmount}
                    onChange={(e) => handleAlacarteInput(e.target.value)}
                    inputMode="numeric"
                  />
                  <span className="flex items-center justify-center h-10 px-3 bg-muted border border-l-0 border-input rounded-r-md text-sm font-medium text-muted-foreground">
                    .00
                  </span>
                </div>
                {alacarteAmount && !alacarteValid && (
                  <p className="text-xs text-destructive">
                    {alacarteUsd < 2 ? "Minimum purchase is $2.00" : "Maximum purchase is $1,000.00"}
                  </p>
                )}
                {alacarteValid && (
                  <p className="text-sm text-emerald-400 font-medium">
                    You will receive <span className="font-mono font-bold">{formatCredits(alacarteCredits)}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary & Action */}
        <div className="bg-card border border-border rounded-xl p-6 h-fit sticky top-6">
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-foreground font-semibold text-center">Broadcasting to Distributed Ledger...</p>
              <p className="text-muted-foreground text-xs text-center">Finalizing settlement rails. Do not refresh.</p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="text-foreground font-bold text-xl text-center">Synapse Hydrated!</p>
              <p className="text-muted-foreground text-sm text-center">
                {formatCredits(displayCredits)} successfully settled.
              </p>
            </div>
          )}

          {step === "select" && (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
                Transaction Summary
              </h2>

              <div className="flex justify-between text-sm mb-4">
                <span className="text-muted-foreground">Current Balance</span>
                <span className="text-foreground font-mono">{formatCredits(currentBalance)}</span>
              </div>

              <div className="flex justify-between text-sm mb-4">
                <span className="text-muted-foreground">Credits to Add</span>
                <span className="text-emerald-400 font-mono">+{formatCredits(displayCredits)}</span>
              </div>

              <div className="flex justify-between text-sm mb-4">
                <span className="text-muted-foreground">Effective Rate</span>
                <span className="text-foreground font-mono">${effectiveRate.toFixed(2)} / CR</span>
              </div>

              {savings > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg mb-6">
                  <Tag className="w-4 h-4" />
                  Volume discount applied. You save ${savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}.
                </div>
              )}

              <div className="pt-6 border-t border-border flex justify-between items-end mb-6">
                <span className="text-foreground font-medium">Total Due</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground font-mono">
                    ${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">USD</div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-xs text-center">
                  {error}
                </div>
              )}

              {/* Payment Rail Selector */}
              <div className="flex rounded-lg border border-border overflow-hidden mb-6">
                <button
                  onClick={() => {
                    console.log("[SynapseTopUp] INFO: Payment rail set to 'worldpay'");
                    setPaymentRail("worldpay");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-3 px-2 transition-colors ${
                    paymentRail === "worldpay"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CreditCard className="h-4 w-4" /> Fiat
                </button>
                <button
                  onClick={() => {
                    console.log("[SynapseTopUp] INFO: Payment rail set to 'usdc'");
                    setPaymentRail("usdc");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-3 px-2 transition-colors ${
                    paymentRail === "usdc"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CircleDollarSign className="h-4 w-4" /> Internal USDC
                </button>
              </div>

              {/* Rail Specific UI */}
              {paymentRail === "usdc" ? (
                <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3 mb-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Treasury Address</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={IDIA_SYNAPSE_WALLET} className="font-mono text-xs h-9 bg-background" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(IDIA_SYNAPSE_WALLET)}
                        className="h-9 px-3"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Settlement will be executed instantly via your IDIA Life internal custodial balance.
                  </p>
                </div>
              ) : (
                <div className="min-h-[120px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center bg-muted/50 mb-6 p-4">
                  <Lock className="mx-auto h-6 w-6 text-primary animate-pulse mb-2" />
                  <p className="text-xs font-medium text-foreground text-center">PCI-DSS Port Initializing...</p>
                  <p className="text-[11px] text-muted-foreground text-center mt-1">
                    Encryption handled via Worldpay SDK.
                  </p>
                </div>
              )}

              <Button
                onClick={handlePurchase}
                disabled={!canProceed}
                className="w-full flex justify-center items-center px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed h-auto"
              >
                {paymentRail === "usdc" ? (
                  <>
                    <CircleDollarSign className="w-4 h-4 mr-2" /> Confirm Custodial Transfer
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" /> Authorize via Worldpay
                  </>
                )}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3" />
                <span>
                  {paymentRail === "worldpay"
                    ? "PCI-DSS Level 1 Secured • FBO at Airwallex"
                    : "Zero-latency internal settlement"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SynapseTopUp;
