import { useState } from "react";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import {
  CreditCard,
  Zap,
  ShieldCheck,
  Loader2,
  CircleDollarSign,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Copy,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { formatCredits } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const TREASURY_ADDRESS = "0x649436db4d9352240d1132d9372293e5cc6af0e3";

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

const BASE_RATE = 0.75;

const SynapseTopUp = () => {
  const { user } = useAuth();
  const { protocolState, refreshState: refreshSynapseBalance } = useSynapseCredits();
  const { refreshBalance: refreshWalletBalance } = useWalletBalance();

  const [selectedTier, setSelectedTier] = useState(5000);
  const [step, setStep] = useState<"select" | "processing" | "success" | "awaiting_deposit">("select");
  const [error, setError] = useState<string | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<"tier" | "alacarte">("tier");
  const [alacarteAmount, setAlacarteAmount] = useState("");

  const [paymentRail, setPaymentRail] = useState<"internal_usdc" | "external_usdc" | "fiat">("internal_usdc");

  const currentSelection = pricingTiers.find((t) => t.crd === selectedTier) || pricingTiers[1];
  const alacarteUsd = parseInt(alacarteAmount) || 0;
  const alacarteCredits = alacarteUsd / BASE_RATE;
  const alacarteValid = alacarteUsd >= 2 && alacarteUsd <= 1000;

  const displayCredits = purchaseMode === "alacarte" ? alacarteCredits : currentSelection.crd;
  const usdAmount = purchaseMode === "alacarte" ? alacarteUsd : currentSelection.crd * currentSelection.rate;
  const canProceed = purchaseMode === "alacarte" ? alacarteValid : true;

  const currentUsdcBalance = protocolState?.usdc_balance ?? 0;
  // Resolve the actual provisioned wallet from protocol state or user metadata
  const provisionedWallet = protocolState?.wallet_address || (user as any)?.wallet_address;

  const handleAlacarteInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 4) setAlacarteAmount(digits);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Address Copied", description: "Treasury address copied to clipboard." });
  };

  const handlePurchase = async () => {
    console.log(`[SynapseTopUp][handlePurchase] START: Initiating settlement via ${paymentRail}.`);

    if (paymentRail === "external_usdc") {
      console.log("[SynapseTopUp][handlePurchase] INFO: Routing to manual external deposit screen.");
      setStep("awaiting_deposit");
      return;
    }

    setStep("processing");
    setError(null);

    try {
      console.log("[SynapseTopUp][handlePurchase][AUTH] START: Fetching Supabase session.");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData?.session) {
        throw new Error("Authentication failed. Please log in again.");
      }
      const session = sessionData.session;
      console.log(`[SynapseTopUp][handlePurchase][AUTH] END: User ${session.user.id} verified.`);

      // VALIDATION: Ensure we have a hex address for any on-chain routing
      const isBlockchainRoute = paymentRail !== "fiat";
      if (isBlockchainRoute && (!provisionedWallet || !provisionedWallet.startsWith("0x"))) {
        console.error("[SynapseTopUp][handlePurchase][VALIDATION] FATAL: Provisioned wallet missing or invalid.");
        throw new Error("Provisioned wallet not found. Contact system administrator.");
      }

      // DEFINITIVE ROUTING PAYLOAD: Compliant with Dual-Rail Federal Mandate
      const payload = {
        user_id: session.user.id,
        credit_amount: displayCredits,
        usd_amount: usdAmount,
        amount: displayCredits,
        payment_method: paymentRail,
        // THE DEFINITIVE GATE: Strict separation of rails
        routing: paymentRail === "fiat" ? "fiat" : "on-chain",
        // HARD HEX RESOLUTION: No string placeholders allowed
        user_wallet: isBlockchainRoute ? provisionedWallet : null,
        recipient_address: isBlockchainRoute ? provisionedWallet : null,
      };

      console.log(
        `[SynapseTopUp][handlePurchase][API_INVOKE] START: Dispatching ${payload.routing} settlement. Wallet: ${payload.user_wallet}`,
        JSON.stringify(payload),
      );

      const { data, error: functionError } = await supabase.functions.invoke("top-up-credits", {
        body: payload,
      });

      if (functionError) {
        console.error("[SynapseTopUp][handlePurchase][API_INVOKE] FATAL: Edge function atomic failure.", functionError);
        throw functionError;
      }

      console.log("[SynapseTopUp][handlePurchase][API_INVOKE] END: Settlement successful.", data);

      setStep("success");
      toast({ title: "Hydration Successful", description: `${formatCredits(displayCredits)} added.` });

      console.log("[SynapseTopUp][handlePurchase][REFRESH] START: Syncing UI ledger state.");
      await Promise.all([refreshSynapseBalance?.(), refreshWalletBalance?.()]);
      console.log("[SynapseTopUp][handlePurchase][REFRESH] END: State synchronized.");

      setTimeout(() => setStep("select"), 4000);
    } catch (err: any) {
      console.error("🚨 [SynapseTopUp][handlePurchase] FATAL EXCEPTION CAUGHT:", err.message);
      setError(err.message || "Settlement failed.");
      setStep("select");
    } finally {
      console.log("[SynapseTopUp][handlePurchase] END: Logic execution finished.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Fund Synapse Credits
        </h1>
        <p className="text-muted-foreground mt-2">
          Dual-Rail Settlement Protocol. Secure <strong>On-Chain USDC</strong> or <strong>Fiat</strong> hydration to
          fuel AI operations.
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
              <p className="font-semibold text-center">Enforcing Atomic Settlement...</p>
              <p className="text-xs text-muted-foreground text-center">Do not refresh. Verifying dual-rail truth.</p>
            </div>
          ) : step === "success" ? (
            <div className="flex flex-col items-center py-12 gap-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="font-bold text-xl">Hydrated!</p>
            </div>
          ) : step === "awaiting_deposit" ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <QrCode className="w-12 h-12 text-primary" />
              <p className="font-bold text-lg">External Wallet Bridge</p>
              <p className="text-xs text-muted-foreground mb-2">
                Send exactly <strong>${usdAmount.toFixed(2)} USDC</strong> (Base) to the IDIA Transaction Register
                below.
              </p>

              <div className="w-full flex items-center justify-between bg-muted p-2 rounded border border-border">
                <span className="text-[10px] font-mono text-muted-foreground truncate mr-2">{TREASURY_ADDRESS}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(TREASURY_ADDRESS)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              <div className="w-full p-3 bg-primary/10 text-primary text-xs rounded-lg mt-2">
                Webhook listener active. Settlement will hydrate once block confirms.
              </div>

              <button onClick={() => setStep("select")} className="text-xs text-muted-foreground underline mt-4">
                Go Back
              </button>
            </div>
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
                    IDIA Ledger Avail: ${currentUsdcBalance.toFixed(2)}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 mb-6">
                <button
                  onClick={() => setPaymentRail("internal_usdc")}
                  className={`flex items-center justify-start px-3 gap-3 text-xs py-3 rounded-md border ${paymentRail === "internal_usdc" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border"}`}
                >
                  <Wallet className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-bold">IDIA Provisioned Wallet</div>
                    <div className="text-[9px] opacity-70">Strict On-Chain Pull</div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentRail("external_usdc")}
                  className={`flex items-center justify-start px-3 gap-3 text-xs py-3 rounded-md border ${paymentRail === "external_usdc" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border"}`}
                >
                  <CircleDollarSign className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-bold">External Web3 Wallet</div>
                    <div className="text-[9px] opacity-70">Manual Deposit (QR)</div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentRail("fiat")}
                  className={`flex items-center justify-start px-3 gap-3 text-xs py-3 rounded-md border ${paymentRail === "fiat" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border"}`}
                >
                  <CreditCard className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-bold">Fiat Port</div>
                    <div className="text-[9px] opacity-70">Settle via Worldpay</div>
                  </div>
                </button>
              </div>

              <Button onClick={handlePurchase} disabled={!canProceed} className="w-full py-6 font-bold">
                {paymentRail === "external_usdc" ? "SHOW TREASURY QR" : "FORCE ATOMIC SETTLEMENT"}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Dual-Rail Compliance Protocol</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SynapseTopUp;
