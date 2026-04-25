import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

// ========================================================================
// IDIA PROTOCOL: DUAL-RAIL SOVEREIGN STATE
// ========================================================================
interface ProtocolState {
  hub_operating_cash: number; // Rail 1: USD Liquidity ($10,000.00)
  synapse_gas_credits: number; // Rail 2: Computational Fuel (25,000)
  fbo_royalty_balance: number; // Rail 3: Life Yield Floor ($0.00)
  wallet_address: string;
  last_updated: string;
}

interface SynapseCreditsContextType {
  protocolState: ProtocolState | null;
  isLoading: boolean;
  refreshState: () => Promise<void>;
}

const SynapseCreditsContext = createContext<SynapseCreditsContextType | undefined>(undefined);

export const SynapseCreditsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [protocolState, setProtocolState] = useState<ProtocolState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSovereignState = useCallback(async () => {
    // Identity Reconciliation: Bridging AuthContext user_id to Supabase id
    const authUser = user as unknown as SupabaseUser;
    const activeId = authUser?.id || (user as any)?.user_id;

    if (!activeId) {
      console.warn("[STATUS: Synapse.Engine] No Active GUID. Standby.");
      setIsLoading(false);
      return;
    }

    console.info(`[BEGIN: Synapse.Engine] Syncing Dual-Rail State for: ${activeId}`);
    setIsLoading(true);

    try {
      // 1. VAULT DISCOVERY (The USD & Yield Silos)
      const { data: vault, error: vaultError } = await (supabase
        .from("wallets")
        .select("hub_cash_balance, cash_balance, wallet_address")
        .eq("user_id", activeId)
        .maybeSingle() as any);

      if (vaultError) throw vaultError;

      // CRITICAL LOG: If this is NULL, RLS is active and blocking your Mac browser.
      console.log("[TRACE: Synapse.Engine] Physical Vault Payload:", vault);

      // 2. GAS DISCOVERY (The Credit Silo via hardened RPC)
      const { data: gasBalance, error: gasError } = await supabase.rpc("get_synapse_balance", { uid: activeId });
      if (gasError) console.warn(`[WARNING: Synapse.Engine] Gas RPC Stall: ${gasError.message}`);

      // 3. UNIFICATION
      setProtocolState({
        hub_operating_cash: Number(vault?.hub_cash_balance ?? 0),
        synapse_gas_credits: Number(gasBalance ?? 0),
        fbo_royalty_balance: Number(vault?.cash_balance ?? 0),
        wallet_address: vault?.wallet_address || "0x-PENDING",
        last_updated: new Date().toISOString(),
      });

      console.info(`[END: Synapse.Engine] Solvency Resolved. USD: $${vault?.hub_cash_balance} | Gas: ${gasBalance}`);
    } catch (err: any) {
      console.error(`[FATAL: Synapse.Engine] Pipeline Stall: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSovereignState();
  }, [fetchSovereignState]);

  return (
    <SynapseCreditsContext.Provider value={{ protocolState, isLoading, refreshState: fetchSovereignState }}>
      {children}
    </SynapseCreditsContext.Provider>
  );
};

export const useSynapseCredits = () => {
  const context = useContext(SynapseCreditsContext);
  if (!context) throw new Error("useSynapseCredits must be used within a SynapseCreditsProvider");
  return context;
};
