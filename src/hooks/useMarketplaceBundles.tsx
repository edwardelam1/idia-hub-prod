import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MarketplaceBundle {
  bundle_id: string;
  title: string;
  description: string;
  data_json: any;
  key_insights: string[];
  data_points: string[];
  suggested_filters: string[];
  price: number;
  tier: string;
  category: string;
  contacts_count: number;
  match_percentage: number;
  features: string[];
  bundle_version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  window_key: string;
  window_start: string | null;
  window_end: string | null;
  source_latest_at: string | null;
  generated_at: string | null;
  stat_fingerprint: any;
}

export const useMarketplaceBundles = () => {
  const { data: bundles, isLoading, error, refetch } = useQuery({
    queryKey: ['marketplace-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_bundles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load marketplace bundles', error);
        throw error;
      }

      // Read-only: browsing the Marketplace must never mutate the catalog.
      return (data ?? []).map((row: any) => ({
        ...row,
        contacts_count: row.participant_count ?? 0,
      })) as MarketplaceBundle[];
    },
    refetchInterval: 30 * 1000,
  });

  return {
    bundles: bundles || [],
    isLoading,
    error,
    refetch
  };
};
