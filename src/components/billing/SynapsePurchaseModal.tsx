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
} from "lucide-react";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCredits } from "@/lib/utils";
import SynapseGasGauge from "./SynapseGasGauge";
import { connectEmbeddedWallet } from "@/lib/metamask-sdk";
import { ensureUsdcApproval } from "@/lib/usdc-approval";
import { Wallet } from "lucide-react";

const IDIA_SYNAPSE_WALLET = "0x649436db4d9352240d1132d9372293e5cc6af0e3";
const BASE_RATE = 0.75;

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
  console.log("[SynapsePurchaseModal][Component] [START] Rendering component.");

  const { balanceData, protocolState, refreshBalance: refreshSynapseBalance } = useSynapseCredits();
  const { balance: walletBalance, refreshBalance: refreshWalletBalance } = useWalletBalance();
  const availableUSDC = walletBalance?.usdc_balance ?? 0;

  const [selectedTier, setSelectedTier] = useState<string>("tier2");
  const [step, setStep] = useState<"select" | "payment" | "processing" | "success">("select");
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [purchaseMode, setPurchaseMode] = useState<"tier" | "alacarte">("tier");
  const [alacarteAmount, setAlacarteAmount] = useState("");
  const [paymentRail, setPaymentRail] = useState<"wix" | "usdc">("usdc");
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  const currentTier = creditTiers.find((t) => t.id === selectedTier) || creditTiers[1];
  const alacarteUsd = parseInt(alacarteAmount) || 0;
  const alacarteCredits = alacarteUsd / BASE_RATE;
  const alacarteValid = alacarteUsd >= 2 && alacarteUsd <= 10000;

  const displayCredits = purchaseMode === "alacarte" ? alacarteCredits : currentTier.credits;
  const usdAmount = purchaseMode === "alacarte" ? alacarteUsd : currentTier.credits * currentTier.rate;
  const baseRateCost = displayCredits * BASE_RATE;
  const savings = purchaseMode === "alacarte" ? 0 : baseRateCost - usdAmount;
  const canProceed = purchaseMode === "alacarte" ? alacarteValid : true;

  const handleOpenChange = (isOpen: boolean) => {
    console.log(`[SynapsePurchaseModal][handleOpenChange] [STATE_UPDATE] Modal open state: ${isOpen}`);
    setOpen(isOpen);
    onOpenChange?.(isOpen);
    if (!isOpen) {
      setStep("select");
      setPurchaseMode("tier");
      setAlacarteAmount("");
      setPaymentRail("usdc");
    }
  };

  const handleProceedToPayment = () => {
    if (!canProceed) return;
    setStep("payment");
  };

  const shortfall = Math.max(0, usdAmount - availableUSDC);
  const hasEnoughBalance = shortfall <= 0;

  const handleConnectMetaMask = async () => {
    console.log(
      `[IDIA_PURCHASE_MODAL][MetaMaskOnboard] >>> START: Initiating MetaMask SDK onboarding flow. Shortfall: ${shortfall.toFixed(2)}`,
    );
    setIsConnectingWallet(true);
    try {
      console.log("[IDIA_PURCHASE_MODAL][MetaMaskOnboard] --- ACTION: Calling connectEmbeddedWallet.");
      const accounts = await connectEmbeddedWallet();

      if (accounts && accounts.length > 0) {
        const connectedAddress = accounts[0];
        console.log(
          `[IDIA_PURCHASE_MODAL][MetaMaskOnboard] --- DATA: Successfully connected account: ${connectedAddress}`,
        );

        // Persist the connected address so useWalletBalance can re-hydrate.
        console.log("[IDIA_PURCHASE_MODAL][MetaMaskOnboard] --- ACTION: Persisting wallet_address to profile.");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ wallet_address: connectedAddress })
            .eq("id", session.user.id);
          if (updateError) {
            console.error(
              `[IDIA_PURCHASE_MODAL][MetaMaskOnboard] !!! WARN: Failed to persist wallet_address: ${updateError.message}`,
            );
          }
        }

        console.log("[IDIA_PURCHASE_MODAL][MetaMaskOnboard] --- ACTION: Refreshing wallet balance state.");
        await refreshWalletBalance();

        toast.success("Wallet Connected", {
          description: "Your IDIA Life wallet is now actively bridged.",
        });
      } else {
        toast.error("Connection Cancelled", {
          description: "No accounts were returned from MetaMask.",
        });
      }
    } catch (error: any) {
      console.error(
        `[IDIA_PURCHASE_MODAL][MetaMaskOnboard] !!! FATAL ERROR: MetaMask handshake failed or stalled: ${error?.message}`,
      );
      toast.error("Connection Failed", {
        description: error?.message || "MetaMask onboarding was interrupted.",
      });
    } finally {
      setIsConnectingWallet(false);
      console.log("[IDIA_PURCHASE_MODAL][MetaMaskOnboard] <<< END: MetaMask SDK onboarding flow terminated.");
    }
  };

  const handleAlacarteInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 5) {
      setAlacarteAmount(digits);
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
        console.error("[SynapsePurchaseModal][handlePurchase] [AUTH_CHECK] [FAILED] Auth session missing.");
        throw new Error("Authentication failed. Please re-login.");
      }

      // ==========================================
      // RAIL 1: WIX DIRECT PORT HANDSHAKE (CORS BYPASS)
      // ==========================================
      if (paymentRail === "wix") {
        console.log("[SynapsePurchaseModal][handlePurchase] [WIX_DIRECT] [START] Requesting Wix paymentId.");

        const WIX_DOMAIN = "https://www.thebigidia.com";
        const idempotencyKey = crypto.randomUUID();

        const wixResponse = await fetch(`${WIX_DOMAIN}/_functions/checkout`, {
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

        if (!wixResponse.ok) {
          console.error(
            `[SynapsePurchaseModal][handlePurchase] [WIX_DIRECT] [FAILED] HTTP ${wixResponse.status}`,
          );
          throw new Error(`Wix checkout failed: ${wixResponse.status}`);
        }

        const wixData = await wixResponse.json();
        if (!wixData?.paymentId) {
          console.error("[SynapsePurchaseModal][handlePurchase] [WIX_DIRECT] [FAILED] Missing paymentId.");
          throw new Error("Failed to get payment ID from Wix");
        }

        const returnUrl = encodeURIComponent(
          `${window.location.origin}/billing?success=true&paymentId=${wixData.paymentId}`,
        );
        const target = `${WIX_DOMAIN}/idia-checkout?paymentId=${wixData.paymentId}&returnUrl=${returnUrl}&uid=${session.user.id}&amount=${usdAmount}&credits=${Math.floor(displayCredits)}`;
        console.log(
          `[SynapsePurchaseModal][handlePurchase] [WIX_DIRECT] [REDIRECT] Routing to vault portal: ${target}`,
        );
        window.location.href = target;
        return;
      }

      // ==========================================
      // RAIL 2: INTERNAL USDC CUSTODIAL FLOW
      // ==========================================
      console.log(
        `[SynapsePurchaseModal][handlePurchase] [USDC_FLOW] Checking liquidity. Required: $${usdAmount}, Available: $${availableUSDC}`,
      );

      if (availableUSDC < usdAmount) {
        console.error("[SynapsePurchaseModal][handlePurchase] [USDC_FLOW] [FAILED] Insufficient on-chain funds.");
        throw new Error(`Insufficient USDC balance ($${availableUSDC.toFixed(2)}). Please fund your wallet.`);
      }

      // Resolve the buyer's real on-chain wallet from profiles.
      console.log("[SynapsePurchaseModal][handlePurchase] [PROFILE_LOOKUP] Reading wallet_address.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profileError) throw new Error(`Profile lookup failed: ${profileError.message}`);
      const buyerWallet = profile?.wallet_address as string | undefined;
      if (!buyerWallet || !/^0x[a-fA-F0-9]{40}$/.test(buyerWallet)) {
        throw new Error("No IDIA Life wallet linked to this account. Connect MetaMask first.");
      }

      // One-time approval gate. Idempotent: returns immediately if already approved.
      console.log("[SynapsePurchaseModal][handlePurchase] [APPROVAL_CHECK] Ensuring relayer allowance.");
      const approval = await ensureUsdcApproval({ owner: buyerWallet });
      if (!approval.ok) {
        throw new Error(`Wallet authorization required: ${(approval as { reason: string }).reason}`);
      }

      const txReference = `INT-${crypto.randomUUID().slice(0, 8)}`;
      const internalPayload = {
        user_id: session.user.id,
        credit_amount: displayCredits,
        usd_amount: Number(usdAmount.toFixed(2)),
        payment_reference: txReference,
        payment_method: "internal_usdc",
        routing: "on-chain",
        target_synapse_wallet: IDIA_SYNAPSE_WALLET,
        user_wallet: buyerWallet,
        idempotency_key: txReference,
      };

      console.log(
        "[SynapsePurchaseModal][handlePurchase] [LEDGER_DISPATCH] Invoking edge function ledger sync...",
        internalPayload,
      );

      const { data: topUpData, error: topUpError } = await supabase.functions.invoke("top-up-credits", {
        body: internalPayload,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (topUpError) {
        console.error(
          "[SynapsePurchaseModal][handlePurchase] [LEDGER_DISPATCH] [FAILED] Edge function rejected transaction.",
          topUpError,
        );
        const msg = (topUpError as any)?.message ?? String(topUpError);
        if (/APPROVAL_REQUIRED/i.test(msg)) {
          throw new Error("MetaMask approval not yet confirmed on-chain. Please retry in a moment.");
        }
        throw new Error(msg);
      }

      console.log(
        "[SynapsePurchaseModal][handlePurchase] [LEDGER_DISPATCH] [SUCCESS] hash=",
        (topUpData as any)?.hash,
      );

      setStep("success");
      toast.success("Synapse Hydrated!", {
        description: `${formatCredits(displayCredits)} added to your operational ledger.`,
      });

      await Promise.all([refreshSynapseBalance(), refreshWalletBalance()]);
      setTimeout(() => handleOpenChange(false), 3500);
    } catch (err: any) {
      console.error("[SynapsePurchaseModal][handlePurchase] [END_WITH_ERROR] Transaction stalled:", err.message);
      toast.error(err.message || "Settlement failed.");
      setStep("payment");
    } finally {
      console.log("[SynapsePurchaseModal][handlePurchase] [FINALLY] Exit execution thread.");
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
              ? `Review hydration from ${paymentRail === "usdc" ? "On-Chain Wallet" : "Credit/Debit"}`
              : "Fuel your data operations with Synapse Credits"}
          </DialogDescription>
        </DialogHeader>

        {insufficientWarning && step === "select" && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="text-sm text-destructive font-medium">{insufficientWarning}</span>
          </div>
        )}

        <div className="space-y-6 pt-2">
          {step === "select" && (
            <>
              <div className="flex justify-center">
                <SynapseGasGauge />
              </div>

              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPurchaseMode("tier")}
                  className={`flex-1 text-sm font-medium py-2.5 px-4 transition-colors ${purchaseMode === "tier" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}
                >
                  Volume Tranches
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseMode("alacarte")}
                  className={`flex-1 text-sm font-medium py-2.5 px-4 transition-colors ${purchaseMode === "alacarte" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}
                >
                  A La Carte
                </button>
              </div>

              {purchaseMode === "tier" ? (
                <div className="grid grid-cols-1 gap-3">
                  {creditTiers.map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    const usdCost = tier.credits * tier.rate;
                    return (
                      <Card
                        key={tier.id}
                        className={`relative p-4 cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : ""}`}
                        onClick={() => setSelectedTier(tier.id)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary" : "border-muted-foreground/50"}`}
                            >
                              {isSelected && <div className="w-2 h-2 bg-primary rounded-full" />}
                            </div>
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
                            <p className="text-xs text-muted-foreground">${usdCost.toFixed(2)} USD</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <Label>Purchase Amount (USD)</Label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md font-mono text-sm">$</span>
                    <Input
                      className="rounded-none border-r-0 font-mono"
                      placeholder="100"
                      value={alacarteAmount}
                      onChange={(e) => handleAlacarteInput(e.target.value)}
                    />
                    <span className="px-3 py-2 bg-muted border border-l-0 rounded-r-md font-mono text-sm">.00</span>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">USDC Balance (On-Chain)</span>
                  <span className="text-primary font-bold">${availableUSDC.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credits to Add</span>
                  <span className="text-emerald-500 font-mono">+{formatCredits(displayCredits)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 p-2 rounded-lg">
                    <Tag className="w-4 h-4" /> Volume discount applied.
                  </div>
                )}
                <div className="pt-3 border-t flex justify-between items-end">
                  <span className="font-medium">Total Due</span>
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono">${usdAmount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground uppercase">USD / USDC</div>
                  </div>
                </div>
              </div>

              <Button className="w-full gap-2" size="lg" onClick={handleProceedToPayment} disabled={!canProceed}>
                Continue to Payment <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <div className="bg-muted/50 border border-border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground font-bold uppercase tracking-tighter">Settlement Rail</p>
                  <p className="font-bold text-foreground flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-primary" /> Verified dual-rail port
                  </p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> Secure Vault
                </Badge>
              </div>

              {hasEnoughBalance ? (
                <>
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                      <CircleDollarSign className="h-4 w-4" />
                      Funded from IDIA Life Wallet
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available Balance</span>
                      <span className="font-mono">${availableUSDC.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Transfer Amount</span>
                      <span className="font-mono text-destructive">-${usdAmount.toFixed(2)}</span>
                    </div>
                    <div className="pt-3 border-t border-emerald-500/20 flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining Balance</span>
                      <span className="font-mono font-semibold">
                        ${(availableUSDC - usdAmount).toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Credits to Add</span>
                      <span className="font-mono text-emerald-500">
                        +{formatCredits(displayCredits)} CR
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="gap-2" onClick={() => setStep("select")}>
                      <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      size="lg"
                      onClick={() => {
                        setPaymentRail("usdc");
                        handlePurchase();
                      }}
                    >
                      <CircleDollarSign className="h-4 w-4" /> Pay from Wallet
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-destructive font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Wallet Shortfall
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Required</span>
                      <span className="font-mono">${usdAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available in IDIA Life</span>
                      <span className="font-mono">${availableUSDC.toFixed(2)}</span>
                    </div>
                    <div className="pt-3 border-t border-destructive/20 flex justify-between text-base">
                      <span className="font-semibold">Amount to Fund</span>
                      <span className="font-mono font-bold text-destructive">
                        ${shortfall.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 flex gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      To find your recovery phrase, open IDIA Life, visit the Wallet page, tap
                      Security, and press Reveal Recovery Phrase. Ensure no one is around you when
                      you do this and do not do this on a device that is not your own.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="gap-2" onClick={() => setStep("select")}>
                      <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      size="lg"
                      onClick={handleConnectMetaMask}
                      disabled={isConnectingWallet}
                    >
                      {isConnectingWallet ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wallet className="h-4 w-4" />
                      )}
                      Connect MetaMask
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentRail("wix");
                      handlePurchase();
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="h-3 w-3" /> Pay with Card instead
                  </button>
                </>
              )}
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="font-semibold text-center uppercase tracking-widest text-xs">
                {paymentRail === "wix" ? "Redirecting to Wix Gateway..." : "Executing Internal Swap..."}
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="text-foreground font-bold text-lg">Synapse Hydrated!</p>
              <p className="text-muted-foreground text-sm">
                {formatCredits(displayCredits)} added to your operational ledger.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SynapsePurchaseModal;
