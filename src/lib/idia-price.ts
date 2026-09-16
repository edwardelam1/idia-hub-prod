/**
 * Shared IDIA→USD price derivation from the live IDIA/USDC Uniswap v3 pool.
 * Single implementation used by the Liquidity page and the dashboard rails.
 */
import type { UniswapPoolStat } from "@/hooks/useUniswapPoolStats";

export const IDIA_ADDRESS_LC = "0x6526f939d257e67896821c25b6c24daa404a01fb";
export const USDC_ADDRESS_LC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

/** Returns the IDIA price in USD, or null when no usable pool data exists. */
export function deriveIdiaUsdPrice(pools: UniswapPoolStat[] | undefined | null): number | null {
  if (!pools || pools.length === 0) return null;

  const pool = pools.find((p) => {
    const t0 = p.token0?.id?.toLowerCase();
    const t1 = p.token1?.id?.toLowerCase();
    return (
      (t0 === IDIA_ADDRESS_LC && t1 === USDC_ADDRESS_LC) || (t0 === USDC_ADDRESS_LC && t1 === IDIA_ADDRESS_LC)
    );
  });
  if (!pool?.sqrtPriceX96) return null;

  try {
    const sqrt = BigInt(pool.sqrtPriceX96);
    const num = Number((sqrt * sqrt * 10_000n) >> 192n) / 10_000;
    const t0IsIdia = pool.token0.id.toLowerCase() === IDIA_ADDRESS_LC;
    const dec0 = Number(pool.token0.decimals);
    const dec1 = Number(pool.token1.decimals);
    const priceT0inT1 = num * Math.pow(10, dec0 - dec1);
    const idiaUsd = t0IsIdia ? priceT0inT1 : priceT0inT1 !== 0 ? 1 / priceT0inT1 : 0;
    return Number.isFinite(idiaUsd) && idiaUsd > 0 ? idiaUsd : null;
  } catch (err) {
    const e = err as Error;
    console.error(`[idia-price] price derivation failed: ${e.message}`, e.stack);
    return null;
  }
}
