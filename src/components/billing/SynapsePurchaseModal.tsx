import { useState } from "react";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Coins,
  CreditCard,
  ShieldCheck,
  Tag,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  CircleDollarSign,
  ShoppingCart,
} from "lucide-react";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCredits } from "@/lib/utils";
import SynapseGasGauge from "./SynapseGasGauge";

const IDIA_SYNAPSE_WALLET = "0x649436db4d9352240d1132d9372293e5cc6af0e3";
const BASE_RATE = 0.75;
const WIX_DOMAIN = "https://www.thebigidia.com";

const creditTiers = [
  { id: "tier1", name: "Tier 1", credits: 1000, rate: 0.7, popular: false, description: "Minimum bulk entry" },
  {
    id: "tier2",
    name: "Tier 2",
    credits: 5000,
    rate: 0.65,
    popular: true,
    description: "Standard operational capacity",
  },
  { id: "tier3", name: "Tier 3", credits: 20000, rate: 0.6, popular: false, description: "Maximum volume discount" },
];

interface SynapsePurchaseModalProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  insufficientWarning?: string;
}

const SynapsePurchaseModal = ({
  trigger,
  defaultOpen,
  onOpenChange,
  insufficientWarning,
}: SynapsePurchaseModalProps) => {
  const { balanceData, protocolState, refreshBalance: refreshSynapseBalance } = useSynapseCredits();
  const { balance: walletBalance, refreshBalance: refreshWalletBalance } = useWalletBalance();
  const availableUSDC = walletBalance?.usdc_balance ?? 0;

  const [selectedTier, setSelectedTier] = useState<string>("tier2");
  const [step, setStep] = useState<"select" | "payment" | "processing" | "success">("select");
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [purchaseMode, setPurchaseMode] = useState<"tier" | "alacarte">("tier");
  const [alacarteAmount, setAlacarteAmount] = useState("");
  const [paymentRail, setPaymentRail] = useState<"wix" | "usdc">("usdc");

  const currentTier = creditTiers.find((t) => t.id === selectedTier) || creditTiers[1];
  const alacarteUsd = parseInt(alacarteAmount) || 0;
  const alacarteCredits = alacarteUsd / BASE_RATE;
  const alacarteValid = alacarteUsd >= 2 && alacarteUsd <= 10000;

  const displayCredits = purchaseMode === "alacarte" ? alacarteCredits : currentTier.credits;
  const usdAmount = purchaseMode === "alacarte" ? alacarteUsd : currentTier.credits * currentTier.rate;
  const canProceed = purchaseMode === "alacarte" ? alacarteValid : true;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChange?.(isOpen);
    if (!isOpen) {
      setStep("select");
      setPurchaseMode("tier");
      setAlacarteAmount("");
      setPaymentRail("usdc");
    }
  };

  const handlePurchase = async () => {
    console.log(`[SynapsePurchaseModal][handlePurchase] [START] Initiating settlement via ${paymentRail}.`);
    if (!canProceed) return;

    setStep("processing");

    try {
      console.log("[SynapsePurchaseModal][handlePurchase] [AUTH_CHECK] Verifying session...");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("[SynapsePurchaseModal][handlePurchase] [ERROR] Auth session missing.");
        throw new Error("Authentication failed. Please re-login.");
      }

      // ==========================================
      // RAIL 1: WIX FIAT CHECKOUT
      // ==========================================
      if (paymentRail === "wix") {
        console.log("[SynapsePurchaseModal][handlePurchase] [WIX_HANDOFF] [START] Packing payload.");

        const payload = {
          userId: session.user.id,
          amount: usdAmount,
          credits: displayCredits,
          idempotency: crypto.randomUUID(),
        };

        const wixResponse = await fetch(`${WIX_DOMAIN}/_functions/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!wixResponse.ok) {
          const errBody = await wixResponse.text();
          console.error(`[SynapsePurchaseModal][WIX_HANDOFF] [FAILED] HTTP ${wixResponse.status}:`, errBody);
          throw new Error("Wix checkout initialization failed.");
        }

        const wixData = await wixResponse.json();
        if (wixData?.redirectUrl) {
          console.log("[SynapsePurchaseModal][WIX_HANDOFF] [SUCCESS] Redirecting to portal.");
          window.location.href = wixData.redirectUrl;
          return;
        } else {
          throw new Error("Gateway routing error. Redirect URL missing.");
        }
      }

      // ==========================================
      // RAIL 2: INTERNAL USDC SWAP
      // ==========================================
      console.log(`[SynapsePurchaseModal][handlePurchase] [USDC_FLOW] Checking liquidity: Required $${usdAmount}`);

      if (availableUSDC < usdAmount) {
        throw new Error(`Insufficient USDC balance ($${availableUSDC.toFixed(2)}). Please fund your wallet.`);
      }

      const txReference = `INT-${crypto.randomUUID().slice(0, 8)}`;
      console.log("[SynapsePurchaseModal][handlePurchase] [LEDGER_DISPATCH] Invoking hydration...");

      const { error: topUpError } = await supabase.functions.invoke("top-up-credits", {
        body: {
          user_id: session.user.id,
          credit_amount: displayCredits,
          usd_amount: usdAmount,
          payment_reference: txReference,
          payment_method: "internal_usdc",
          target_synapse_wallet: IDIA_SYNAPSE_WALLET,
          user_wallet: protocolState?.wallet_address || "custodial_vault",
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (topUpError) throw topUpError;

      console.log("[SynapsePurchaseModal][handlePurchase] [SUCCESS] Ledger updated.");
      setStep("success");
      toast.success("Synapse Hydrated!");

      await Promise.all([refreshSynapseBalance(), refreshWalletBalance()]);
      setTimeout(() => handleOpenChange(false), 3000);
    } catch (err: any) {
      console.error("[SynapsePurchaseModal][handlePurchase] [END_WITH_ERROR] Transaction stalled:", err.message);
      toast.error(err.message || "Settlement failed.");
      setStep("payment");
    } finally {
      console.log("[SynapsePurchaseModal][handlePurchase] [FINALLY] Exit.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            Buy Credits
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Coins className="h-5 w-5 text-primary" />
            {step === "payment"
              ? "Authorize Settlement"
              : step === "processing"
                ? "Settling..."
                : step === "success"
                  ? "Complete"
                  : "Purchase Synapse Credits"}
          </DialogTitle>
          <DialogDescription>
            {step === "payment"
              ? `Review hydration via ${paymentRail === "usdc" ? "Internal USDC" : "Credit/Debit"}`
              : "Fuel your data operations with Synapse Credits"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {step === "select" && (
            <>
              <div className="flex justify-center">
                <SynapseGasGauge />
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setPurchaseMode("tier")}
                  className={`flex-1 text-sm font-medium py-2.5 ${purchaseMode === "tier" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                >
                  Volume Tranches
                </button>
                <button
                  onClick={() => setPurchaseMode("alacarte")}
                  className={`flex-1 text-sm font-medium py-2.5 ${purchaseMode === "alacarte" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                >
                  A La Carte
                </button>
              </div>

              {purchaseMode === "tier" ? (
                <div className="grid grid-cols-1 gap-3">
                  {creditTiers.map((tier) => (
                    <Card
                      key={tier.id}
                      className={`p-4 cursor-pointer transition-all ${selectedTier === tier.id ? "ring-2 ring-primary bg-primary/5" : ""}`}
                      onClick={() => setSelectedTier(tier.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${selectedTier === tier.id ? "border-primary" : "border-muted-foreground/50"}`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{tier.name}</span>
                              <Badge variant="secondary" className="text-[10px]">
                                ${tier.rate}/CR
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{tier.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold font-mono">{formatCredits(tier.credits)}</div>
                          <p className="text-xs text-muted-foreground">${(tier.credits * tier.rate).toFixed(2)} USD</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <Label>Purchase Amount (USD)</Label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md">$</span>
                    <Input
                      className="rounded-none font-mono"
                      placeholder="100"
                      value={alacarteAmount}
                      onChange={(e) => setAlacarteAmount(e.target.value.replace(/\D/g, ""))}
                    />
                    <span className="px-3 py-2 bg-muted border border-l-0 rounded-r-md">.00</span>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 border rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>USDC Balance</span>
                  <span className="text-primary font-bold">${availableUSDC.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between text-sm font-mono text-emerald-500">
                  <span>Credits to Add</span>
                  <span>+{formatCredits(displayCredits)}</span>
                </div>
                <div className="pt-3 border-t flex justify-between items-end">
                  <span className="font-medium">Total Due</span>
                  <span className="text-xl font-bold font-mono">${usdAmount.toFixed(2)}</span>
                </div>
              </div>

              <Button className="w-full gap-2" size="lg" onClick={() => setStep("payment")} disabled={!canProceed}>
                Continue to Payment <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setPaymentRail("usdc")}
                  className={`flex-1 py-3 text-xs flex items-center justify-center gap-2 ${paymentRail === "usdc" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                >
                  <CircleDollarSign className="w-4 h-4" /> Internal USDC
                </button>
                <button
                  onClick={() => setPaymentRail("wix")}
                  className={`flex-1 py-3 text-xs flex items-center justify-center gap-2 ${paymentRail === "wix" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                >
                  <CreditCard className="w-4 h-4" /> Credit/Debit
                </button>
              </div>

              {paymentRail === "usdc" ? (
                <div className="p-4 bg-muted/30 border rounded-xl text-xs leading-relaxed">
                  Authorize transfer of <strong>${usdAmount.toFixed(2)} USDC</strong> to Treasury.
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed rounded-xl flex flex-col items-center gap-2 bg-muted/30">
                  <ShoppingCart className="w-8 h-8 text-primary" />
                  <p className="text-sm font-medium">Wix Checkout Handoff</p>
                  <p className="text-xs text-muted-foreground">Redirecting to secure fiat portal.</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("select")}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button className="flex-1" size="lg" onClick={handlePurchase}>
                  {paymentRail === "usdc" ? "Confirm & Spend USDC" : "Proceed to Wix"}
                </Button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="font-bold text-xs uppercase tracking-widest">
                {paymentRail === "wix" ? "Initializing Wix..." : "Syncing Ledger..."}
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="font-bold text-lg">Synapse Hydrated!</p>
              <p className="text-muted-foreground text-sm">{formatCredits(displayCredits)} added to ledger.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SynapsePurchaseModal;
