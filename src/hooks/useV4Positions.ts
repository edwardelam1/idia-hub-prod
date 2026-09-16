import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface V4Position {
  version: 'v4';
  owner: string;
  tokenId: string;
  poolId: string;
  token0: string;
  token1: string;
  symbol0: string;
  symbol1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  amount0: number;
  amount1: number;
  valueUSD: number;
  inRange: boolean;
  fullRange: boolean;
}

export interface V4Pool {
  id: string;
  version: 'v4';
  poolKey: { currency0: string; currency1: string; fee: number; tickSpacing: number; hooks: string };
  feeTier: number;
  token0: { id: string; symbol: string; decimals: string };
  token1: { id: string; symbol: string; decimals: string };
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  tvlUSD: number;
  amount0: number;
  amount1: number;
}

export interface V4PositionsResult {
  positions: V4Position[];
  pools: V4Pool[];
}

/**
 * Uniswap v4 positions for the supplied owners (wallet + org safe).
 * v4 positions are invisible to the v3 subgraph and the v3 position manager,
 * so they are resolved on-chain by the `uniswap-v4-positions` edge function.
 */
export function useV4Positions(owners: (string | null | undefined)[]) {
  const cleaned = Array.from(
    new Set(
      owners
        .filter((o): o is string => typeof o === 'string' && /^0x[a-fA-F0-9]{40}$/.test(o))
        .map((o) => o.toLowerCase()),
    ),
  );

  return useQuery({
    queryKey: ['uniswap-v4-positions', cleaned.join(',')],
    enabled: cleaned.length > 0,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
    queryFn: async (): Promise<V4PositionsResult> => {
      console.log('[V4_POSITIONS][BEGIN] fetching', cleaned);
      const { data, error } = await supabase.functions.invoke('uniswap-v4-positions', {
        body: { owners: cleaned },
      });
      if (error) {
        console.error('[V4_POSITIONS][ERROR]', error);
        throw error;
      }
      const result: V4PositionsResult = {
        positions: (data?.positions ?? []) as V4Position[],
        pools: (data?.pools ?? []) as V4Pool[],
      };
      console.log('[V4_POSITIONS][END]', result.positions.length, 'positions', result.pools.length, 'pools');
      return result;
    },
  });
}
