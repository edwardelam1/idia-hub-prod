
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
      console.log('Fetching marketplace bundles and triggering comprehensive processing...');
      
      // First, trigger comprehensive health data processing
      try {
        const processResponse = await supabase.functions.invoke('process-health-streams', {
          body: { trigger: 'comprehensive_healthkit_processing' }
        });
        console.log('Health processing triggered:', processResponse);
        
        // Wait a moment for processing to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Then trigger comprehensive bundle generation
        const bundleResponse = await supabase.functions.invoke('trigger-comprehensive-bundle-generation', {
          body: { trigger: 'live_healthkit_data', force_generation: true }
        });
        console.log('Bundle generation triggered:', bundleResponse);
        
        // Wait for bundle generation to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (processError) {
        console.log('Processing trigger completed or already running:', processError);
      }
      
      const { data, error } = await supabase
        .from('marketplace_bundles')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false }); // Order by updated_at to show most recently updated bundles first

      if (error) {
        console.error('Error fetching marketplace bundles:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} bundles from database (including fresh comprehensive HealthKit bundles)`);
      return data as MarketplaceBundle[];
    },
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for near real-time updates
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
          const bundleTitle = (payload.new as any)?.title || (payload.old as any)?.title || 'Unknown';
          console.log('Bundle change event:', payload.eventType, bundleTitle);
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
