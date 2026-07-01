import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useWalletBalance } from "@/hooks/useWalletBalance";

// ========================================================================
// IDIA PROTOCOL: TRIPLE-RAIL SOVEREIGN INTERFACES
// ========================================================================
interface ProtocolState {
  // RAIL 1: FIAT OPERATING CAPITAL (USD)
  hub_operating_cash: number | null;

  // RAIL 2: COMPUTATIONAL GAS (CREDITS)
  synapse_gas_credits: number;

  // RAIL 3: USDC
  usdc_balance: number | null;

  // SILO 3: LIFE YIELD RESERVOIR (FIAT ROYALTIES)
  fbo_royalty_balance: number | null;

  // IDIA TOKEN (DB-backed)
  idia_token_balance: number | null;

  wallet_address: string;
}

interface BalanceData {
  // Legacy mappings for backward compatibility
  available_credits: number;
  hub_operating_cash: number | null;
  fbo_balance: number | null;
  usdc_balance: number | null;
  idia_token_balance: number | null;
  wallet_address: string;
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
  refreshBalance: () => Promise<void>;
  protocolState: ProtocolState | null;
  refreshState: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const SynapseCreditsContext = createContext<SynapseCreditsContextType | undefined>(undefined);

export const SynapseCreditsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { balance: onChainBalance } = useWalletBalance();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [protocolState, setProtocolState] = useState<ProtocolState | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSovereignState = useCallback(async () => {
    // Identity Reconciliation
    const authUser = user as unknown as SupabaseUser;
    const activeId = authUser?.id || (user as any)?.user_id;

    if (!activeId) {
      console.warn("[STATUS: Synapse.Engine] Identity Resolution Pending.");
      setIsLoading(false);
      return;
    }

    console.info(`[BEGIN: Synapse.Engine] Initializing State Resolution for: ${activeId}`);
    setIsLoading(true);

    try {
      // 1. VAULT DISCOVERY: Accessing physical silos
      const { data: vault, error: vaultError } = await (supabase
        .from("wallets")
        .select("hub_cash_balance, cash_balance, wallet_address, idia_token_balance")
        .eq("user_id", activeId)
        .maybeSingle() as any);

      if (vaultError) {
        console.error(`[ERROR: Synapse.Engine] Vault Discovery Failed: ${vaultError.message}`);
        throw vaultError;
      }

      console.info("[STATUS: Synapse.Engine] Physical Vault Hydrated.");
      console.log("[TRACE: Synapse.Engine] Raw Payload:", vault);

      // 2. GAS DISCOVERY: Interrogating Computational Silo (RPC)
      const { data: gasBalance, error: gasError } = await supabase.rpc("get_synapse_balance", { uid: activeId });
      if (gasError) console.warn(`[WARNING: Synapse.Engine] Gas RPC Stall: ${gasError.message}`);

      // 3. USAGE AUDIT: Calculating Consumption Burn
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: usageEntries } = await supabase
        .from("synapse_credit_ledger")
        .select("amount")
        .eq("user_id", activeId)
        .in("entry_type", ["deduction", "USAGE"])
        .neq("status", "failed")
        .gte("created_at", thirtyDaysAgo);

      const totalDeductions = (usageEntries || []).reduce((sum, d) => sum + Math.abs(Number(d.amount)), 0);
      const dailyAvg = totalDeductions / 30;

      // 4. PROTOCOL RECONCILIATION: Straight-Through Rail Mapping
      // Wallet-sourced silos are null when the row is missing (do NOT coerce to 0).
      const hasVault = !!vault;
      const fiatOperating = hasVault && vault?.hub_cash_balance != null ? Number(vault.hub_cash_balance) : null;
      const fiatRoyalty = hasVault && vault?.cash_balance != null ? Number(vault.cash_balance) : null;
      const idiaToken = hasVault && vault?.idia_token_balance != null ? Number(vault.idia_token_balance) : null;
      const computationalGas = Number(gasBalance ?? 0);
      // USDC = on-chain truth, read live from Base contract via useWalletBalance.
      const usdcOnChain =
        onChainBalance?.usdc_balance == null ? null : Number(onChainBalance.usdc_balance);

      const newState: ProtocolState = {
        hub_operating_cash: fiatOperating,
        synapse_gas_credits: computationalGas,
        usdc_balance: usdcOnChain,
        fbo_royalty_balance: fiatRoyalty,
        idia_token_balance: idiaToken,
        wallet_address: vault?.wallet_address || "",
      };

      const newLegacyData: BalanceData = {
        available_credits: computationalGas,
        hub_operating_cash: fiatOperating,
        fbo_balance: fiatRoyalty,
        usdc_balance: usdcOnChain,
        idia_token_balance: idiaToken,
        wallet_address: vault?.wallet_address || "",
        currency: "USD",
        last_updated: new Date().toISOString(),
      };

      setProtocolState(newState);
      setBalanceData(newLegacyData);
      setBurnRate({
        daily_average: dailyAvg,
        thirty_day_total: totalDeductions,
        burn_status: dailyAvg > 0 && computationalGas < dailyAvg * 2 ? "critical" : "healthy",
      });

      console.info(
        `[END: Synapse.Engine] Finality Resolved. Rails: Cash[$${fiatOperating}] | Gas[${computationalGas}] | USDC[${usdcOnChain}]`,
      );
    } catch (err: any) {
      console.error(`[FATAL: Synapse.Engine] State Stall: ${err.message}`);
      setError(err.message);
      toast.error("Sovereign State Synchronization Failure");
    } finally {
      setIsLoading(false);
    }
  }, [user, onChainBalance?.usdc_balance]);

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
