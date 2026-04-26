import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WalletBalance {
  idia_beta_balance: number;
}

export const useWalletBalance = () => {
  console.log("[useWalletBalance][Hook] START: Initializing hook.");
  
  const [balance, setBalance] = useState<WalletBalance>({ idia_beta_balance: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    console.log("[useWalletBalance][fetchBalance] START: Fetching cross-app wallet balance.");
    setLoading(true);

    try {
      console.log("[useWalletBalance][fetchBalance] INFO: Requesting authenticated user from Supabase.");
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error("[useWalletBalance][fetchBalance] ERROR: Supabase auth fetch failed.", authError);
        throw authError;
      }

      if (!user) {
        console.warn("[useWalletBalance][fetchBalance] WARN: No active user session found. Defaulting to 0.");
        setBalance({ idia_beta_balance: 0 });
        return;
      }

      console.log(`[useWalletBalance][fetchBalance] INFO: User verified (${user.id}). Querying wallets table...`);
      
      const { data, error } = await supabase
        .from("wallets")
        .select("idia_beta_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[useWalletBalance][fetchBalance] ERROR: Failed to query wallets table.", error);
        throw error;
      }

      if (data) {
        const betaBalance = Number(data.idia_beta_balance) || 0;
        console.log(`[useWalletBalance][fetchBalance] SUCCESS: Wallet balance retrieved. idia_beta_balance = ${betaBalance}`);
        setBalance({ idia_beta_balance: betaBalance });
      } else {
        console.log("[useWalletBalance][fetchBalance] INFO: No wallet record found for user. Defaulting to 0.");
        setBalance({ idia_beta_balance: 0 });
      }

    } catch (err: any) {
      console.error("[useWalletBalance][fetchBalance] FATAL ERROR: Exception caught during fetch routine.", err.message);
      setBalance({ idia_beta_balance: 0 });
    } finally {
      console.log("[useWalletBalance][fetchBalance] END: Fetch routine complete.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("[useWalletBalance][Effect] START: Triggering initial fetch on mount.");
    fetchBalance();
    console.log("[useWalletBalance][Effect] END: Mount trigger complete.");
  }, [fetchBalance]);

  return { balance, loading, refreshBalance: fetchBalance };
};