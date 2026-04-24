import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ========================================================================
// IDIA PROTOCOL INTERFACES: DUAL-RAIL SPECIFICATION
// ========================================================================
interface BalanceData {
  wallet_address: string;
  available_credits: number; // Consumption Utility
  fbo_balance: number; // Liquid USD Reservoir
  stablecoin_balance: number; // Crypto Rail (IDIA-BETA)
  currency: string;
  stablecoin_currency: string;
  last_updated: string;
}

interface BurnRateData {
  daily_average: number;
  thirty_day_total: number;
  burn_status: "healthy" | "warning" | "critical";
}

interface SynapseCreditsContextType {
  balanceData: BalanceData | null;
  burnRate: BurnRateData | null;
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

const SynapseCreditsContext = createContext<SynapseCreditsContextType | undefined>(undefined);

export const SynapseCreditsProvider = ({
  children,
  walletAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d89A34",
}: {
  children: React.ReactNode;
  walletAddress?: string;
}) => {
  const { user } = useAuth();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedgerBalance = useCallback(async () => {
    console.info("[BEGIN: SynapseProvider.Sync] Starting Sovereign State Resolution.");
    setIsLoading(true);
    setError(null);

    try {
      const userId = user?.id; // Standardizing on .id for Supabase auth alignment
      if (!userId) {
        console.warn("[STATUS: SynapseProvider.Sync] No authenticated user detected. Aborting.");
        setIsLoading(false);
        return;
      }

      // ----------------------------------------------------------------------
      // 1. PHYSICAL VAULT DISCOVERY: Fetching the LKS from the Wallets Table
      // ----------------------------------------------------------------------
      console.info("[STATUS: SynapseProvider.LKSDiscovery] Querying wallets vault.");
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("cash_balance, idia_beta_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError) {
        console.error("[CRITICAL: SynapseProvider.VaultSync] Wallet query failed.", walletError);
        throw walletError;
      }

      // ----------------------------------------------------------------------
      // 2. GAS GAUGE: Consumption credits from the stored RPC
      // ----------------------------------------------------------------------
      const { data: balance, error: ledgerError } = await supabase.rpc("get_synapse_balance", { uid: userId });
      if (ledgerError) console.warn("[WARNING: SynapseProvider.GasGauge] RPC Fetch failed.", ledgerError);

      const credits = Number(balance ?? wallet?.cash_balance ?? 0);

      // ----------------------------------------------------------------------
      // 3. BURN RATE: Logic for 'deduction' and 'USAGE'
      // ----------------------------------------------------------------------
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: usageEntries } = await supabase
        .from("synapse_credit_ledger")
        .select("amount")
        .eq("user_id", userId)
        .in("entry_type", ["deduction", "USAGE"])
        .neq("status", "FAILED")
        .gte("created_at", thirtyDaysAgo);

      const totalDeductions = (usageEntries || []).reduce((sum, d) => sum + Math.abs(Number(d.amount)), 0);
      const dailyAvg = totalDeductions / 30;

      // ----------------------------------------------------------------------
      // 4. FBO RESERVOIR & CRYPTO RAIL: Discovery & Reconciliation
      // ----------------------------------------------------------------------
      console.info("[STATUS: SynapseProvider.Reconciliation] Summing fiat_ledger for FBO Audit.");
      const { data: fboEntries } = await supabase
        .from("fiat_ledger")
        .select("amount_usd")
        .eq("user_id", userId)
        .neq("status", "FAILED");

      // The FBO Reservoir should match the physical cash_balance we found in Stage 1
      const auditedFboBalance = (fboEntries || []).reduce((sum, e) => sum + Number(e.amount_usd ?? 0), 0);
      const liquidCashSilo = Number(wallet?.cash_balance ?? auditedFboBalance);

      // Stablecoin Rail Conversion (18-decimal BigInt handled as Number for UI)
      const stablecoinSilo = Number(wallet?.idia_beta_balance || 0) / 10 ** 18;

      let burnStatus: "healthy" | "warning" | "critical" = "healthy";
      if (dailyAvg > 0) {
        if (credits < dailyAvg * 2) burnStatus = "critical";
        else if (credits < dailyAvg * 7) burnStatus = "warning";
      }

      setBurnRate({
        daily_average: dailyAvg,
        thirty_day_total: totalDeductions,
        burn_status: burnStatus,
      });

      setBalanceData({
        wallet_address: walletAddress,
        available_credits: credits,
        fbo_balance: liquidCashSilo,
        stablecoin_balance: stablecoinSilo,
        currency: "SYNAPSE_CREDITS",
        stablecoin_currency: "IDIA-BETA (USDC/T)",
        last_updated: new Date().toISOString(),
      });

      console.info(
        `[END: SynapseProvider.Sync] State Finalized. Liquid: $${liquidCashSilo.toFixed(2)} | Stable: ${stablecoinSilo.toFixed(4)}`,
      );
    } catch (err: any) {
      console.error("[FATAL: SynapseProvider.GlobalStall]", err.message);
      setError("Failed to verify sovereign ledger balance.");
      toast.error("Sovereign Ledger Sync Failure");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, user?.id]);

  useEffect(() => {
    fetchLedgerBalance();
  }, [fetchLedgerBalance]);

  // ========================================================================
  // REALTIME SUBSCRIPTION: VAULT WATCHER
  // ========================================================================
  useEffect(() => {
    if (!user?.id) return;

    console.info("[STATUS: SynapseProvider.Realtime] Monitoring Wallet & Ledger for State Changes.");

    const channel = supabase
      .channel(`sovereign-vault-${user.id}`)
      // Watch for new ledger entries (History)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "synapse_credit_ledger",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.info("[EVENT: Realtime] Credit Ledger Update Detected.");
          fetchLedgerBalance();
        },
      )
      // Watch for physical balance changes (Wealth)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.info("[EVENT: Realtime] Wallet Vault Transition Detected.");
          fetchLedgerBalance();
        },
      )
      .subscribe();

    return () => {
      console.info("[STATUS: SynapseProvider.Realtime] Cleaning up sovereign listeners.");
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchLedgerBalance]);

  return (
    <SynapseCreditsContext.Provider
      value={{ balanceData, burnRate, isLoading, error, refreshBalance: fetchLedgerBalance }}
    >
      {children}
    </SynapseCreditsContext.Provider>
  );
};

export const useSynapseCredits = () => {
  const context = useContext(SynapseCreditsContext);
  if (!context) throw new Error("useSynapseCredits must be used within a SynapseCreditsProvider");
  return context;
};
