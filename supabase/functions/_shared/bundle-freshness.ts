// Shared freshness / volatility helpers for marketplace bundle generation.
// Bundles republish because the underlying data materially moved — never on a clock.

export type WindowKey = "24h" | "7d" | "30d" | "all";

export const WINDOW_KEYS: WindowKey[] = ["24h", "7d", "30d", "all"];

export interface StatFingerprint {
  record_count: number;
  contributors: number;
  avg_quality: number;
  activity_mix: Record<string, number>;
  source_latest_at: string | null;
}

export function buildFingerprint(agg: {
  total_records: number | string;
  distinct_contributors: number | string;
  avg_quality: number | string;
  activity_mix?: Record<string, number> | null;
  source_latest_at?: string | null;
}): StatFingerprint {
  const total = Number(agg.total_records) || 0;
  const rawMix = agg.activity_mix ?? {};
  const mix: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawMix)) {
    mix[k] = total > 0 ? Number(v) / total : 0;
  }
  return {
    record_count: total,
    contributors: Number(agg.distinct_contributors) || 0,
    avg_quality: Number(Number(agg.avg_quality ?? 0).toFixed(4)),
    activity_mix: mix,
    source_latest_at: agg.source_latest_at ?? null,
  };
}

/** L1 distance between two normalized distributions (0 = identical, 2 = disjoint). */
export function mixDistance(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  let d = 0;
  for (const k of keys) d += Math.abs((a?.[k] ?? 0) - (b?.[k] ?? 0));
  return d;
}

export interface MaterialChange {
  changed: boolean;
  reasons: string[];
}

/**
 * Data-driven republish rule. Any one of these means the bundle is genuinely different:
 *  - record count moved > 1% or > 100 rows
 *  - distinct contributors changed at all
 *  - avg quality shifted > 0.02
 *  - activity mix shifted > 5% (L1)
 *  - the newest source record advanced
 */
export function isMaterialChange(prev: Partial<StatFingerprint> | null | undefined, next: StatFingerprint): MaterialChange {
  if (!prev || typeof prev.record_count !== "number") {
    return { changed: true, reasons: ["no_prior_fingerprint"] };
  }

  const reasons: string[] = [];
  const prevCount = Number(prev.record_count) || 0;
  const delta = Math.abs(next.record_count - prevCount);
  const pct = prevCount > 0 ? delta / prevCount : next.record_count > 0 ? 1 : 0;
  if (delta > 100 || pct > 0.01) reasons.push(`record_count ${prevCount} -> ${next.record_count}`);

  if ((Number(prev.contributors) || 0) !== next.contributors) {
    reasons.push(`contributors ${prev.contributors} -> ${next.contributors}`);
  }

  if (Math.abs((Number(prev.avg_quality) || 0) - next.avg_quality) > 0.02) {
    reasons.push(`avg_quality ${prev.avg_quality} -> ${next.avg_quality}`);
  }

  if (mixDistance(prev.activity_mix ?? {}, next.activity_mix) > 0.05) {
    reasons.push("activity_mix_shift");
  }

  const prevLatest = prev.source_latest_at ? Date.parse(prev.source_latest_at) : 0;
  const nextLatest = next.source_latest_at ? Date.parse(next.source_latest_at) : 0;
  if (nextLatest > prevLatest) reasons.push("source_latest_advanced");

  return { changed: reasons.length > 0, reasons };
}

export function windowLabel(key: string): string {
  switch (key) {
    case "24h":
      return "Last 24 Hours";
    case "7d":
      return "Last 7 Days";
    case "30d":
      return "Last 30 Days";
    default:
      return "All Time";
  }
}
