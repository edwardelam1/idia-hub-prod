import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

// ========================================================================
// IDIA PROTOCOL: TRIPLE-SILO PRODUCTION INTERFACE
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

  // Legacy Aliases for backward compatibility with existing components
  available_credits: number;
  stablecoin_balance: number;
  wallet_address: string;
  currency: string;
  stablecoin_currency: string;
  last_updated: string;
}

interface SynapseCreditsContextType {
  balanceData: BalanceData | null;
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

const SynapseCreditsContext = createContext<SynapseCreditsContextType | undefined>(undefined);

export const SynapseCreditsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSovereignState = useCallback(async () => {
    // 1. IDENTITY RESOLUTION
    const authUser = user as unknown as SupabaseUser;
    if (!authUser?.id) {
      console.warn("[STATUS: Synapse.Sync] Auth Session Not Resolved. Standing by.");
      setIsLoading(false);
      return;
    }

    console.info(`[BEGIN: Synapse.Sync] Resolving Vault Finality for UID: ${authUser.id}`);
    setIsLoading(true);

    try {
      // 2. VAULT DISCOVERY (Hub & Life Silos)
      const { data: walletData, error: walletError } = await (supabase
        .from("wallets")
        .select("hub_cash_balance, cash_balance, idia_beta_balance, wallet_address")
        .eq("user_id", authUser.id)
        .maybeSingle() as any);

      if (walletError) throw walletError;

      // DEEP TRACE: If this logs 'null', it is an RLS Blockade.
      console.log("[TRACE: Synapse.Sync] Raw Vault Payload:", walletData);

      // 3. GAS DISCOVERY (Computational Silo)
      const { data: gasBalance, error: gasError } = await supabase.rpc("get_synapse_balance", { uid: authUser.id });
      if (gasError) console.warn(`[WARNING: Synapse.Gas] RPC Stall: ${gasError.message}`);

      // 4. PROTOCOL RECONCILIATION
      const wallet = walletData as WalletSchema;
      const hubCash = Number(wallet?.hub_cash_balance ?? 0);
      const lifeCash = Number(wallet?.cash_balance ?? 0);
      const gasCredits = Number(gasBalance ?? 0);

      setBalanceData({
        hub_operating_cash: hubCash,
        synapse_gas_credits: gasCredits,
        fbo_balance: lifeCash,
        // Legacy Aliases
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

  // INITIAL HYDRATION
  useEffect(() => {
    fetchSovereignState();
  }, [fetchSovereignState]);

  // 5. REALTIME PULSE: Listen for Vault Changes
  useEffect(() => {
    const authUser = user as unknown as SupabaseUser;
    if (!authUser?.id) return;

    console.info(`[BEGIN: Synapse.Realtime] Monitoring Pulse for UID: ${authUser.id}`);

    const channel = supabase
      .channel(`sovereign-pulse-${authUser.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${authUser.id}` },
        () => {
          console.info("[PULSE: Synapse.Realtime] Vault update detected. Re-hydrating.");
          fetchSovereignState();
        },
      )
      .subscribe();

    return () => {
      console.info("[END: Synapse.Realtime] Closing Pulse Listener.");
      supabase.removeChannel(channel);
    };
  }, [user, fetchSovereignState]);

  return (
    <SynapseCreditsContext.Provider value={{ balanceData, isLoading, error, refreshBalance: fetchSovereignState }}>
      {children}
    </SynapseCreditsContext.Provider>
  );
};

export const useSynapseCredits = () => {
  const context = useContext(SynapseCreditsContext);
  if (!context) throw new Error("useSynapseCredits must be used within a SynapseCreditsProvider");
  return context;
};
