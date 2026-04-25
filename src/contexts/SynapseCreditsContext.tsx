import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ========================================================================
// IDIA PROTOCOL INTERFACES: DUAL-RAIL SPECIFICATION
// ========================================================================
interface BalanceData {
  wallet_address: string;
  available_credits: number; // Consumption Utility (Hub Silo)
  fbo_balance: number; // Liquid USD Reservoir (Life Silo Bridge)
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

  // Type-Force: Create a local reference that TypeScript won't choke on for Auth
  const authUser = user as any;

  const fetchLedgerBalance = useCallback(async () => {
    console.info("[BEGIN: SynapseProvider.Sync] Starting Sovereign State Resolution.");
    setIsLoading(true);
    setError(null);

    try {
      const userId = authUser?.id;
      if (!userId) {
        console.warn("[STATUS: SynapseProvider.Sync] No authenticated user detected. Aborting.");
        setIsLoading(false);
        return;
      }

      // ----------------------------------------------------------------------
      // 1. PHYSICAL VAULT DISCOVERY: Bypassing Stale Type Definitions
      // ----------------------------------------------------------------------
      console.info("[STATUS: SynapseProvider.LKSDiscovery] Querying physical wallets vault.");

      // We cast the select to 'any' to bypass the SelectQueryError regarding missing columns
      const { data, error: walletError } = await (supabase
        .from("wallets")
        .select("hub_cash_balance, cash_balance, idia_beta_balance")
        .eq("user_id", userId)
        .maybeSingle() as any);

      if (walletError) {
        console.error("[CRITICAL: SynapseProvider.VaultSync] Wallet query failed.", walletError);
        throw walletError;
      }

      const wallet = data; // Data is now treated as 'any', allowing property access

      // ----------------------------------------------------------------------
      // 2. GAS GAUGE: Consumption credits (Mapped to Hub Silo)
      // ----------------------------------------------------------------------
      const { data: balance, error: ledgerError } = await supabase.rpc("get_synapse_balance", { uid: userId });
      if (ledgerError) console.warn("[WARNING: SynapseProvider.GasGauge] RPC Fetch failed.", ledgerError);

      const credits = Number(balance ?? wallet?.hub_cash_balance ?? 0);

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

      // The FBO Reservoir (Life Silo)
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
        `[END: SynapseProvider.Sync] State Finalized. Hub: $${credits.toFixed(2)} | Life: $${liquidCashSilo.toFixed(2)}`,
      );
    } catch (err: any) {
      console.error("[FATAL: SynapseProvider.GlobalStall]", err.message);
      setError("Failed to verify sovereign ledger balance.");
      toast.error("Sovereign Ledger Sync Failure");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, authUser?.id]);

  useEffect(() => {
    fetchLedgerBalance();
  }, [fetchLedgerBalance]);

  // ========================================================================
  // REALTIME SUBSCRIPTION: VAULT WATCHER
  // ========================================================================
  useEffect(() => {
    const userId = authUser?.id;
    if (!userId) return;

    console.info("[STATUS: SynapseProvider.Realtime] Monitoring Wallet & Ledger for State Changes.");

    const channel = supabase
      .channel(`sovereign-vault-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "synapse_credit_ledger",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.info("[EVENT: Realtime] Credit Ledger Update Detected.");
          fetchLedgerBalance();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${userId}`,
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
  }, [authUser?.id, fetchLedgerBalance]);

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
