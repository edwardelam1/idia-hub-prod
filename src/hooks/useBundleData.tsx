import { useState, useEffect } from 'react';
import { Bundle } from '@/types/marketplace';

export const useBundleData = (bundleId?: string): { bundle: Bundle | null; loading: boolean; error: string | null } => {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bundleId) return;

    setLoading(true);
    // No Supabase – return not-found until AWS API is connected
    setError('Bundle data unavailable. Awaiting AWS API integration.');
    setBundle(null);
    setLoading(false);
  }, [bundleId]);

  return { bundle, loading, error };
};
