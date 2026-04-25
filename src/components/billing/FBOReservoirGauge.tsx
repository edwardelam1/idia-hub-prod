import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

// ========================================================================
// IDIA PROTOCOL INTERFACES: TRIPLE-SILO PRODUCTION SPECIFICATION
// ========================================================================
interface BalanceData {
  hub_operating_cash: number; // The $5,000.00 Operating Liquidity
  life_royalty_cash: number; // The $0.00 Royalty Floor
  synapse_gas_credits: number; // The 0 Credits (AI Consumption Rail)
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

export const SynapseCreditsProvider = ({
  children,
  walletAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d89A34",
}: {
  children: React.ReactNode;
  walletAddress?: string;
}) => {
  const { user } = useAuth();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSovereignState = useCallback(async () => {
    // 1. IDENTITY INTEGRITY: No 'any' casting, using standard property checks
    if (!user || typeof user !== "object" || !("id" in user)) {
      console.warn("[STATUS: SynapseProvider.Sync] Session identity not resolved. Suspending fetch.");
      setIsLoading(false);
      return;
    }

    const userId = (user as User).id;
    console.info(`[BEGIN: SynapseProvider.Sync] Resolving Triple-Silo State for UID: ${userId}`);
    setIsLoading(true);

    try {
      // 2. VAULT DISCOVERY: Fetching Hub and Life Silos
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("hub_cash_balance, cash_balance, wallet_address")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError) throw walletError;

      // 3. GAS GAUGE: Fetching AI Consumption Rail (RPC)
      const { data: gasBalance, error: gasError } = await supabase.rpc("get_synapse_balance", { uid: userId });
      if (gasError) console.warn(`[WARNING: SynapseProvider.GasGauge] RPC Resolve failed: ${gasError.message}`);

      // 4. STATE FINALIZATION: Hard-binding to physical database columns
      const hubCash = Number(wallet?.hub_cash_balance ?? 0);
      const lifeCash = Number(wallet?.cash_balance ?? 0);
      const synapseGas = Number(gasBalance ?? 0);

      setBalanceData({
        hub_operating_cash: hubCash,
        life_royalty_cash: lifeCash,
        synapse_gas_credits: synapseGas,
        wallet_address: wallet?.wallet_address || walletAddress,
        last_updated: new Date().toISOString(),
      });

      console.info(
        `[END: SynapseProvider.Sync] Resolution Finalized. Operating: $${hubCash} | Royalties: $${lifeCash} | Gas: ${synapseGas} Credits`,
      );
    } catch (err: any) {
      console.error(`[FATAL: SynapseProvider.Sync] Sovereign State Stall: ${err.message}`);
      setError(err.message);
      toast.error("Vault Synchronization Failure");
    } finally {
      setIsLoading(false);
    }
  }, [user, walletAddress]);

  useEffect(() => {
    fetchSovereignState();
  }, [fetchSovereignState]);

  // 5. REALTIME PULSE: Listen for physical vault updates
  useEffect(() => {
    if (!user || !("id" in user)) return;
    const userId = (user as User).id;

    const channel = supabase
      .channel(`vault-pulse-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${userId}` },
        () => {
          console.info("[PULSE: SynapseProvider.Realtime] Vault Transition Detected.");
          fetchSovereignState();
        },
      )
      .subscribe();

    return () => {
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
