// src/contexts/SynapseCreditsContext.tsx
// Consolidated Fix: Removed duplicate declarations and synchronized variable flow

const fetchLedgerBalance = useCallback(async () => {
  setIsLoading(true);
  setError(null);

  try {
    const userId = user?.user_id;
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // 1. GAS GAUGE: Total balance from all SETTLED rows
    const { data: balance, error: ledgerError } = await supabase.rpc("get_synapse_balance", { uid: userId });
    if (ledgerError) throw ledgerError;
    const credits = Number(balance ?? 0);

    // 2. BURN RATE CALCULATION: Logic for 'deduction' and 'USAGE'
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: usageEntries } = await supabase
      .from("synapse_credit_ledger")
      .select("amount")
      .eq("user_id", userId)
      .in("entry_type", ["deduction", "USAGE"])
      .neq("status", "FAILED")
      .gte("created_at", thirtyDaysAgo);

    const totalDeductions = (usageEntries || []).reduce((sum, d) => sum + Math.abs(Number(d.amount)), 0);
    const dailyAvg = totalDeductions / 30;

    // 3. FBO RESERVOIR: Liquid USD value calculation
    const { data: fboEntries } = await supabase
      .from("fiat_ledger")
      .select("amount_usd")
      .eq("user_id", userId)
      .neq("status", "FAILED");

    // Consolidated single declaration for fboBalance
    const fboBalance = (fboEntries || []).reduce((sum, e) => sum + Number(e.amount_usd ?? 0), 0);

    // 4. STATUS LOGIC
    let burnStatus: "healthy" | "warning" | "critical" = "healthy";
    if (dailyAvg > 0) {
      if (credits < dailyAvg * 2) burnStatus = "critical";
      else if (credits < dailyAvg * 7) burnStatus = "warning";
    }

    setBurnRate({
      daily_average: dailyAvg,
      thirty_day_total: totalDeductions,
      burn_status: burnStatus,
    });

    setBalanceData({
      wallet_address: walletAddress,
      available_credits: credits,
      fbo_balance: fboBalance,
      currency: "SYNAPSE_CREDITS",
      last_updated: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Ledger Sync Error:", err);
    setError("Failed to verify ledger balance.");
  } finally {
    setIsLoading(false);
  }
}, [walletAddress, user?.user_id]);
