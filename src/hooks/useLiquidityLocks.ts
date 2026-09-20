import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LiquidityLockRecord {
  id: string;
  token_id: string;
  wallet_address: string;
  usd_value: number;
  maturity_date: string;
  status: string;
  tx_hash: string;
  created_at: string;
}

export function useLiquidityLocks(walletAddress: string | null | undefined) {
  return useQuery({
    queryKey: ["liquidity-locks", walletAddress?.toLowerCase()],
    enabled: Boolean(walletAddress),
    refetchInterval: 60_000,
    queryFn: async (): Promise<LiquidityLockRecord[]> => {
      console.log("[START] useLiquidityLocks: Beginning wallet lock lookup.");
      try {
        if (!walletAddress) {
          console.log("[PROCESS] useLiquidityLocks: Wallet unavailable; returning no locks.");
          return [];
        }

        console.log("[PROCESS] useLiquidityLocks: Querying wallet-scoped liquidity locks.");
        const { data, error } = await (supabase as any)
          .from("liquidity_locks")
          .select("id,token_id,wallet_address,usd_value,maturity_date,status,tx_hash,created_at")
          .eq("wallet_address", walletAddress.toLowerCase())
          .order("maturity_date", { ascending: true });

        if (error) throw new Error(error.message);
        console.log(`[PROCESS] useLiquidityLocks: Retrieved ${data?.length ?? 0} locks.`);
        return (data ?? []) as LiquidityLockRecord[];
      } catch (error) {
        console.error("[ERROR] useLiquidityLocks: Lock lookup failed.", error);
        throw error;
      } finally {
        console.log("[END] useLiquidityLocks: Wallet lock lookup completed.");
      }
    },
  });
}