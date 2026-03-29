import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AlaCarteInterceptModal } from '@/components/settings/AlaCarteInterceptModal';
import { toast } from 'sonner';

/**
 * Hook that intercepts bundle purchases for Individual accounts.
 * Business accounts pass through. Individual accounts get the A La Carte modal.
 */
export const useAccountGate = () => {
  const { isBusinessAccount } = useAuth();
  const [interceptOpen, setInterceptOpen] = useState(false);
  const [interceptBundleName, setInterceptBundleName] = useState<string | undefined>();
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  /**
   * Call this before any bundle purchase action.
   * Returns true if the action can proceed (business account).
   * For individual accounts, opens the intercept modal and returns false.
   */
  const gatePurchase = useCallback(
    (bundleName?: string, onAlaCarteFallback?: () => void): boolean => {
      if (isBusinessAccount) return true;

      setInterceptBundleName(bundleName);
      setPendingCallback(() => onAlaCarteFallback ?? null);
      setInterceptOpen(true);
      return false;
    },
    [isBusinessAccount],
  );

  const handleAlaCartePurchase = useCallback(() => {
    setInterceptOpen(false);
    if (pendingCallback) {
      pendingCallback();
    } else {
      toast.success('A La Carte query initiated — $10.00 will be charged.');
    }
  }, [pendingCallback]);

  const InterceptModal = (
    <AlaCarteInterceptModal
      open={interceptOpen}
      onOpenChange={setInterceptOpen}
      bundleName={interceptBundleName}
      onAlaCartePurchase={handleAlaCartePurchase}
    />
  );

  return { gatePurchase, InterceptModal, isBusinessAccount };
};
