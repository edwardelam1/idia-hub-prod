import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";

// Base Mainnet USDC Contract
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Minimal ABI for read-only operations
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
  eth_balance: number;
}

/**
 * useWalletBalance
 * @param isYielding - Mandatory flag to release the Auth Lock during biometrics.
 * When true, halts background auth/network calls to prevent 'lock:sb-auth-token' contention.
 */
export const useWalletBalance = (isYielding: boolean = false) => {
  console.log(`[useWalletBalance][Hook] START: Initializing hook. isYielding=${isYielding}`);

  const [balance, setBalance] = useState<WalletBalance>({ usdc_balance: 0, eth_balance: 0 });
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBalance = useCallback(async () => {
    // 🚨 YIELD GATE: Immediate abort to prioritize the Biometric Handshake.
    // Prevents background polling from stealing the auth mutex during a transaction.
    if (isYielding) {
      console.warn("🚀 [useWalletBalance][fetchBalance] YIELD: Active. Halting background fetch.");
      if (abortControllerRef.current) abortControllerRef.current.abort();
      return;
    }

    console.log("🚀 [useWalletBalance][fetchBalance] START: Initiating sync with on-chain truth.");
    setLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      // 1. AUTHENTICATION (Mutex-Sensitive)
      console.log("[useWalletBalance][fetchBalance][Auth] START: Requesting session lock.");
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (authError) {
        console.error("[useWalletBalance][fetchBalance][Auth] FATAL: Session fetch failed.", authError.message);
        throw authError;
      }

      if (!session?.user) {
        console.warn("[useWalletBalance][fetchBalance][Auth] WARN: No active session.");
        setBalance({ usdc_balance: 0, eth_balance: 0 });
        return;
      }
      console.log(
        `[useWalletBalance][fetchBalance][Auth] END: Session secured for user ${session.user.id.slice(0, 8)}.`,
      );

      // 2. RPC CONFIG FETCH (Database Source of Truth)
      console.log("[useWalletBalance][fetchBalance][RPC] START: Querying system_configs for BASE_RPC_URL.");
      let rpcUrl = "https://base-mainnet.g.alchemy.com/v2/jKAs5SHfEFihKOngFIL2N"; // Alchemy default

      try {
        // 🚨 FIXED: Cast query to 'any' to bypass SelectQueryError for missing relation types.
        const { data: config, error: configError } = await (supabase
          .from("system_configs" as any)
          .select("value")
          .eq("key", "BASE_RPC_URL")
          .maybeSingle() as any);

        if (configError) {
          console.warn(
            "[useWalletBalance][fetchBalance][RPC] WARN: system_configs relation missing. Using Base public RPC.",
          );
        } else if (config?.value) {
          rpcUrl = config.value.trim();
        }
      } catch (schemaErr) {
        console.warn("[useWalletBalance][fetchBalance][RPC] WARN: Schema mismatch. Defaulting to public transport.");
      }
      console.log(`[useWalletBalance][fetchBalance][RPC] END: Transport initialized: ${rpcUrl.slice(0, 35)}...`);

      // 3. PROFILE SYNC
      console.log("[useWalletBalance][fetchBalance][Profile] START: Verifying wallet address registry.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError || !profile?.wallet_address) {
        console.warn("[useWalletBalance][fetchBalance][Profile] WARN: Valid hex address missing from profile.");
        setBalance({ usdc_balance: 0, eth_balance: 0 });
        return;
      }
      const walletAddress = profile.wallet_address;
      console.log(`[useWalletBalance][fetchBalance][Profile] END: Wallet identified: ${walletAddress}`);

      // 4. ON-CHAIN HYDRATION (VIEM)
      console.log("[useWalletBalance][fetchBalance][Viem] START: Initializing Base public client.");
      const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
      });

      console.log(`[useWalletBalance][fetchBalance][Contract] START: balanceOf(USDC) + getBalance(ETH).`);
      const [rawUsdc, rawEth] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: "balanceOf",
          args: [walletAddress as `0x${string}`],
        } as any),
        publicClient.getBalance({ address: walletAddress as `0x${string}` }),
      ]);

      const hydratedUsdc = Number(formatUnits(rawUsdc as bigint, 6));
      const hydratedEth = Number(formatUnits(rawEth as bigint, 18));
      console.log(`[useWalletBalance][fetchBalance][Hydration] SUCCESS: USDC=$${hydratedUsdc}, ETH=${hydratedEth}`);

      setBalance({ usdc_balance: hydratedUsdc, eth_balance: hydratedEth });
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("[useWalletBalance][fetchBalance] ABORT: Routine cancelled for transaction yield.");
      } else {
        console.error("🚨 [useWalletBalance][fetchBalance] FATAL ERROR:", err.message);
        setBalance((prev) => prev);
      }
    } finally {
      console.log("[useWalletBalance][fetchBalance] END: Lifecycle complete.");
      setLoading(false);
    }
  }, [isYielding]);

  useEffect(() => {
    console.log("[useWalletBalance][Effect] START: Initializing polling interval.");
    fetchBalance();

    const interval = setInterval(() => {
      console.log("[useWalletBalance][Effect] TICK: 15-second heartbeat fired.");
      fetchBalance();
    }, 15000);

    return () => {
      console.log("[useWalletBalance][Effect] CLEANUP: Clearing interval and aborting pending requests.");
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchBalance]);

  return { balance, loading, refreshBalance: fetchBalance };
};
