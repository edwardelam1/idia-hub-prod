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
  KeyRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { toast } from "@/hooks/use-toast";
import { formatCredits } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ethers } from "ethers";

// USDC Contract Constants for Allowance Handshake (Base Mainnet)
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const TREASURY_ADDRESS = "0x649436db4d9352240d1132d9372293e5cc6af0e3";
const USDC_ABI = ["function approve(address spender, uint256 amount) public returns (bool)"];

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

const BASE_RATE = 0.75;

const SynapseTopUp = () => {
  const { refreshBalance: refreshSynapseBalance } = useSynapseCredits();
  const { refreshBalance: refreshWalletBalance } = useWalletBalance();

  const [selectedTier, setSelectedTier] = useState(5000);
  const [step, setStep] = useState<"select" | "processing" | "success" | "need_allowance">("select");
  const [error, setError] = useState<string | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<"tier" | "alacarte">("tier");
  const [alacarteAmount, setAlacarteAmount] = useState("");
  const [paymentRail, setPaymentRail] = useState<"worldpay" | "usdc">("usdc");

  const currentSelection = pricingTiers.find((t) => t.crd === selectedTier) || pricingTiers[1];
  const alacarteUsd = parseInt(alacarteAmount) || 0;
  const alacarteCredits = alacarteUsd / BASE_RATE;
  const alacarteValid = alacarteUsd >= 2 && alacarteUsd <= 1000;
  const displayCredits = purchaseMode === "alacarte" ? alacarteCredits : currentSelection.crd;
  const usdAmount = purchaseMode === "alacarte" ? alacarteUsd : currentSelection.crd * currentSelection.rate;
  const canProceed = purchaseMode === "alacarte" ? alacarteValid : true;

  const handleAlacarteInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 4) setAlacarteAmount(digits);
  };

  // 1. HANDSHAKE: Enable USDC Allowance
  const handleEnableUSDC = async () => {
    console.log("[SynapseTopUp][handleEnableUSDC] START: Requesting USDC Allowance execution.");
    setStep("processing");
    setError(null);
    try {
      console.log("[SynapseTopUp][handleEnableUSDC][PROVIDER] START: Checking window.ethereum instance.");
      if (!window.ethereum) {
        console.error("[SynapseTopUp][handleEnableUSDC][PROVIDER] FATAL: window.ethereum is undefined.");
        throw new Error("MetaMask not found.");
      }
      console.log("[SynapseTopUp][handleEnableUSDC][PROVIDER] END: Ethereum instance located.");

      console.log("[SynapseTopUp][handleEnableUSDC][SIGNER] START: Initializing provider and signer.");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      console.log("[SynapseTopUp][handleEnableUSDC][SIGNER] END: Signer initialized.");

      console.log("[SynapseTopUp][handleEnableUSDC][CONTRACT] START: Connecting to USDC contract and broadcasting tx.");
      const contract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
      const tx = await contract.approve(TREASURY_ADDRESS, ethers.MaxUint256);
      
      toast({ title: "Broadcasting Approval...", description: "Please wait for Base confirmation." });
      
      console.log(`[SynapseTopUp][handleEnableUSDC][CONTRACT] PENDING: Waiting for tx confirmation ${tx.hash}...`);
      await tx.wait();
      console.log("[SynapseTopUp][handleEnableUSDC][CONTRACT] END: Transaction confirmed on-chain.");

      console.log("[SynapseTopUp][handleEnableUSDC] SUCCESS: Complete allowance granted.");
      toast({ title: "USDC Enabled", description: "You can now settle on-chain." });
      setStep("select");
      handlePurchase();
    } catch (err: any) {
      console.error("[SynapseTopUp][handleEnableUSDC] FATAL: Allowance Failed. Details:", err.message);
      setError("Approval failed. Permission is required to move USDC.");
      setStep("need_allowance");
    } finally {
      console.log("[SynapseTopUp][handleEnableUSDC] END: USDC Allowance execution finished.");
    }
  };

  // 2. SETTLEMENT (HYDRATED & HARDENED)
  const handlePurchase = async () => {
    console.log("🚀 [SynapseTopUp][handlePurchase] START: Initiating verified settlement sequence.");
    setStep("processing");
    setError(null);

    try {
      // FIX: Hardened Auth Destructuring
      console.log("[SynapseTopUp][handlePurchase][AUTH] START: Fetching Supabase session.");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("[SynapseTopUp][handlePurchase][AUTH] FATAL: Supabase returned an auth error.", sessionError.message);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      if (!sessionData || !sessionData.session) {
        console.error("[SynapseTopUp][handlePurchase][AUTH] FATAL: Session data is null or completely missing.");
        throw new Error("Auth session missing. Please log in again.");
      }
      
      const session = sessionData.session;
      console.log(`[SynapseTopUp][handlePurchase][AUTH] END: Auth verified for user ${session.user.id}.`);

      console.log("[SynapseTopUp][handlePurchase][PROVIDER] START: Requesting active Ethereum accounts.");
      if (!window.ethereum) {
        console.error("[SynapseTopUp][handlePurchase][PROVIDER] FATAL: MetaMask is missing from window.");
        throw new Error("MetaMask is required for on-chain settlement.");
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const activeAddress = accounts[0];
      console.log(`[SynapseTopUp][handlePurchase][PROVIDER] END: Accounts retrieved.`);

      console.log("[SynapseTopUp][handlePurchase][VALIDATION] START: Checking address sovereignty.");
      if (!activeAddress || typeof activeAddress !== 'string' || !activeAddress.startsWith('0x')) {
        console.error(`[SynapseTopUp][handlePurchase][VALIDATION] FATAL: Invalid wallet address detected: ${activeAddress}`);
        throw new Error("WALLET_ERROR: Please unlock MetaMask and ensure you are on the Base network.");
      }
      console.log(`[SynapseTopUp][handlePurchase][VALIDATION] END: Using verified wallet ${activeAddress}`);

      const payload = {
        user_id: session.user.id,
        credit_amount: displayCredits,
        usd_amount: usdAmount,
        user_wallet: activeAddress, 
        payment_method: paymentRail,
        // Belt-and-braces for Edge Function contract
        recipient_address: activeAddress,
        routing: paymentRail === "usdc" ? "on-chain" : "fiat",
        amount: displayCredits,
      };

      console.log("[SynapseTopUp][handlePurchase][API_INVOKE] START: Dispatching settlement payload to Edge Function.", JSON.stringify(payload));
      const { data, error: functionError } = await supabase.functions.invoke("top-up-credits", {
        body: payload,
      });

      if (functionError) {
        console.error("[SynapseTopUp][handlePurchase][API_INVOKE] FATAL: Edge function rejected request.", functionError);
        throw functionError;
      }
      console.log("[SynapseTopUp][handlePurchase][API_INVOKE] END: Edge Function returned successful response.", data);
      
      if (data?.error?.includes("ALLOWANCE")) {
        console.warn("[SynapseTopUp][handlePurchase] HANDSHAKE REQUIRED: Allowance missing on-chain. Routing to approval flow.");
        setStep("need_allowance");
        return;
      }

      console.log("[SynapseTopUp][handlePurchase] SUCCESS: Settlement confirmed.");

      setStep("success");
      toast({ title: "Hydration Successful", description: `${formatCredits(displayCredits)} added.` });

      console.log("[SynapseTopUp][handlePurchase][REFRESH] START: Syncing UI state across contexts.");
      await Promise.all([refreshSynapseBalance(), refreshWalletBalance()]);
      console.log("[SynapseTopUp][handlePurchase][REFRESH] END: UI Contexts fully updated.");

      setTimeout(() => setStep("select"), 4000);
    } catch (err: any) {
      console.error("🚨 [SynapseTopUp][handlePurchase] FATAL EXCEPTION CAUGHT:", err.message);

      if (err.message?.includes("ALLOWANCE")) {
        setStep("need_allowance");
      } else {
        setError(err.message || "Settlement failed.");
        setStep("select");
      }
    } finally {
      console.log("[SynapseTopUp][handlePurchase] END: Logic execution fully complete.");
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
          Real-time settlement on <strong>Base Mainnet</strong>. Move custodial USDC to Synapse instantly to fuel AI data operations.
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
              <p className="font-semibold text-center">Settling on Base...</p>
              <p className="text-xs text-muted-foreground text-center">
                Do not refresh. Verifying on-chain truth.
              </p>
            </div>
          ) : step === "success" ? (
            <div className="flex flex-col items-center py-12 gap-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="font-bold text-xl">Hydrated!</p>
            </div>
          ) : step === "need_allowance" ? (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <KeyRound className="w-12 h-12 text-primary" />
              <p className="font-bold text-lg">Enable USDC</p>
              <p className="text-xs text-muted-foreground">
                The IDIA Treasury needs your permission to move USDC for this settlement.
              </p>
              {error && (
                <div className="w-full p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <Button onClick={handleEnableUSDC} className="w-full mt-2">
                Sign Approval
              </Button>
              <button
                onClick={() => {
                  setStep("select");
                  setError(null);
                }}
                className="text-xs text-muted-foreground underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-6">Transaction Summary</h2>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-muted-foreground">Credits to Add</span>
                <span className="text-emerald-400">+{formatCredits(displayCredits)}</span>
              </div>
              <div className="pt-6 border-t flex justify-between items-end mb-6">
                <span className="font-medium">Total Due</span>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono">${usdAmount.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">USDC (BASE)</div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex rounded-lg border border-border overflow-hidden mb-6">
                <button
                  onClick={() => setPaymentRail("usdc")}
                  className={`flex-1 flex items-center justify-center gap-2 text-xs py-3 ${paymentRail === "usdc" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                >
                  <CircleDollarSign className="h-4 w-4" /> USDC (Base)
                </button>
                <button
                  onClick={() => setPaymentRail("worldpay")}
                  className={`flex-1 flex items-center justify-center gap-2 text-xs py-3 ${paymentRail === "worldpay" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
                >
                  <CreditCard className="h-4 w-4" /> Fiat Port
                </button>
              </div>

              <Button onClick={handlePurchase} disabled={!canProceed} className="w-full py-6 font-bold">
                FORCE SETTLEMENT V2
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Truth Settlement Protocol</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SynapseTopUp;