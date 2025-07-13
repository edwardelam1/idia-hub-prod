
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bundle } from '@/types/marketplace';

export const useBundleData = (bundleId?: string): { bundle: Bundle | null; loading: boolean; error: string | null } => {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bundleId) return;
    
    const fetchBundle = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('marketplace_bundles')
          .select('*')
          .eq('bundle_id', bundleId)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error fetching bundle:', error);
          setError('Bundle not found or access denied');
          setBundle(null);
          return;
        }

        if (data) {
          const convertedBundle: Bundle = {
            bundle_id: data.bundle_id,
            id: data.bundle_id, // For compatibility
            name: data.title,
            tier: data.tier,
            contacts: data.contacts_count || 0,
            features: data.features || [],
            category: data.category,
            description: data.description,
            keyInsights: data.key_insights || [],
            dataPoints: data.data_points || [],
            suggestedFilters: data.suggested_filters || [],
            price: data.price,
            dataJson: data.data_json
          };
          setBundle(convertedBundle);
        } else {
          setError('Bundle not found');
          setBundle(null);
        }
      } catch (err) {
        console.error('Unexpected error fetching bundle:', err);
        setError('Failed to load bundle');
        setBundle(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBundle();
  }, [bundleId]);

  return { bundle, loading, error };
};
