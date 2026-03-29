import { useState, useCallback } from 'react';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';

export const useCreditCheck = () => {
  const { balanceData } = useSynapseCredits();
  const [showTopUp, setShowTopUp] = useState(false);
  const [shortfall, setShortfall] = useState(0);

  const checkCredits = useCallback((cost: number): boolean => {
    const available = balanceData?.available_credits ?? 0;
    if (cost > available) {
      setShortfall(cost - available);
      setShowTopUp(true);
      return false;
    }
    return true;
  }, [balanceData]);

  const dismissTopUp = useCallback(() => {
    setShowTopUp(false);
    setShortfall(0);
  }, []);

  return { checkCredits, showTopUp, shortfall, dismissTopUp };
};
