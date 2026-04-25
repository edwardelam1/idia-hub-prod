import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";

// ========================================================================
// IDIA PROTOCOL: DUAL-RAIL SOVEREIGN INTERFACES
// ========================================================================
interface ProtocolState {
  hub_operating_cash: number; // Silo 1: USD Liquidity ($10,000.00)
  synapse_gas_credits: number; // Silo 2: Computational Fuel (25,000)
  fbo_royalty_balance: number; // Silo 3: Life Yield Floor ($0.00)
  wallet_address: string;
}

interface BalanceData {
  available_credits: number; // Legacy mapping to Gas Credits
  hub_operating_cash: number; // Mapping to Operating USD
  fbo_balance: number; // Legacy mapping to Royalty Floor
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
  // LEGACY CONTRACTS (Required to fix TS2339)
  balanceData: BalanceData | null;
  burnRate: BurnRateData | null;
  refreshBalance: () => Promise<void>;

  // NEW FLUID CONTRACTS
  protocolState: ProtocolState | null;
  refreshState: () => Promise<void>;

  // CORE STATE
  isLoading: boolean;
  error: string | null;
}

const SynapseCreditsContext = createContext<SynapseCreditsContextType | undefined>(undefined);

export const SynapseCreditsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [protocolState, setProtocolState] = useState<ProtocolState | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSovereignState = useCallback(async () => {
    // Identity Bridge
    const authUser = user as unknown as SupabaseUser;
    const activeId = authUser?.id || (user as any)?.user_id;

    if (!activeId) {
      setIsLoading(false);
      return;
    }

    console.info(`[BEGIN: Synapse.Engine] Syncing Sovereign State for GUID: ${activeId}`);
    setIsLoading(true);

    try {
      // 1. VAULT DISCOVERY
      const { data: vault, error: vaultError } = await (supabase
        .from("wallets")
        .select("hub_cash_balance, cash_balance, idia_beta_balance, wallet_address")
        .eq("user_id", activeId)
        .maybeSingle() as any);

      if (vaultError) throw vaultError;
      console.log("[TRACE: Synapse.Engine] Physical Vault Payload:", vault);

      // 2. GAS DISCOVERY (RPC)
      const { data: gasBalance } = await supabase.rpc("get_synapse_balance", { uid: activeId });

      // 3. USAGE AUDIT (For Burn Rate)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: usageEntries } = await supabase
        .from("synapse_credit_ledger")
        .select("amount")
        .eq("user_id", activeId)
        .in("entry_type", ["deduction", "USAGE"])
        .neq("status", "FAILED")
        .gte("created_at", thirtyDaysAgo);

      const totalDeductions = (usageEntries || []).reduce((sum, d) => sum + Math.abs(Number(d.amount)), 0);
      const dailyAvg = totalDeductions / 30;

      // 4. PROTOCOL RECONCILIATION (One Fluid Concept)
      const hubCash = Number(vault?.hub_cash_balance ?? 0);
      const royaltyYield = Number(vault?.cash_balance ?? 0);
      const gasCredits = Number(gasBalance ?? 0);

      const newProtocolState: ProtocolState = {
        hub_operating_cash: hubCash,
        synapse_gas_credits: gasCredits,
        fbo_royalty_balance: royaltyYield,
        wallet_address: vault?.wallet_address || "",
      };

      const newBalanceData: BalanceData = {
        available_credits: gasCredits, // Legacy components see the gas tank
        hub_operating_cash: hubCash,
        fbo_balance: royaltyYield,
        stablecoin_balance: (vault?.idia_beta_balance || 0) / 10 ** 18,
        wallet_address: vault?.wallet_address || "",
        currency: "USD",
        stablecoin_currency: "IDIA-BETA",
        last_updated: new Date().toISOString(),
      };

      setProtocolState(newProtocolState);
      setBalanceData(newBalanceData);
      setBurnRate({
        daily_average: dailyAvg,
        thirty_day_total: totalDeductions,
        burn_status: dailyAvg > 0 && gasCredits < dailyAvg * 2 ? "critical" : "healthy",
      });

      console.info(`[END: Synapse.Engine] Finality Resolved. Cash: $${hubCash} | Gas: ${gasCredits}`);
    } catch (err: any) {
      console.error(`[FATAL: Synapse.Engine] Pipeline Stall: ${err.message}`);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSovereignState();
  }, [fetchSovereignState]);

  return (
    <SynapseCreditsContext.Provider
      value={{
        balanceData,
        protocolState,
        burnRate,
        isLoading,
        error,
        refreshBalance: fetchSovereignState,
        refreshState: fetchSovereignState,
      }}
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
