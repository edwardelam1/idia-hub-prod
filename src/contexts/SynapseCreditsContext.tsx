import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';

interface BalanceData {
  wallet_address: string;
  available_credits: number;
  currency: string;
  last_updated: string;
}

interface SynapseCreditsContextType {
  balanceData: BalanceData | null;
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
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedgerBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApi('/api/v1/synapse/balance');
      setBalanceData(data);
    } catch {
      setError("Failed to verify ledger balance. Synapse Engine unreachable.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedgerBalance();
  }, [fetchLedgerBalance]);

  return (
    <SynapseCreditsContext.Provider value={{ balanceData, isLoading, error, refreshBalance: fetchLedgerBalance }}>
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
