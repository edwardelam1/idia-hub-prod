import { useQuery } from '@tanstack/react-query';

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
      // Return empty array – no Supabase. Real data will come from AWS API.
      console.log('Marketplace bundles: awaiting AWS API integration');
      return [] as MarketplaceBundle[];
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
