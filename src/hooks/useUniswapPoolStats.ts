import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PoolSeriesPoint {
  date: string;
  tvl: number;
  volume: number;
}

export interface UniswapPoolStat {
  id: string;
  feeTier: number;
  token0: { id: string; symbol: string; decimals: string };
  token1: { id: string; symbol: string; decimals: string };
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  tvlUSD: number;
  volume24hUSD: number;
  volume30dUSD: number;
  feeApr: number;
  series: PoolSeriesPoint[];
}

export function useUniswapPoolStats() {
  return useQuery({
    queryKey: ['uniswap-pool-stats', 'idia-usdc-base'],
    queryFn: async (): Promise<UniswapPoolStat[]> => {
      const { data, error } = await supabase.functions.invoke('uniswap-pool-stats', {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.pools ?? []) as UniswapPoolStat[];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useOrgSafeAddress() {
  return useQuery({
    queryKey: ['org-safe-address'],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.functions.invoke('get-org-safe-address', {
        body: {},
      });
      if (error) throw error;
      return (data?.address ?? null) as string | null;
    },
    staleTime: 5 * 60_000,
  });
}