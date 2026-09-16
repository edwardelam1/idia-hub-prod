/**
 * Server-side mirror of src/lib/bundle-stream-pricing.ts. The client may show a
 * price, but this is the one that is charged.
 */

export interface StreamPrice {
  stream: string;
  recordCount: number;
  price: number;
}

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

  if (entries.length === 1) return [{ ...entries[0], price: total }];

  const allocated = entries.map((e) => {
    const exact = (total * e.recordCount) / totalRecords;
    return { ...e, exact, price: Math.floor(exact) };
  });
  let remainder = total - allocated.reduce((sum, e) => sum + e.price, 0);
  const byFraction = [...allocated].sort(
    (a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)),
  );
  for (const item of byFraction) {
    if (remainder <= 0) break;
    item.price += 1;
    remainder -= 1;
  }

  return allocated.map(({ stream, recordCount, price }) => ({ stream, recordCount, price }));
}

export function priceSelection(
  activityMix: Record<string, unknown> | null | undefined,
  bundlePrice: number,
  streams?: string[] | null,
): { price: number; recordCount: number; streams: string[] } {
  const priced = priceStreams(activityMix, bundlePrice);
  const wanted = Array.isArray(streams) && streams.length > 0 ? streams : priced.map((p) => p.stream);
  const chosen = priced.filter((p) => wanted.includes(p.stream));

  // A bundle with no declared activity mix is sold whole at its catalogue price.
  if (priced.length === 0) {
    return { price: Math.max(0, Math.round(bundlePrice)), recordCount: 0, streams: [] };
  }

  return {
    price: chosen.reduce((sum, p) => sum + p.price, 0),
    recordCount: chosen.reduce((sum, p) => sum + p.recordCount, 0),
    streams: chosen.map((p) => p.stream),
  };
}
