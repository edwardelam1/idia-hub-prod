import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WalletBalance {
  idia_beta_balance: number;
}

export const useWalletBalance = () => {
  console.log("[useWalletBalance][Hook] START: DB-backed (shared with IDIA Life).");

  const [balance, setBalance] = useState<WalletBalance>({ idia_beta_balance: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    console.log("🚀 [useWalletBalance][fetchBalance] START: Reading shared DB (micro-USDC).");
    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setBalance({ idia_beta_balance: 0 });
        return;
      }

      // Read the same row IDIA Life reads — single source of truth.
      const { data: wallet, error: wErr } = await supabase
        .from("wallets")
        .select("idia_beta_balance, usdc_last_synced_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (wErr) throw wErr;

      const microUnits = Number(wallet?.idia_beta_balance ?? 0);
      const usdc = microUnits / 1_000_000;
      console.log(
        `[useWalletBalance] db_micro=${microUnits} usdc=${usdc} synced_at=${wallet?.usdc_last_synced_at ?? "never"}`,
      );
      setBalance({ idia_beta_balance: usdc });
    } catch (err: any) {
      console.error("🚨 [useWalletBalance] FATAL:", err?.message);
        setBalance({ idia_beta_balance: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, loading, refreshBalance: fetchBalance };
};
