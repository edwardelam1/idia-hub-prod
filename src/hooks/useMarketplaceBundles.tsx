
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      console.log('Fetching marketplace bundles from database...');
      
      const { data, error } = await supabase
        .from('marketplace_bundles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching marketplace bundles:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} bundles from database`);
      return data as MarketplaceBundle[];
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes for real-time updates
  });

  // Set up real-time subscription for bundle updates
  useEffect(() => {
    console.log('Setting up real-time subscription for marketplace bundles...');
    
    const channel = supabase
      .channel('marketplace-bundles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_bundles'
        },
        (payload) => {
          console.log('Real-time bundle update received:', payload);
          refetch(); // Refetch data when changes occur
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    bundles: bundles || [],
    isLoading,
    error,
    refetch
  };
};
