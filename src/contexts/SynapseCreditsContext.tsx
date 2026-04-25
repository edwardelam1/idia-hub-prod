import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

// ========================================================================
// IDIA PROTOCOL: TRIPLE-SILO INTERFACE
// ========================================================================
interface WalletSchema {
  hub_cash_balance: number;
  cash_balance: number;
  idia_beta_balance: number;
  wallet_address: string;
}

interface BalanceData {
  // Triple-Silo Architecture
  hub_operating_cash: number; // Physical Operating Capital ($10,000.00)
  synapse_gas_credits: number; // AI Computational Fuel (25,000)
  fbo_balance: number; // Life Royalty Floor ($0.00)

  // Legacy Aliases for Component Compatibility
  available_credits: number;
  stablecoin_balance: number;
  wallet_address: string;
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
  burnRate: BurnRateData | null; // RESTORED: Fixes TS2339 in Settings & Trading
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

const SynapseCreditsContext = createContext<SynapseCreditsContextType | undefined>(undefined);

export const SynapseCreditsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSovereignState = useCallback(async () => {
    const authUser = user as unknown as SupabaseUser;
    if (!authUser?.id) {
      setIsLoading(false);
      return;
    }

    console.info(`[BEGIN: Synapse.Sync] Resolving Vault Finality for UID: ${authUser.id}`);
    setIsLoading(true);

    try {
      // 1. VAULT DISCOVERY (Hub & Life Silos)
      const { data: walletData, error: walletError } = await (supabase
        .from("wallets")
        .select("hub_cash_balance, cash_balance, idia_beta_balance, wallet_address")
        .eq("user_id", authUser.id)
        .maybeSingle() as any);

      if (walletError) throw walletError;

      // REVELATION LOG: If this is null in your Mac console, RLS is blocking you.
      console.log("[TRACE: Synapse.Sync] Raw Vault Payload:", walletData);

      // 2. GAS DISCOVERY (Computational Silo)
      const { data: gasBalance, error: gasError } = await supabase.rpc("get_synapse_balance", { uid: authUser.id });
      if (gasError) console.warn(`[WARNING: Synapse.Gas] RPC Stall: ${gasError.message}`);

      // 3. BURN RATE CALCULATION (Required for Billing/Trading Modules)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: usageEntries } = await supabase
        .from("synapse_credit_ledger")
        .select("amount")
        .eq("user_id", authUser.id)
        .in("entry_type", ["deduction", "USAGE"])
        .neq("status", "FAILED")
        .gte("created_at", thirtyDaysAgo);

      const totalDeductions = (usageEntries || []).reduce((sum, d) => sum + Math.abs(Number(d.amount)), 0);
      const dailyAvg = totalDeductions / 30;

      // 4. PROTOCOL RECONCILIATION
      const wallet = walletData as WalletSchema;
      const hubCash = Number(wallet?.hub_cash_balance ?? 0);
      const gasCredits = Number(gasBalance ?? 0);

      setBurnRate({
        daily_average: dailyAvg,
        thirty_day_total: totalDeductions,
        burn_status: dailyAvg > 0 && gasCredits < dailyAvg * 2 ? "critical" : "healthy",
      });

      setBalanceData({
        hub_operating_cash: hubCash,
        synapse_gas_credits: gasCredits,
        fbo_balance: Number(wallet?.cash_balance ?? 0),
        // Legacy Aliases: Point available_credits to the gas tank
        available_credits: gasCredits,
        stablecoin_balance: (wallet?.idia_beta_balance || 0) / 10 ** 18,
        wallet_address: wallet?.wallet_address || "",
        currency: "USD",
        stablecoin_currency: "IDIA-BETA",
        last_updated: new Date().toISOString(),
      });

      console.info(`[END: Synapse.Sync] State Hydrated. Hub: $${hubCash} | Gas: ${gasCredits}`);
    } catch (err: any) {
      console.error(`[FATAL: Synapse.Sync] State Resolution Failure: ${err.message}`);
      setError(err.message);
      toast.error("Sovereign Sync Failed");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSovereignState();
  }, [fetchSovereignState]);

  return (
    <SynapseCreditsContext.Provider
      value={{ balanceData, burnRate, isLoading, error, refreshBalance: fetchSovereignState }}
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
