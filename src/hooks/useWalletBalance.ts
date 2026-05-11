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
}

/**
 * useWalletBalance
 * @param isYielding - When true, halts all background auth/network calls to prevent lock contention.
 * This ensures the biometric (FaceID/TouchID) handshake has exclusive access to the auth mutex.
 */
export const useWalletBalance = (isYielding: boolean = false) => {
  console.log(`[useWalletBalance][Hook] START: Initializing hook. isYielding=${isYielding}`);

  const [balance, setBalance] = useState<WalletBalance>({ usdc_balance: 0 });
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBalance = useCallback(async () => {
    // 🚨 YIELD CHECK: Atomic bypass to release Auth Lock for the biometric handshake
    if (isYielding) {
      console.warn(
        "🚀 [useWalletBalance][fetchBalance] YIELD: Active. Halting background fetch to prevent lock theft.",
      );
      return;
    }

    console.log("🚀 [useWalletBalance][fetchBalance] START: Initiating sync with on-chain truth.");
    setLoading(true);

    // Cancel any previous hung requests to ensure the thread is clean
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      // 1. AUTHENTICATION (Mutex-Sensitive)
      // We use getSession instead of getUser here to minimize heavy auth-lock contention
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
        console.warn("[useWalletBalance][fetchBalance][Auth] WARN: No active session. Resetting balance state.");
        setBalance({ usdc_balance: 0 });
        return;
      }
      console.log(`[useWalletBalance][fetchBalance][Auth] END: Session secured for user ${session.user.id}.`);

      // 2. RPC CONFIG FETCH
      // 🚨 SAFETY GATE: Handled with 'as any' to bypass TypeScript errors on the missing 'system_configs' table.
      console.log("[useWalletBalance][fetchBalance][RPC] START: Pulling Alchemy RPC from system_configs.");
      let rpcUrl = "https://mainnet.base.org"; // High-availability fallback

      try {
        const { data: config, error: configError } = await supabase
          .from("system_configs" as any)
          .select("value")
          .eq("key", "ALCHEMY_BASE_MAINNET_RPC")
          .single();

        if (configError) {
          console.warn(
            "[useWalletBalance][fetchBalance][RPC] WARN: system_configs table not found. Using Base default.",
          );
        } else if (config?.value) {
          rpcUrl = config.value;
        }
      } catch (schemaErr) {
        console.warn("[useWalletBalance][fetchBalance][RPC] WARN: Schema mismatch. Defaulting to Base Public RPC.");
      }
      console.log(`[useWalletBalance][fetchBalance][RPC] END: Transport initialized with: ${rpcUrl.slice(0, 25)}...`);

      // 3. PROFILE SYNC
      console.log("[useWalletBalance][fetchBalance][Profile] START: Querying wallet address from registry.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("[useWalletBalance][fetchBalance][Profile] FATAL: Registry query failed.", profileError.message);
        throw profileError;
      }

      const walletAddress = profile?.wallet_address;

      if (!walletAddress || !walletAddress.startsWith("0x")) {
        console.warn("[useWalletBalance][fetchBalance][Profile] WARN: Valid hex address missing. Aborting hydration.");
        setBalance({ usdc_balance: 0 });
        return;
      }
      console.log(`[useWalletBalance][fetchBalance][Profile] END: Wallet verified: ${walletAddress}`);

      // 4. ON-CHAIN HYDRATION (VIEM)
      console.log("[useWalletBalance][fetchBalance][Viem] START: Initializing public client.");
      const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
      });

      console.log(`[useWalletBalance][fetchBalance][Contract] START: Calling balanceOf for ${walletAddress}`);
      const rawBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      } as any);

      console.log(`[useWalletBalance][fetchBalance][Contract] INFO: Raw BigInt: ${rawBalance.toString()}`);

      // 5. STATE INJECTION
      const hydratedBalance = Number(formatUnits(rawBalance as bigint, 6));
      console.log(
        `[useWalletBalance][fetchBalance][Hydration] END: On-chain truth confirmed: $${hydratedBalance} USDC.`,
      );

      setBalance({ usdc_balance: hydratedBalance });
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("[useWalletBalance][fetchBalance] ABORT: Routine cancelled for yield.");
      } else {
        console.error("🚨 [useWalletBalance][fetchBalance] FATAL ERROR:", err.message);
      }
    } finally {
      console.log("[useWalletBalance][fetchBalance] END: Lifecycle complete.");
      setLoading(false);
    }
  }, [isYielding]);

  useEffect(() => {
    console.log("[useWalletBalance][Effect] START: Polling cycle initialized.");
    fetchBalance();

    const interval = setInterval(() => {
      console.log("[useWalletBalance][Effect] TICK: 15-second polling event fired.");
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
