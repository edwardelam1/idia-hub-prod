// Uniswap v3 math helpers (subset) — pure functions, no deps.
// Reference: https://docs.uniswap.org/sdk/v3/guides/liquidity/position-data

const Q96 = 2n ** 96n;

export function tickToSqrtPriceX96(tick: number): bigint {
  // Approximation: sqrt(1.0001^tick) * 2^96. Good enough for USD valuation
  // of in-range positions where high precision isn't required for UI display.
  const sqrtRatio = Math.sqrt(Math.pow(1.0001, tick));
  return BigInt(Math.floor(sqrtRatio * Number(Q96)));
}

/**
 * Calculates token0 and token1 amounts locked in a v3 position.
 * sqrtRatio* are X96 fixed-point.
 * Mirrors Uniswap v3 LiquidityAmounts library.
 */
export function getAmountsForLiquidity(
  sqrtPriceX96: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
): { amount0: bigint; amount1: bigint } {
  let lo = sqrtRatioAX96;
  let hi = sqrtRatioBX96;
  if (lo > hi) [lo, hi] = [hi, lo];

  let amount0 = 0n;
  let amount1 = 0n;

  if (sqrtPriceX96 <= lo) {
    amount0 = getAmount0(lo, hi, liquidity);
  } else if (sqrtPriceX96 < hi) {
    amount0 = getAmount0(sqrtPriceX96, hi, liquidity);
    amount1 = getAmount1(lo, sqrtPriceX96, liquidity);
  } else {
    amount1 = getAmount1(lo, hi, liquidity);
  }
  return { amount0, amount1 };
}

function getAmount0(sqrtA: bigint, sqrtB: bigint, liquidity: bigint): bigint {
  if (sqrtA === 0n) return 0n;
  return (liquidity * Q96 * (sqrtB - sqrtA)) / sqrtB / sqrtA;
}

function getAmount1(sqrtA: bigint, sqrtB: bigint, liquidity: bigint): bigint {
  return (liquidity * (sqrtB - sqrtA)) / Q96;
}

export function formatTokenAmount(raw: bigint, decimals: number): number {
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  return Number(whole) + Number(frac) / Number(divisor);
}

/**
 * Derive USD price of token0 in terms of token1 (assumed USD-pegged stable like USDC).
 * If your token0 IS the stable, invert.
 */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number,
): number {
  const sqrt = Number(sqrtPriceX96) / Number(Q96);
  const ratio = sqrt * sqrt;
  return ratio * Math.pow(10, token0Decimals - token1Decimals);
}