import { useState } from "react";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import {
  CreditCard,
  Zap,
  ShieldCheck,
  Loader2,
  CircleDollarSign,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Copy,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { formatCredits } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const TREASURY_ADDRESS = "0x649436db4d9352240d1132d9372293e5cc6af0e3";

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

const BASE_RATE = 0.75;

const SynapseTopUp = () => {
  const { user } = useAuth();
  const { protocolState, refreshState: refreshSynapseBalance } = useSynapseCredits();
  const { refreshBalance: refreshWalletBalance } = useWalletBalance();

  const [selectedTier, setSelectedTier] = useState(5000);
  const [step, setStep] = useState<"select" | "processing" | "success" | "awaiting_deposit">("select");
  const [error, setError] = useState<string | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<"tier" | "alacarte">("tier");
  const [alacarteAmount, setAlacarteAmount] = useState("");

  const [paymentRail, setPaymentRail] = useState<"internal_usdc" | "external_usdc" | "fiat">("internal_usdc");

  const currentSelection = pricingTiers.find((t) => t.crd === selectedTier) || pricingTiers[1];
  const alacarteUsd = parseInt(alacarteAmount) || 0;
  const alacarteCredits = alacarteUsd / BASE_RATE;
  const alacarteValid = alacarteUsd >= 2 && alacarteUsd <= 1000;

  const displayCredits = purchaseMode === "alacarte" ? alacarteCredits : currentSelection.crd;
  const usdAmount = purchaseMode === "alacarte" ? alacarteUsd : currentSelection.crd * currentSelection.rate;
  const canProceed = purchaseMode === "alacarte" ? alacarteValid : true;

  const currentUsdcBalance = protocolState?.usdc_balance ?? 0;
  // Resolve the actual provisioned wallet from protocol state or user metadata
  const provisionedWallet = protocolState?.wallet_address || (user as any)?.wallet_address;

  const handleAlacarteInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 4) setAlacarteAmount(digits);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Address Copied", description: "Treasury address copied to clipboard." });
  };

  const handlePurchase = async () => {
    console.log(`[SynapseTopUp][handlePurchase] START: Initiating settlement via ${paymentRail}.`);

    if (paymentRail === "external_usdc") {
      console.log("[SynapseTopUp][handlePurchase] INFO: Routing to manual external deposit screen.");
      setStep("awaiting_deposit");
      return;
    }

    setStep("processing");
    setError(null);

    try {
      console.log("[SynapseTopUp][handlePurchase][AUTH] START: Fetching Supabase session.");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData?.session) {
        throw new Error("Authentication failed. Please log in again.");
      }
      const session = sessionData.session;
      console.log(`[SynapseTopUp][handlePurchase][AUTH] END: User ${session.user.id} verified.`);

      // VALIDATION: Ensure we have a hex address for any on-chain routing
      const isBlockchainRoute = paymentRail !== "fiat";
      if (isBlockchainRoute && (!provisionedWallet || !provisionedWallet.startsWith("0x"))) {
        console.error("[SynapseTopUp][handlePurchase][VALIDATION] FATAL: Provisioned wallet missing or invalid.");
        throw new Error("Provisioned wallet not found. Contact system administrator.");
      }

      // DEFINITIVE ROUTING PAYLOAD: Compliant with Dual-Rail Federal Mandate
      const payload = {
        user_id: session.user.id,
        credit_amount: displayCredits,
        usd_amount: usdAmount,
        amount: displayCredits,
        payment_method: paymentRail,
        // THE DEFINITIVE GATE: Strict separation of rails
        routing: paymentRail === "fiat" ? "fiat" : "on-chain",
        // HARD HEX RESOLUTION: No string placeholders allowed
        user_wallet: isBlockchainRoute ? provisionedWallet : null,
        recipient_address: isBlockchainRoute ? provisionedWallet : null,
      };

      console.log(
        `[SynapseTopUp][handlePurchase][API_INVOKE] START: Dispatching ${payload.routing} settlement. Wallet: ${payload.user_wallet}`,
        JSON.stringify(payload),
      );

      const { data, error: functionError } = await supabase.functions.invoke("top-up-credits", {
        body: payload,
      });

      if (functionError) {
        console.error("[SynapseTopUp][handlePurchase][API_INVOKE] FATAL: Edge function atomic failure.", functionError);
        throw functionError;
      }

      console.log("[SynapseTopUp][handlePurchase][API_INVOKE] END: Settlement successful.", data);

      setStep("success");
      toast({ title: "Hydration Successful", description: `${formatCredits(displayCredits)} added.` });

      console.log("[SynapseTopUp][handlePurchase][REFRESH] START: Syncing UI ledger state.");
      await Promise.all([refreshSynapseBalance?.(), refreshWalletBalance?.()]);
      console.log("[SynapseTopUp][handlePurchase][REFRESH] END: State synchronized.");

      setTimeout(() => setStep("select"), 4000);
    } catch (err: any) {
      console.error("🚨 [SynapseTopUp][handlePurchase] FATAL EXCEPTION CAUGHT:", err.message);
      setError(err.message || "Settlement failed.");
      setStep("select");
    } finally {
      console.log("[SynapseTopUp][handlePurchase] END: Logic execution finished.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Fund Synapse Credits
        </h1>
        <p className="text-muted-foreground mt-2">
          Dual-Rail Settlement Protocol. Secure <strong>On-Chain USDC</strong> or <strong>Fiat</strong> hydration to
          fuel AI operations.
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
              <p className="font-semibold text-center">Enforcing Atomic Settlement...</p>
              <p className="text-xs text-muted-foreground text-center">Do not refresh. Verifying dual-rail truth.</p>
            </div>
          ) : step === "success" ? (
            <div className="flex flex-col items-center py-12 gap-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="font-bold text-xl">Hydrated!</p>
            </div>
          ) : step === "awaiting_deposit" ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <QrCode className="w-12 h-12 text-primary" />
              <p className="font-bold text-lg">External Wallet Bridge</p>
              <p className="text-xs text-muted-foreground mb-2">
                Send exactly <strong>${usdAmount.toFixed(2)} USDC</strong> (Base) to the IDIA Transaction Register
                below.
              </p>

              <div className="w-full flex items-center justify-between bg-muted p-2 rounded border border-border">
                <span className="text-[10px] font-mono text-muted-foreground truncate mr-2">{TREASURY_ADDRESS}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(TREASURY_ADDRESS)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              <div className="w-full p-3 bg-primary/10 text-primary text-xs rounded-lg mt-2">
                Webhook listener active. Settlement will hydrate once block confirms.
              </div>

              <button onClick={() => setStep("select")} className="text-xs text-muted-foreground underline mt-4">
                Go Back
              </button>
            </div>
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
                    IDIA Ledger Avail: ${currentUsdcBalance.toFixed(2)}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 mb-6">
                <button
                  onClick={() => setPaymentRail("internal_usdc")}
                  className={`flex items-center justify-start px-3 gap-3 text-xs py-3 rounded-md border ${paymentRail === "internal_usdc" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border"}`}
                >
                  <Wallet className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-bold">IDIA Provisioned Wallet</div>
                    <div className="text-[9px] opacity-70">Strict On-Chain Pull</div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentRail("external_usdc")}
                  className={`flex items-center justify-start px-3 gap-3 text-xs py-3 rounded-md border ${paymentRail === "external_usdc" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border"}`}
                >
                  <CircleDollarSign className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-bold">External Web3 Wallet</div>
                    <div className="text-[9px] opacity-70">Manual Deposit (QR)</div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentRail("fiat")}
                  className={`flex items-center justify-start px-3 gap-3 text-xs py-3 rounded-md border ${paymentRail === "fiat" ? "bg-primary/10 border-primary text-primary" : "bg-card border-border"}`}
                >
                  <CreditCard className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-bold">Fiat Port</div>
                    <div className="text-[9px] opacity-70">Settle via Worldpay</div>
                  </div>
                </button>
              </div>

              <Button onClick={handlePurchase} disabled={!canProceed} className="w-full py-6 font-bold">
                {paymentRail === "external_usdc" ? "SHOW TREASURY QR" : "FORCE ATOMIC SETTLEMENT"}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Dual-Rail Compliance Protocol</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SynapseTopUp;
