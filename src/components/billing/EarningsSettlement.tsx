import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark,
  ArrowUpRight,
  History,
  Banknote,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Wallet,
  Coins,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ActivityLedger from "./ActivityLedger";
import WithdrawCryptoModal from "./WithdrawCryptoModal";
import { useWalletBalance } from "@/hooks/useWalletBalance";

const RAIL_STORAGE_KEY = "idia.earnings.rail";
const basescanAddressUrl = (addr: string) => `https://basescan.org/address/${addr}`;

const EarningsSettlement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.user_id;
  const [isSettling, setIsSettling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [rail, setRail] = useState<"tradfi" | "defi">(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(RAIL_STORAGE_KEY) : null;
    return stored === "defi" ? "defi" : "tradfi";
  });

  useEffect(() => {
    window.localStorage.setItem(RAIL_STORAGE_KEY, rail);
  }, [rail]);

  const { balance, loading: walletLoading, refreshBalance } = useWalletBalance();

  const { data: walletAddress } = useQuery({
    queryKey: ["settlement-wallet-address", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from("profiles").select("wallet_address").eq("id", userId).maybeSingle();
      return (data as any)?.wallet_address ?? null;
    },
    enabled: !!userId,
  });

  const { data: earningsData, isLoading } = useQuery({
    queryKey: ["settlement-data", userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get completed data_sale transactions
      const { data: completedTxs } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("transaction_type", "data_sale")
        .eq("status", "completed");

      const available = (completedTxs || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);

      // Get pending transactions
      const { data: pendingTxs } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("transaction_type", "data_sale")
        .eq("status", "pending");

      const pending = (pendingTxs || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);

      // Get lifetime total
      const { data: allTxs } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("transaction_type", "data_sale");

      const lifetime = (allTxs || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);

      // Get default bank info
      const { data: bankMethod } = await supabase
        .from("user_payment_methods")
        .select("identifier")
        .eq("user_id", userId)
        .eq("method_type", "bank_ach")
        .eq("is_default", true)
        .maybeSingle();

      // Get last settlement
      const { data: lastSettlement } = await supabase
        .from("transactions")
        .select("created_at")
        .eq("user_id", userId)
        .eq("transaction_type", "settlement")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        available_balance: available,
        pending_balance: pending,
        lifetime_earnings: lifetime,
        bank_last4: bankMethod?.identifier || "----",
        last_settlement_at: lastSettlement?.created_at || null,
      };
    },
    enabled: !!userId,
  });

  const handleInitiateSettlement = async () => {
    if (!earningsData || earningsData.available_balance <= 0) return;
    setIsSettling(true);
    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: userId,
        transaction_type: "settlement",
        amount: earningsData.available_balance,
        status: "pending",
        description: `Bank settlement via ACH/RTP - $${earningsData.available_balance.toFixed(2)}`,
      } as any);
      if (error) throw error;
      setSuccessMessage("Settlement initiated. Funds will arrive via ACH/RTP within 24 hours.");
    } catch (err) {
      console.error("Settlement failed", err);
    } finally {
      setIsSettling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-500" />
            Earnings &amp; Settlement
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your ecosystem revenue across traditional and on-chain rails.
          </p>
        </div>
        {rail === "tradfi" ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase">TradFi Rails Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
            <Coins className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase">Base Mainnet Rails</span>
          </div>
        )}
      </div>

      <Tabs value={rail} onValueChange={(v) => setRail(v as "tradfi" | "defi")} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="tradfi" className="gap-2">
            <Landmark className="w-4 h-4" /> TradFi (Bank / FBO)
          </TabsTrigger>
          <TabsTrigger value="defi" className="gap-2">
            <Wallet className="w-4 h-4" /> DeFi (On-Chain)
          </TabsTrigger>
        </TabsList>

        {/* ============================ TRADFI ============================ */}
        <TabsContent value="tradfi" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-card border border-border rounded-2xl p-8 flex flex-col justify-between shadow-xl">
              <div>
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  Available for Settlement
                </span>
                <div className="text-5xl font-mono font-bold text-foreground mt-2">
                  ${earningsData?.available_balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "0.00"}
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <div className="text-xs text-muted-foreground">
                    <span className="block text-muted-foreground/70 uppercase font-bold text-[10px]">
                      Pending Clearing
                    </span>
                    <span className="font-mono text-foreground">
                      ${earningsData?.pending_balance.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="block text-muted-foreground/70 uppercase font-bold text-[10px]">
                      Lifetime Earnings
                    </span>
                    <span className="font-mono text-foreground">
                      ${earningsData?.lifetime_earnings.toFixed(2) ?? "0.00"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleInitiateSettlement}
                  disabled={isSettling || !earningsData || earningsData.available_balance <= 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                >
                  {isSettling ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <>
                      <Banknote className="w-5 h-5" /> Settle to Bank Account
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground/80 mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-muted-foreground" /> Destination
                </h3>
                <div className="p-4 bg-muted/30 border border-border rounded-xl mb-4">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                    Verified Bank Account
                  </div>
                  <div className="text-sm text-foreground font-mono">**** **** {earningsData?.bank_last4}</div>
                  <div className="text-[10px] text-emerald-500 mt-1 font-bold">RTP/ACH Enabled</div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Settlements are processed via <strong>Tradfi Rails</strong>. Funds are pushed directly to your
                  verified commercial account.
                </p>
              </div>
              <button
                onClick={() => navigate("/earnings/banking")}
                className="mt-4 text-[10px] text-primary hover:underline flex items-center gap-1"
              >
                Update Banking Details <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 p-4 rounded-xl flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-foreground">{successMessage}</span>
            </div>
          )}

          <div className="p-4 bg-muted/20 border border-border rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-tight">
              IDIA Indemnity Reserve LLC maintains a zero-commingling treasury. These funds are held in a{" "}
              <strong>For Benefit Of (FBO)</strong> custody account and are legally distinct from IDIA Data Inc.
            </p>
          </div>

          <ActivityLedger rail="tradfi" />
        </TabsContent>

        {/* ============================= DEFI ============================= */}
        <TabsContent value="defi" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-card border border-border rounded-2xl p-8 flex flex-col justify-between shadow-xl">
              <div>
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  On-Chain USDC Balance
                </span>
                <div className="text-5xl font-mono font-bold text-foreground mt-2 flex items-center gap-3">
                  {walletLoading && balance.usdc_balance === null ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : (
                    <>${(balance.usdc_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                  )}
                </div>
                <div className="flex items-center gap-6 mt-6">
                  <div className="text-xs text-muted-foreground">
                    <span className="block text-muted-foreground/70 uppercase font-bold text-[10px]">IDIA Token</span>
                    <span className="font-mono text-foreground">
                      {(balance.idia_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="block text-muted-foreground/70 uppercase font-bold text-[10px]">Gas (ETH)</span>
                    <span className="font-mono text-foreground">
                      {(balance.eth_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowWithdraw(true)}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <Wallet className="w-5 h-5" /> Withdraw to Crypto Wallet
                </button>
                <Button variant="outline" onClick={() => refreshBalance()} className="sm:w-auto">
                  <RefreshCw className={`w-4 h-4 mr-2 ${walletLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground/80 mb-4 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" /> Settlement Wallet
                </h3>
                <div className="p-4 bg-muted/30 border border-border rounded-xl mb-4">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Bound Address</div>
                  <div className="text-xs text-foreground font-mono break-all">
                    {walletAddress || "No wallet bound to this account"}
                  </div>
                  <div className="text-[10px] text-primary mt-1 font-bold">Base Mainnet</div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  On-chain settlements move <strong>USDC</strong> directly to your self-custodied wallet. Balances are
                  read live from Base mainnet contracts.
                </p>
              </div>
              {walletAddress ? (
                <a
                  href={basescanAddressUrl(walletAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                  View wallet on BaseScan <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <button
                  onClick={() => navigate("/settings")}
                  className="mt-4 text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                  Bind a wallet in Settings <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="p-4 bg-muted/20 border border-border rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-tight">
              On-chain egress is irreversible. Verify the destination address before confirming a withdrawal. Network
              fees are deducted from the transferred amount.
            </p>
          </div>

          <ActivityLedger rail="defi" />
        </TabsContent>
      </Tabs>

      <WithdrawCryptoModal open={showWithdraw} onOpenChange={setShowWithdraw} />
    </div>
  );
};

export default EarningsSettlement;
