import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BalanceData {
  wallet_address: string;
  available_credits: number;
  fbo_balance: number;
  currency: string;
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
    setIsLoading(true);
    setError(null);

    try {
      const userId = user?.user_id;
      if (!userId) {
        setIsLoading(false);
        return;
      }

      // 1. RPC SUM: Ensure the RPC itself filters for the correct types
      // If you can't edit the RPC, filter the data here.
      const { data: balance, error: ledgerError } = await supabase.rpc("get_synapse_balance", {
        uid: userId,
      });

      // 2. FBO RESERVOIR (This is where the money actually is)
      const { data: fboEntries } = await supabase
        .from("fiat_ledger")
        .select("amount_usd")
        .eq("user_id", userId)
        .eq("status", "COMPLETED"); // Only count successful payouts

      const fboBalance = (fboEntries || []).reduce((sum, e) => sum + Number(e.amount_usd ?? 0), 0);

      // 3. FBO RESERVOIR: USD value calculation
      const { data: fboEntries } = await supabase
        .from("fiat_ledger")
        .select("amount_usd")
        .eq("user_id", userId)
        .neq("status", "FAILED");

      const fboBalance = (fboEntries || []).reduce((sum, e) => sum + Number(e.amount_usd ?? 0), 0);
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
        wallet_address: walletAddress,
        available_credits: credits,
        fbo_balance: fboBalance,
        currency: "SYNAPSE_CREDITS",
        last_updated: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Ledger Sync Error:", err);
      setError("Failed to verify ledger balance.");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, user?.user_id]);

  useEffect(() => {
    fetchLedgerBalance();
  }, [fetchLedgerBalance]);

  // Realtime subscription for automatic UI updates
  useEffect(() => {
    if (!user?.user_id) return;

    const channel = supabase
      .channel(`ledger-${user.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "synapse_credit_ledger",
          filter: `user_id=eq.${user.user_id}`,
        },
        () => {
          fetchLedgerBalance();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.user_id, fetchLedgerBalance]);

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
