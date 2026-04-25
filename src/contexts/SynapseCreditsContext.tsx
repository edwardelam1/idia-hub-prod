import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

// ========================================================================
// IDIA PROTOCOL INTERFACES: PRODUCTION CONTRACT ALIGNMENT
// ========================================================================
interface WalletSchema {
  hub_cash_balance: number;
  cash_balance: number;
  idia_beta_balance: number;
  wallet_address: string;
}

interface BalanceData {
  available_credits: number; // Mapped to Hub Silo ($5,000.00)
  fbo_balance: number; // Mapped to Life Silo ($0.00)
  stablecoin_balance: number; // IDIA-BETA Rail
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
  burnRate: BurnRateData | null; // Restored for Settings/Trading components
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
    // 1. IDENTITY RESOLUTION: The unknown bridge resolves TS2352
    const authUser = user as unknown as SupabaseUser;

    if (!authUser?.id) {
      console.warn("[STATUS: SynapseProvider.Sync] Session identity not resolved.");
      setIsLoading(false);
      return;
    }

    console.info(`[BEGIN: SynapseProvider.Sync] Resolving Vault for UID: ${authUser.id}`);
    setIsLoading(true);

    try {
      // 2. VAULT DISCOVERY: Forced cast bypasses TS2339 schema mismatch
      const { data, error: walletError } = await (supabase
        .from("wallets")
        .select("hub_cash_balance, cash_balance, idia_beta_balance, wallet_address")
        .eq("user_id", authUser.id)
        .maybeSingle() as any);

      if (walletError) throw walletError;
      const wallet = data as unknown as WalletSchema;

      // 3. GAS GAUGE: Consumption credits (RPC)
      const { data: gasBalance } = await supabase.rpc("get_synapse_balance", { uid: authUser.id });

      // 4. BURN RATE CALCULATION: Required for Settings/Trading components
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

      // 5. STATE FINALIZATION: Mapping Silos to Legacy Contract Names
      const hubFuel = wallet?.hub_cash_balance ?? 0;
      const royaltyYield = wallet?.cash_balance ?? 0;

      setBurnRate({
        daily_average: dailyAvg,
        thirty_day_total: totalDeductions,
        burn_status: dailyAvg > 0 && hubFuel < dailyAvg * 2 ? "critical" : "healthy",
      });

      setBalanceData({
        available_credits: hubFuel, // Anchored to $5,000.00
        fbo_balance: royaltyYield, // Anchored to $0.00
        stablecoin_balance: (wallet?.idia_beta_balance || 0) / 10 ** 18,
        wallet_address: wallet?.wallet_address || "",
        currency: "SYNAPSE_CREDITS",
        stablecoin_currency: "IDIA-BETA",
        last_updated: new Date().toISOString(),
      });

      console.info(`[END: SynapseProvider.Sync] Resolution Finalized. Hub Operating: $${hubFuel}`);
    } catch (err: any) {
      console.error(`[FATAL: SynapseProvider.Sync] ${err.message}`);
      setError(err.message);
      toast.error("Vault Synchronization Failure");
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
