import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

interface WalletBalance {
  usdc_balance: number;
}

/**
 * useWalletBalance
 * @param isYielding - When true, halts all background auth/network calls to prevent lock contention.
 */
export const useWalletBalance = (isYielding: boolean = false) => {
  console.log(`[useWalletBalance][Hook] START: Hook mount. yielding_active=${isYielding}`);

  const [balance, setBalance] = useState<WalletBalance>({ usdc_balance: 0 });
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBalance = useCallback(async () => {
    // 🚨 YIELD CHECK: Immediate exit to prevent Auth Lock theft during transactions
    if (isYielding) {
      console.warn("🚀 [useWalletBalance][fetchBalance] YIELD: Aborting fetch to release Auth Lock for transaction.");
      return;
    }

    console.log("🚀 [useWalletBalance][fetchBalance] START: Fetching absolute on-chain truth.");
    setLoading(true);

    // Cancel any previous hung requests to ensure the thread is clean
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      // 1. RPC CONFIG FETCH (Alchemy Source of Truth)
      console.log("[useWalletBalance][fetchBalance][RPC] INFO: Fetching Alchemy Mainnet RPC from system_configs...");
      const { data: config } = await supabase
        .from("system_configs")
        .select("value")
        .eq("key", "ALCHEMY_BASE_MAINNET_RPC")
        .single();

      const rpcUrl = config?.value || "https://mainnet.base.org";
      console.log(`[useWalletBalance][fetchBalance][RPC] SUCCESS: Using transport: ${rpcUrl.slice(0, 20)}...`);

      // 2. AUTHENTICATION (Mutex-Sensitive)
      console.log("[useWalletBalance][fetchBalance][Auth] INFO: Requesting session.");
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError || !session) {
        console.warn("[useWalletBalance][fetchBalance][Auth] WARN: Session lock unavailable or user logged out.");
        setBalance({ usdc_balance: 0 });
        return;
      }

      // 3. PROFILE SYNC
      console.log("[useWalletBalance][fetchBalance][Profile] INFO: Querying wallet for user:", session.user.id);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError || !profile?.wallet_address) {
        console.warn("[useWalletBalance][fetchBalance][Profile] WARN: No wallet address on file.");
        setBalance({ usdc_balance: 0 });
        return;
      }

      // 4. ON-CHAIN HYDRATION (VIEM)
      const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
      });

      console.log(`[useWalletBalance][fetchBalance][Contract] INFO: Executing balanceOf on Base Mainnet.`);
      const rawBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [profile.wallet_address as `0x${string}`],
      } as any);

      const hydratedBalance = Number(formatUnits(rawBalance as bigint, 6));
      console.log(`[useWalletBalance][fetchBalance][Hydration] SUCCESS: $${hydratedBalance} USDC confirmed.`);

      setBalance({ usdc_balance: hydratedBalance });
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("[useWalletBalance][fetchBalance] ABORT: Fetch routine cancelled.");
      } else {
        console.error("🚨 [useWalletBalance][fetchBalance] FATAL ERROR:", err.message);
      }
    } finally {
      console.log("[useWalletBalance][fetchBalance] END: Routine complete.");
      setLoading(false);
    }
  }, [isYielding]);

  useEffect(() => {
    console.log("[useWalletBalance][Effect] START: Initializing polling.");
    fetchBalance();

    const interval = setInterval(() => {
      console.log("[useWalletBalance][Effect] TICK: Polling trigger.");
      fetchBalance();
    }, 15000);

    return () => {
      console.log("[useWalletBalance][Effect] CLEANUP: Clearing interval and aborting requests.");
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchBalance]);

  return { balance, loading, refreshBalance: fetchBalance };
};
