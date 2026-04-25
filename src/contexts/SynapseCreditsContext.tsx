import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ========================================================================
// IDIA PROTOCOL INTERFACES: PRODUCTION SPECIFICATION
// ========================================================================
interface BalanceData {
  wallet_address: string;
  available_credits: number;
  fbo_balance: number;
  stablecoin_balance: number;
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
    // 1. IDENTITY GUARD: Atomic check for session integrity
    if (!user || !("id" in user)) {
      console.warn("[STATUS: SynapseProvider.Sync] Session not ready or ID missing. Waiting.");
      setIsLoading(false);
      return;
    }

    const userId = (user as any).id; // Safe within the 'id' in user check

    console.info(`[BEGIN: SynapseProvider.Sync] Resolving State for UID: ${userId}`);
    setIsLoading(true);
    setError(null);

    try {
      // 2. PHYSICAL VAULT DISCOVERY: No RPC dependencies
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError) {
        console.error(`[CRITICAL: SynapseProvider.Sync] Vault Query Failed: ${walletError.message}`);
        throw walletError;
      }

      // 3. GAS GAUGE: Direct Hub Silo Mapping
      // If column names are missing in types.ts, we access via bracket notation to prevent crashes
      const rawWallet = wallet as Record<string, any>;
      const credits = Number(rawWallet?.hub_cash_balance ?? 0);
      const liquidCash = Number(rawWallet?.cash_balance ?? 0);
      const stablecoinRaw = Number(rawWallet?.idia_beta_balance ?? 0);

      console.info(`[STATUS: SynapseProvider.Sync] Vault Found. Hub: $${credits} | Life: $${liquidCash}`);

      // 4. USAGE AUDIT
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
        wallet_address: rawWallet?.wallet_address || walletAddress,
        available_credits: credits,
        fbo_balance: liquidCash,
        stablecoin_balance: stablecoinRaw / 10 ** 18,
        currency: "SYNAPSE_CREDITS",
        stablecoin_currency: "IDIA-BETA",
        last_updated: new Date().toISOString(),
      });

      console.info(`[END: SynapseProvider.Sync] Resolution complete for UID: ${userId}`);
    } catch (err: any) {
      console.error(`[FATAL: SynapseProvider.Sync] Global stall: ${err.message}`);
      setError(err.message);
      toast.error("Ledger Sync Failure");
    } finally {
      setIsLoading(false);
    }
  }, [user, walletAddress]);

  useEffect(() => {
    fetchLedgerBalance();
  }, [fetchLedgerBalance]);

  // 5. REALTIME PULSE
  useEffect(() => {
    if (!user || !("id" in user)) return;
    const userId = (user as any).id;

    console.info(`[BEGIN: SynapseProvider.Realtime] Monitoring UID: ${userId}`);

    const channel = supabase
      .channel(`sovereign-vault-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${userId}` },
        () => {
          console.info("[PULSE: SynapseProvider.Realtime] Vault update detected.");
          fetchLedgerBalance();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchLedgerBalance]);

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
