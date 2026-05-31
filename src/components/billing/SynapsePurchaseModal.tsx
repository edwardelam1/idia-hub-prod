import { useEffect, useState } from "react";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useWalletConnection } from "@/hooks/useWalletConnection";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Coins,
  ShieldCheck,
  Tag,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  CircleDollarSign,
  Wallet,
  ArrowUpFromLine,
  QrCode,
} from "lucide-react";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCredits, formatIdiaUsd } from "@/lib/utils";
import SynapseGasGauge from "./SynapseGasGauge";

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
  console.log("[SynapsePurchaseModal][Component] [START] Rendering unified Connect Wallet modal.");

  const { balanceData, refreshBalance: refreshSynapseBalance } = useSynapseCredits();
  const { balance: walletBalance, refreshBalance: refreshWalletBalance } = useWalletBalance();
  const availableUSDC = walletBalance?.usdc_balance ?? 0;
  const availableETH = walletBalance?.eth_balance ?? 0;

  const { connect, connecting, connection, error: connectError } = useWalletConnection();

  const [selectedTier, setSelectedTier] = useState<string>("tier2");
  const [step, setStep] = useState<"connect" | "select" | "processing" | "success">("connect");
  const [mode, setMode] = useState<"fund" | "withdraw">("fund");
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [purchaseMode, setPurchaseMode] = useState<"tier" | "alacarte">("tier");
  const [alacarteAmount, setAlacarteAmount] = useState("");

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDest, setWithdrawDest] = useState("");
  const [withdrawError, setWithdrawError] = useState("");

  const currentTier = creditTiers.find((t) => t.id === selectedTier) || creditTiers[1];
  const alacarteUsd = parseInt(alacarteAmount) || 0;
  const alacarteCredits = alacarteUsd / BASE_RATE;
  const alacarteValid = alacarteUsd >= 2 && alacarteUsd <= 10000;

  const displayCredits = purchaseMode === "alacarte" ? alacarteCredits : currentTier.credits;
  const usdAmount = purchaseMode === "alacarte" ? alacarteUsd : currentTier.credits * currentTier.rate;
  const baseRateCost = displayCredits * BASE_RATE;
  const savings = purchaseMode === "alacarte" ? 0 : baseRateCost - usdAmount;
  const canProceed = purchaseMode === "alacarte" ? alacarteValid : true;

  // Withdraw derivations
  const currentCredits = balanceData?.available_credits ?? 0;
  const parsedWithdraw = parseFloat(withdrawAmount) || 0;
  const withdrawNetworkFee = 0.5;
  const withdrawNet = Math.max(parsedWithdraw - withdrawNetworkFee, 0);
  const validWithdrawAmount = parsedWithdraw >= 1 && parsedWithdraw <= currentCredits;
  const validWithdrawDest = /^0x[a-fA-F0-9]{40}$/.test(withdrawDest);
  const canWithdraw = validWithdrawAmount && validWithdrawDest;

  const handleOpenChange = (isOpen: boolean) => {
    console.log(`[SynapsePurchaseModal][handleOpenChange] [STATE_UPDATE] Modal open state: ${isOpen}`);
    setOpen(isOpen);
    onOpenChange?.(isOpen);
    if (!isOpen) {
      setStep("connect");
      setMode("fund");
      setPurchaseMode("tier");
      setAlacarteAmount("");
      setWithdrawAmount("");
      setWithdrawDest("");
      setWithdrawError("");
    }
  };

  // Auto-attempt internal vault bridge silently when modal opens.
  useEffect(() => {
    if (!open) return;
    if (connection) return;
    if (connecting) return;
    void connect().then((c) => {
      if (c) setStep("select");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConnectClick = async () => {
    const c = await connect();
    if (c) setStep("select");
  };

  const handleAlacarteInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 5) {
      setAlacarteAmount(digits);
    }
  };

  const handlePurchase = async () => {
    console.log(`[SynapsePurchaseModal][handlePurchase] [START] Settlement via connected wallet (${connection?.source}).`);
    if (!canProceed) return;
    if (!connection?.address) {
      toast.error("Connect a wallet first.");
      return;
    }

    setStep("processing");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Authentication failed. Please re-login.");
      }

      // Unified sovereign rail: USDC settlement via the connected wallet (vault or MetaMask).
      console.log(
        `[SynapsePurchaseModal][handlePurchase] [UNIFIED] Required: $${usdAmount}. Available USDC: $${availableUSDC}. Source: ${connection.source}.`,
      );

      // Only enforce balance check for vault-provisioned users (we know their on-chain truth).
      if (connection.source === "vault" && availableUSDC < usdAmount) {
        throw new Error(`Insufficient USDC ($${availableUSDC.toFixed(2)}). Please fund your wallet.`);
      }

      const txReference = `INT-${crypto.randomUUID().slice(0, 8)}`;
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const internalPayload = {
        user_id: session.user.id,
        credit_amount: displayCredits,
        usd_amount: usdAmount,
        payment_reference: txReference,
        payment_method: "internal_usdc",
        target_synapse_wallet: IDIA_SYNAPSE_WALLET,
        user_wallet: connection.address,
      };

      const { error: topUpError } = await supabase.functions.invoke("top-up-credits", {
        body: internalPayload,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (topUpError) throw topUpError;

      setStep("success");
      toast.success("Synapse Hydrated!", {
        description: `${formatCredits(displayCredits)} added to your operational ledger.`,
      });

      await Promise.all([refreshSynapseBalance(), refreshWalletBalance()]);
      setTimeout(() => handleOpenChange(false), 3500);
    } catch (err: any) {
      console.error("[SynapsePurchaseModal][handlePurchase] [END_WITH_ERROR] Transaction stalled:", err.message);
      toast.error(err.message || "Settlement failed.");
      setStep("select");
    }
  };

  const handleWithdraw = async () => {
    if (!canWithdraw) return;
    if (!connection?.address) {
      toast.error("Connect a wallet first.");
      return;
    }
    setWithdrawError("");
    setStep("processing");
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("withdraw-to-crypto", {
        body: {
          user_id: userId,
          amount: parsedWithdraw,
          destination_address: withdrawDest,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep("success");
      toast.success("Withdrawal initiated", {
        description: `${formatIdiaUsd(parsedWithdraw)} USDC sent to ${withdrawDest.slice(0, 6)}…${withdrawDest.slice(-4)}`,
      });
      await Promise.all([refreshSynapseBalance(), refreshWalletBalance()]);
      setTimeout(() => handleOpenChange(false), 2800);
    } catch (err: any) {
      setWithdrawError(err.message || "Withdrawal failed");
      setStep("select");
    }
  };

  const shortAddr = connection?.address
    ? `${connection.address.slice(0, 6)}…${connection.address.slice(-4)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Connect Wallet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-5 w-5 text-primary" />
            {step === "processing"
                ? "Settling..."
                : step === "success"
                  ? "Complete"
                  : step === "connect"
                    ? "Connect Sovereign Wallet"
                    : "Wallet Operations"}
          </DialogTitle>
          <DialogDescription>
            {step === "connect"
              ? "Bridge your IDIA Life–provisioned wallet, or link an institutional MetaMask wallet to fund or withdraw Synapse Credits."
              : connection
                ? `Latched: ${shortAddr} · ${connection.source === "vault" ? "IDIA Life Vault" : "MetaMask"}`
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
          {step === "connect" && (
            <div className="space-y-5 py-2">
              <Card className="p-5 bg-primary/5 border-primary/20 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-foreground font-medium">
                  We auto-detect your IDIA Life–provisioned wallet. Institutional buyers can fall back to MetaMask QR or
                  the browser extension.
                </p>
                <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Vault Bridge</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><QrCode className="h-3 w-3" /> MetaMask SDK</span>
                </div>
              </Card>

              {connectError && (
                <Alert className="border-destructive/40 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{connectError}</AlertDescription>
                </Alert>
              )}

              <Button className="w-full gap-2" size="lg" onClick={handleConnectClick} disabled={connecting}>
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Resolving Handshake…
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" /> Connect Sovereign Wallet <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {step === "select" && connection && (
            <>
              <div className="flex justify-center">
                <SynapseGasGauge />
              </div>

              <Card className="p-3 flex items-center justify-between bg-muted/40 border-border">
                <div className="flex items-center gap-2 text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <div>
                    <div className="font-bold text-foreground">{shortAddr}</div>
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                      {connection.source === "vault" ? "IDIA Life Vault" : "MetaMask Bridge"} · Base Network
                    </div>
                  </div>
                </div>
                <div className="text-right text-[10px] text-muted-foreground space-y-0.5">
                  <div>USDC: <span className="font-mono text-foreground">${availableUSDC.toFixed(2)}</span></div>
                  <div>ETH: <span className="font-mono text-cyan-400">{availableETH.toFixed(4)}</span></div>
                </div>
              </Card>

              <Tabs value={mode} onValueChange={(v) => setMode(v as "fund" | "withdraw")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="fund" className="gap-2">
                    <Coins className="h-3.5 w-3.5" /> Fund Account
                  </TabsTrigger>
                  <TabsTrigger value="withdraw" className="gap-2">
                    <ArrowUpFromLine className="h-3.5 w-3.5" /> Withdraw
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="fund" className="space-y-4 pt-4">
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
                    <div className="space-y-2">
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
                        <div className="text-xs text-muted-foreground uppercase">USDC</div>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full gap-2" size="lg" onClick={handlePurchase} disabled={!canProceed}>
                    <CircleDollarSign className="h-4 w-4" /> Confirm & Spend USDC
                  </Button>
                </TabsContent>

                <TabsContent value="withdraw" className="space-y-4 pt-4">
                  <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm">
                    <span className="text-muted-foreground">Available: </span>
                    <span className="font-bold text-foreground font-mono">{formatIdiaUsd(currentCredits)}</span>
                    <span className="text-muted-foreground"> CRD</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Withdrawal Amount</Label>
                    <div className="flex items-center">
                      <span className="px-3 py-2 bg-muted border border-r-0 rounded-l-md font-mono text-sm">$</span>
                      <Input
                        className="rounded-none rounded-r-md font-mono"
                        placeholder="100.0000"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      />
                    </div>
                    {withdrawAmount && !validWithdrawAmount && (
                      <p className="text-xs text-destructive">
                        {parsedWithdraw < 1 ? "Minimum withdrawal is $1.0000" : "Insufficient balance"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Destination Wallet Address</Label>
                    <div className="flex gap-2">
                      <Input
                        className="font-mono text-sm"
                        placeholder="0x71C7656EC7ab88b098defB751B7401B5f6d89A34"
                        value={withdrawDest}
                        onChange={(e) => setWithdrawDest(e.target.value.trim())}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => connection?.address && setWithdrawDest(connection.address)}
                      >
                        Use connected
                      </Button>
                    </div>
                    {withdrawDest && !validWithdrawDest && (
                      <p className="text-xs text-destructive">Must be a valid 0x Ethereum address (42 characters)</p>
                    )}
                  </div>

                  {validWithdrawAmount && validWithdrawDest && (
                    <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-mono text-foreground">{formatIdiaUsd(parsedWithdraw)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Network Fee (est.)</span>
                        <span className="font-mono text-muted-foreground">-{formatIdiaUsd(withdrawNetworkFee)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="font-medium text-foreground">You Receive</span>
                        <span className="font-mono font-bold text-foreground">{formatIdiaUsd(withdrawNet)} USDC</span>
                      </div>
                    </div>
                  )}

                  {withdrawError && (
                    <Alert className="border-destructive/40 bg-destructive/10">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{withdrawError}</AlertDescription>
                    </Alert>
                  )}

                  <Button className="w-full gap-2" size="lg" onClick={handleWithdraw} disabled={!canWithdraw}>
                    <ArrowUpFromLine className="w-4 h-4" /> Withdraw via Circle
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="font-semibold text-center uppercase tracking-widest text-xs">
                {mode === "withdraw" ? "Initiating Circle USDC Egress..." : "Executing Sovereign Settlement..."}
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              <p className="text-foreground font-bold text-lg">
                {mode === "withdraw" ? "Withdrawal Initiated!" : "Synapse Hydrated!"}
              </p>
              <p className="text-muted-foreground text-sm">
                {mode === "withdraw"
                  ? `${formatIdiaUsd(parsedWithdraw)} USDC sent to ${withdrawDest.slice(0, 6)}…${withdrawDest.slice(-4)}.`
                  : `${formatCredits(displayCredits)} added to your operational ledger.`}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SynapsePurchaseModal;
