// Freshness helpers for the Synapse Marketplace. All values derive from real
// source telemetry timestamps — nothing here is simulated.

export type WindowKey = "24h" | "7d" | "30d" | "all";

export const WINDOW_OPTIONS: { key: WindowKey; label: string; short: string }[] = [
  { key: "24h", label: "Last 24 Hours", short: "24H" },
  { key: "7d", label: "Last 7 Days", short: "7D" },
  { key: "30d", label: "Last 30 Days", short: "30D" },
  { key: "all", label: "All Time", short: "ALL" },
];

export function windowLabel(key?: string | null): string {
  return WINDOW_OPTIONS.find((w) => w.key === key)?.label ?? "All Time";
}

export function windowShort(key?: string | null): string {
  return WINDOW_OPTIONS.find((w) => w.key === key)?.short ?? "ALL";
}

export type FreshnessLevel = "live" | "fresh" | "recent" | "stale" | "unknown";

export interface Freshness {
  level: FreshnessLevel;
  label: string;
  /** semantic token classes */
  className: string;
  ageMs: number | null;
}

export function getFreshness(sourceLatestAt?: string | null): Freshness {
  if (!sourceLatestAt) {
    return { level: "unknown", label: "UNVERIFIED", className: "bg-muted text-muted-foreground border-border", ageMs: null };
  }
  const ageMs = Date.now() - new Date(sourceLatestAt).getTime();
  const hours = ageMs / 3_600_000;

  if (hours < 6) {
    return { level: "live", label: "LIVE", className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", ageMs };
  }
  if (hours < 24) {
    return { level: "fresh", label: "FRESH", className: "bg-sky-500/15 text-sky-700 border-sky-500/30", ageMs };
  }
  if (hours < 24 * 7) {
    return { level: "recent", label: "RECENT", className: "bg-amber-500/15 text-amber-700 border-amber-500/30", ageMs };
  }
  return { level: "stale", label: "STALE", className: "bg-destructive/15 text-destructive border-destructive/30", ageMs };
}

export function relativeTime(iso?: string | null): string {
  if (!iso) return "unknown";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "unknown";
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}
