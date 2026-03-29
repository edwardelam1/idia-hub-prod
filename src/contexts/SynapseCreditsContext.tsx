import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BalanceData {
  wallet_address: string;
  available_credits: number;
  currency: string;
  last_updated: string;
}

interface BurnRateData {
  daily_average: number;
  thirty_day_total: number;
  burn_status: 'healthy' | 'warning' | 'critical';
}

interface SynapseCreditsContextType {
  balanceData: BalanceData | null;
  burnRate: BurnRateData | null;
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

const SynapseCreditsContext = createContext<SynapseCreditsContextType | undefined>(undefined);

export const SynapseCreditsProvider = ({
  children,
  walletAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d89A34"
}: {
  children: React.ReactNode;
  walletAddress?: string;
}) => {
  const { user } = useAuth();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedgerBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get latest balance from ledger
      const { data: latestEntry, error: ledgerError } = await supabase
        .from('synapse_credit_ledger')
        .select('balance_after, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ledgerError) throw ledgerError;

      const credits = latestEntry ? Number(latestEntry.balance_after) : 0;

      // Calculate 30-day burn rate from deductions
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: deductions } = await supabase
        .from('synapse_credit_ledger')
        .select('amount')
        .eq('entry_type', 'deduction')
        .gte('created_at', thirtyDaysAgo);

      const totalDeductions = (deductions || []).reduce(
        (sum, d) => sum + Math.abs(Number(d.amount)), 0
      );
      const dailyAvg = totalDeductions / 30;
      
      let burnStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (dailyAvg > 0) {
        const threshold15 = dailyAvg * 30 * 0.15;
        const threshold5 = dailyAvg * 30 * 0.05;
        if (credits < threshold5) burnStatus = 'critical';
        else if (credits < threshold15) burnStatus = 'warning';
      }

      setBurnRate({
        daily_average: dailyAvg,
        thirty_day_total: totalDeductions,
        burn_status: burnStatus,
      });

      setBalanceData({
        wallet_address: walletAddress,
        available_credits: credits,
        currency: 'SYNAPSE_GAS',
        last_updated: latestEntry?.created_at || new Date().toISOString(),
      });
    } catch {
      setError("Failed to verify ledger balance. Synapse Engine unreachable.");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchLedgerBalance();
  }, [fetchLedgerBalance]);

  // Realtime subscription on synapse_credit_ledger
  useEffect(() => {
    const channel = supabase
      .channel('synapse-credit-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'synapse_credit_ledger',
        },
        (payload) => {
          const newEntry = payload.new as any;
          setBalanceData(prev => prev ? {
            ...prev,
            available_credits: Number(newEntry.balance_after),
            last_updated: newEntry.created_at,
          } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.user_id]);

  return (
    <SynapseCreditsContext.Provider value={{ balanceData, burnRate, isLoading, error, refreshBalance: fetchLedgerBalance }}>
      {children}
    </SynapseCreditsContext.Provider>
  );
};

export const useSynapseCredits = () => {
  const context = useContext(SynapseCreditsContext);
  if (!context) {
    throw new Error('useSynapseCredits must be used within a SynapseCreditsProvider');
  }
  return context;
};
