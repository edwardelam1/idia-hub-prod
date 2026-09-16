/**
 * Splits a bundle's credit price across its real data streams, strictly by each
 * stream's share of the records. The allocated prices always sum back to the
 * bundle price (largest-remainder allocation), so buying every stream costs
 * exactly the bundle price — never more.
 */

export interface StreamPrice {
  /** Raw stream identifier as stored in the staging data (e.g. "walkingSpeed"). */
  stream: string;
  /** Human label for the UI. */
  label: string;
  recordCount: number;
  price: number;
}

/** "walkingSpeed" -> "Walking Speed" */
export const humanizeStream = (stream: string): string =>
  stream
    .replace(/[_.-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());

/**
 * @param activityMix { stream: recordCount } straight from data_json.activity_mix
 * @param bundlePrice full bundle price in credits
 */
export function priceStreams(
  activityMix: Record<string, unknown> | null | undefined,
  bundlePrice: number,
): StreamPrice[] {
  const entries = Object.entries(activityMix ?? {})
    .map(([stream, count]) => ({ stream, recordCount: Number(count) || 0 }))
    .filter((e) => e.recordCount > 0)
    .sort((a, b) => b.recordCount - a.recordCount);

  if (entries.length === 0) return [];

  const totalRecords = entries.reduce((sum, e) => sum + e.recordCount, 0);
  const total = Math.max(0, Math.round(bundlePrice));

  if (entries.length === 1) {
    return [{ ...entries[0], label: humanizeStream(entries[0].stream), price: total }];
  }

  // Floor each share, then hand the remainder to the largest fractional parts.
  const raw = entries.map((e) => ({ ...e, exact: (total * e.recordCount) / totalRecords }));
  const allocated = raw.map((e) => ({ ...e, price: Math.floor(e.exact) }));
  let remainder = total - allocated.reduce((sum, e) => sum + e.price, 0);

  const byFraction = [...allocated].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)));
  for (const item of byFraction) {
    if (remainder <= 0) break;
    item.price += 1;
    remainder -= 1;
  }

  return allocated.map(({ stream, recordCount, price }) => ({
    stream,
    recordCount,
    label: humanizeStream(stream),
    price,
  }));
}

/** Price of a specific subset of streams, using the same allocation. */
export function priceSelection(
  activityMix: Record<string, unknown> | null | undefined,
  bundlePrice: number,
  streams: string[],
): { price: number; recordCount: number } {
  const priced = priceStreams(activityMix, bundlePrice);
  const chosen = priced.filter((p) => streams.includes(p.stream));
  return {
    price: chosen.reduce((sum, p) => sum + p.price, 0),
    recordCount: chosen.reduce((sum, p) => sum + p.recordCount, 0),
  };
}
