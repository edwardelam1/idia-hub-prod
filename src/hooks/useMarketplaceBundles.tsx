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

      const mapped = (data ?? []).map((row: any) => ({
        ...row,
        contacts_count: row.participant_count ?? 0,
      })) as MarketplaceBundle[];

      // Auto-seed once per session if catalog is empty.
      if (mapped.length === 0 && !(globalThis as any).__hubAutoSeedFired) {
        (globalThis as any).__hubAutoSeedFired = true;
        console.info('[BEGIN: Marketplace.AutoSeed.Invoke]');
        supabase.functions
          .invoke('seed-marketplace-catalog', { body: {} })
          .then(({ data, error }) => {
            console.info(`[END: Marketplace.AutoSeed.Invoke] seeded=${data?.seeded ?? 0} error=${error?.message ?? 'none'}`);
          })
          .catch((e) => console.error(`[CATCH: Marketplace.AutoSeed.Invoke] ${e?.message}`));
      }
      return mapped;
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
