import { useState, useEffect, useCallback } from "react";
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

export const useWalletBalance = () => {
  console.log("[useWalletBalance][Hook] START: Initializing hook.");

  const [balance, setBalance] = useState<WalletBalance>({ usdc_balance: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    console.log("🚀 [useWalletBalance][fetchBalance] START: Fetching absolute on-chain truth from Base.");
    setLoading(true);

    try {
      // 1. AUTHENTICATION
      console.log("[useWalletBalance][fetchBalance][Auth] INFO: Requesting authenticated user from Supabase.");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("[useWalletBalance][fetchBalance][Auth] ERROR: Supabase auth fetch failed.", authError.message);
        throw authError;
      }

      if (!user) {
        console.warn("[useWalletBalance][fetchBalance][Auth] WARN: No active user session found. Defaulting to 0.");
        setBalance({ usdc_balance: 0 });
        return;
      }

      console.log(`[useWalletBalance][fetchBalance][Auth] INFO: User verified (${user.id}).`);

      // 2. FETCH WALLET ADDRESS (Assuming stored in 'profiles')
      console.log("[useWalletBalance][fetchBalance][Profile] INFO: Querying profile for wallet address...");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "[useWalletBalance][fetchBalance][Profile] ERROR: Failed to query profile.",
          profileError.message,
        );
        throw profileError;
      }

      const walletAddress = profile?.wallet_address;

      if (!walletAddress || !walletAddress.startsWith("0x")) {
        console.warn("[useWalletBalance][fetchBalance][Profile] WARN: Valid wallet address missing. Defaulting to 0.");
        setBalance({ usdc_balance: 0 });
        return;
      }

      console.log(`[useWalletBalance][fetchBalance][Profile] SUCCESS: Wallet identified: ${walletAddress}`);

      // 3. ON-CHAIN HYDRATION (VIEM)
      console.log("[useWalletBalance][fetchBalance][Viem] INFO: Initializing Base public client.");
      const publicClient = createPublicClient({
        chain: base,
        transport: http("https://mainnet.base.org"),
      });

      console.log(`[useWalletBalance][fetchBalance][Contract] INFO: Executing balanceOf on USDC contract...`);
      const rawBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      } as any); // 🚨 CAST TO ANY: Force TS to stop looking for authorizationList

      console.log(`[useWalletBalance][fetchBalance][Contract] INFO: Raw BigInt retrieved: ${rawBalance.toString()}`);

      // 4. FORMATTING & STATE INJECTION
      // 🚨 CAST TO BIGINT: Tell TS that the contract return value is definitely a BigInt
      const hydratedBalance = Number(formatUnits(rawBalance as bigint, 6));
      console.log(
        `[useWalletBalance][fetchBalance][Hydration] SUCCESS: Verified on-chain truth is $${hydratedBalance} USDC.`,
      );

      setBalance({ usdc_balance: hydratedBalance });
    } catch (err: any) {
      console.error(
        "🚨 [useWalletBalance][fetchBalance] FATAL ERROR: Exception caught during fetch routine.",
        err.message,
      );
      setBalance({ usdc_balance: 0 });
    } finally {
      console.log("[useWalletBalance][fetchBalance] END: Fetch routine complete.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("[useWalletBalance][Effect] START: Triggering initial fetch on mount.");
    fetchBalance();

    // Auto-poll the blockchain every 15 seconds to keep the UI perfectly synced with reality
    const interval = setInterval(() => {
      console.log("[useWalletBalance][Effect] INFO: 15-second polling tick fired.");
      fetchBalance();
    }, 15000);

    console.log("[useWalletBalance][Effect] END: Mount trigger complete and interval set.");
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, loading, refreshBalance: fetchBalance };
};
