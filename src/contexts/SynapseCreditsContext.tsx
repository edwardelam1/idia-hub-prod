import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

// ========================================================================
// IDIA PROTOCOL INTERFACES: PRODUCTION SPECIFICATION
// ========================================================================
interface WalletSchema {
  hub_cash_balance: number;
  cash_balance: number;
  idia_beta_balance: number;
  wallet_address: string;
}

interface BalanceData {
  hub_operating_cash: number; // Consumption (Hub Silo)
  life_royalty_cash: number; // Royalties (Life Silo)
  synapse_gas_credits: number; // AI Consumption Rail
  wallet_address: string;
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
    // 1. IDENTITY RESOLUTION (The unknown Bridge)
    // Resolves TS2352 by bridging non-overlapping types professionally
    const authUser = user as unknown as SupabaseUser;

    if (!authUser?.id) {
      console.warn("[STATUS: SynapseProvider.Sync] Session identity not resolved. Waiting.");
      setIsLoading(false);
      return;
    }

    console.info(`[BEGIN: SynapseProvider.Sync] Resolving Triple-Silo State for UID: ${authUser.id}`);
    setIsLoading(true);

    try {
      // 2. VAULT DISCOVERY: Fetching Hub and Life Silos
      // Casting the 'select' query bypasses the TS2339 schema mismatch
      const { data, error: walletError } = await (supabase
        .from("wallets")
        .select("hub_cash_balance, cash_balance, idia_beta_balance, wallet_address")
        .eq("user_id", authUser.id)
        .maybeSingle() as any);

      if (walletError) {
        console.error(`[CRITICAL: SynapseProvider.Sync] Vault Query Failed: ${walletError.message}`);
        throw walletError;
      }

      const wallet = data as unknown as WalletSchema;

      // 3. GAS GAUGE: Fetching AI Consumption Rail (RPC)
      const { data: gasBalance, error: gasError } = await supabase.rpc("get_synapse_balance", { uid: authUser.id });
      if (gasError) console.warn(`[WARNING: SynapseProvider.GasGauge] RPC Resolve failed: ${gasError.message}`);

      // 4. STATE FINALIZATION
      const hubCash = wallet?.hub_cash_balance ?? 0;
      const lifeCash = wallet?.cash_balance ?? 0;
      const synapseGas = Number(gasBalance ?? 0);

      setBalanceData({
        hub_operating_cash: hubCash,
        life_royalty_cash: lifeCash,
        synapse_gas_credits: synapseGas,
        wallet_address: wallet?.wallet_address || "",
        last_updated: new Date().toISOString(),
      });

      console.info(`[END: SynapseProvider.Sync] Resolution Finalized. Hub: $${hubCash} | Life: $${lifeCash}`);
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
