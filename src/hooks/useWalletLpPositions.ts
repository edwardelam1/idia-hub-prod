import { useQuery } from '@tanstack/react-query';
import { createPublicClient, http, getAddress, type Address } from 'viem';
import { base } from 'viem/chains';
import {
  NONFUNGIBLE_POSITION_MANAGER_BASE,
  erc721BalanceAbi,
  positionsAbi,
  IDIA_TOKEN_BASE,
  USDC_TOKEN_BASE,
} from '@/lib/uniswap-abi';
import { getAmountsForLiquidity, tickToSqrtPriceX96, formatTokenAmount } from '@/lib/uniswap-math';
import type { UniswapPoolStat } from './useUniswapPoolStats';

const RPC_URL = (import.meta.env.VITE_BASE_RPC_URL as string) || 'https://mainnet.base.org';

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

export interface WalletPosition {
  tokenId: string;
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  amount0: number;
  amount1: number;
  valueUSD: number;
  uncollectedFees0: number;
  uncollectedFees1: number;
  uncollectedFeesUSD: number;
  inRange: boolean;
}

function matchesIdiaUsdc(t0: string, t1: string): boolean {
  const sorted = [t0.toLowerCase(), t1.toLowerCase()].sort().join('|');
  const target = [IDIA_TOKEN_BASE.toLowerCase(), USDC_TOKEN_BASE.toLowerCase()].sort().join('|');
  return sorted === target;
}

export function useWalletLpPositions(
  address: string | null | undefined,
  pools: UniswapPoolStat[] | undefined,
) {
  return useQuery({
    queryKey: ['lp-positions', address, pools?.map((p) => p.id).join(',')],
    enabled: !!address && !!pools && pools.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<WalletPosition[]> => {
      if (!address) return [];
      const checksumed = getAddress(address);

      const balance = (await client.readContract({
        address: NONFUNGIBLE_POSITION_MANAGER_BASE,
        abi: erc721BalanceAbi,
        functionName: 'balanceOf',
        args: [checksumed],
      } as never)) as bigint;

      if (balance === 0n) return [];

      const idxs = Array.from({ length: Number(balance) }, (_, i) => i);
      const tokenIds = (await Promise.all(
        idxs.map((i) =>
          client.readContract({
            address: NONFUNGIBLE_POSITION_MANAGER_BASE,
            abi: erc721BalanceAbi,
            functionName: 'tokenOfOwnerByIndex',
            args: [checksumed, BigInt(i)],
          } as never),
        ),
      )) as bigint[];

      const rawPositions = await Promise.all(
        tokenIds.map((id) =>
          client.readContract({
            address: NONFUNGIBLE_POSITION_MANAGER_BASE,
            abi: positionsAbi,
            functionName: 'positions',
            args: [id],
          } as never),
        ),
      );

      const out: WalletPosition[] = [];
      rawPositions.forEach((p, i) => {
        const [, , token0, token1, fee, tickLower, tickUpper, liquidity, , , tokensOwed0, tokensOwed1] = p as unknown as [
          bigint, string, Address, Address, number, number, number, bigint, bigint, bigint, bigint, bigint,
        ];
        if (!matchesIdiaUsdc(token0, token1)) return;
        if (liquidity === 0n && tokensOwed0 === 0n && tokensOwed1 === 0n) return;

        // Match to a pool from subgraph by feeTier
        const pool = pools?.find((pl) => pl.feeTier === Number(fee));
        if (!pool) return;

        const dec0 = Number(pool.token0.decimals);
        const dec1 = Number(pool.token1.decimals);

        const sqrtPrice = BigInt(pool.sqrtPriceX96);
        const sqrtLower = tickToSqrtPriceX96(Number(tickLower));
        const sqrtUpper = tickToSqrtPriceX96(Number(tickUpper));
        const { amount0, amount1 } = getAmountsForLiquidity(sqrtPrice, sqrtLower, sqrtUpper, liquidity);

        const amt0 = formatTokenAmount(amount0, dec0);
        const amt1 = formatTokenAmount(amount1, dec1);

        // Token1 is USDC (stable, decimals 6) in canonical sort order on Base.
        // Determine which token is the USD-pegged side and price the other via pool tick.
        const token1IsUsd = pool.token1.id.toLowerCase() === USDC_TOKEN_BASE.toLowerCase();
        // price of token0 in token1 units (already in human form below via decimals adj)
        const sqrt = Number(sqrtPrice) / Number(2n ** 96n);
        const ratio = sqrt * sqrt;
        const price0in1 = ratio * Math.pow(10, dec0 - dec1);

        const value0USD = token1IsUsd ? amt0 * price0in1 : amt0; // if token0 is USDC, its value is amt0
        const value1USD = token1IsUsd ? amt1 : amt1 * (1 / Math.max(price0in1, 1e-30));
        const valueUSD = value0USD + value1USD;

        const fees0 = formatTokenAmount(tokensOwed0, dec0);
        const fees1 = formatTokenAmount(tokensOwed1, dec1);
        const feesUSD = token1IsUsd
          ? fees0 * price0in1 + fees1
          : fees0 + fees1 * (1 / Math.max(price0in1, 1e-30));

        const currentTick = pool.tick;
        const inRange = currentTick >= Number(tickLower) && currentTick < Number(tickUpper);

        out.push({
          tokenId: tokenIds[i].toString(),
          token0,
          token1,
          fee: Number(fee),
          tickLower: Number(tickLower),
          tickUpper: Number(tickUpper),
          liquidity,
          amount0: amt0,
          amount1: amt1,
          valueUSD,
          uncollectedFees0: fees0,
          uncollectedFees1: fees1,
          uncollectedFeesUSD: feesUSD,
          inRange,
        });
      });

      return out;
    },
  });
}

export function useUserWalletAddress() {
  // Lazy import to keep this hook lean.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return useQuery({
    queryKey: ['user-wallet-address'],
    queryFn: async (): Promise<string | null> => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return null;
      return (data?.wallet_address ?? null) as string | null;
    },
    staleTime: 5 * 60_000,
  });
}