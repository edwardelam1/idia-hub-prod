# Marketplace Bundles: mobile-first, readable, fresh, self-updating

## What I found (verified)

- Only **3 active bundles** exist, all in one category (`health.biometric`, tiers Analyst/Professional/Enterprise). Every one reports the same `record_count` of 30,346.
- The 6-hourly `seed-marketplace-catalog` cron **is** running and succeeding, and the curator **is** updating rows (`bundle_version` is at 6 and 7) — but `marketplace_bundles.updated_at` is never touched (no trigger, and the update payload omits it). So the catalog *looks* a week+ stale in the UI even when it is rewritten every 6 hours.
- Bundle stats come from `get_staging_aggregates()`, which aggregates **all time** with no date window. That's why the numbers never move and there is no notion of freshness or of 1-week / 1-month slices.
- Source ingestion itself has gone quiet: the newest `staged_health_data` row is from **Aug 22** (522 rows in the last 7 days, 6,624 in the last 30). A freshness indicator will surface this honestly instead of hiding it.
- `BundleCard` truncates with `line-clamp` and renders dead `+N` badges (no click handler, no detail view) for data points and features. Sizing is driven by `isMobile`/`isTablet` string swaps rather than a responsive layout.

## 1. Freshness is real data, not a label

Add to `marketplace_bundles`:

- `window_key` (`24h` | `7d` | `30d` | `all`)
- `window_start`, `window_end` — the actual pull window
- `source_latest_at` — newest source record inside the window
- `generated_at` — when the stats snapshot was computed
- `stat_fingerprint` (jsonb) — record count, contributors, avg quality, activity mix

Add an `updated_at` trigger so every write moves the timestamp.

Rewrite `get_staging_aggregates()` into a windowed version returning one row per (source, category, window), including `source_latest_at` and the fingerprint.

## 2. Bundles refresh on data change, not on a clock

The 6-hour cron stays as the *check*; publishing becomes conditional. For each (category, tier, window) the generator compares the new fingerprint to the stored one and republishes only when the data has materially moved:

- record count changes by more than 1% or 100 rows
- distinct contributors change at all
- avg quality shifts by more than 0.02
- activity-mix distribution shifts (L1 distance) by more than 5%
- `source_latest_at` advances

Nothing material changed → no version bump, no fake "updated" signal; only `generated_at`/`source_latest_at` refresh. Historical windows (24h / 7d / 30d / all-time) come out of the same pass, so 1-week and 1-month bundles exist because the window has data, not because a window was hardcoded into the catalog.

Windows with too few records for a tier are skipped, and bundles whose window goes empty are deactivated rather than left showing dead numbers.

## 3. Freshness indicator in the UI

Each card gets a freshness chip driven by `source_latest_at` vs. now:

```text
LIVE      < 6h      green
FRESH     < 24h     blue
RECENT    < 7d      amber
STALE     >= 7d     red
```

Plus a plain line: "Pulled <window> · newest record <relative time> · snapshot <relative time>", and a window badge (24H / 7D / 30D / ALL). Filters gain a window selector so buyers can pick a real-time slice or a historical one.

## 4. Nothing is unreadable

- Description and insights: no permanent clamp — a "Show more / Show less" toggle expands in place.
- `+N` badges become buttons that expand the full list inline (and remain readable on a phone).
- Every card gets a "View details" action opening a full sheet: complete title, full description, all key insights, all data points, all features, suggested filters, freshness/window metadata, contributor and record counts, pricing breakdown.

## 5. Mobile-first layout

- Single-column grid on phones, two columns from `lg`, driven by Tailwind breakpoints instead of `isMobile ? … : …` string swaps.
- Title wraps instead of clamping; price and tier badges wrap rather than overflow; long numbers get `tabular-nums` and no horizontal scroll.
- Full-width tap targets (min 44px) for the primary action and à-la-carte entry.
- The marketplace tool tiles, filter bar and results header collapse cleanly to one column with a horizontally scrollable tile row.
- Verified on a 390px viewport before finishing.

## Technical notes

- Migration: new columns + `updated_at` trigger + backfill of `window_key='all'` for existing rows; rewritten `get_staging_aggregates()` (windowed) with the required `GRANT`s.
- `supabase/functions/create-health-data-bundle`, `create-lifestyle-bundles`, `create-business-intelligence-bundles`: iterate windows, compute the fingerprint, and short-circuit when unchanged.
- `supabase/functions/ai-data-curator`: `publishBundle` keys the lookup on (category, tier, window_key), persists window/freshness/fingerprint fields, and skips the AI copy call entirely when the fingerprint is unchanged (saves tokens and stops title churn).
- `src/hooks/useMarketplaceBundles.tsx`: surface the new fields; keep the read-only contract.
- `src/components/marketplace/BundleCard.tsx` + a new `BundleDetailSheet.tsx`: expandable text, functional `+N`, freshness chip, responsive layout.
- `src/components/marketplace/DataMarketplace.tsx` / `MarketplaceFilters.tsx`: window filter, mobile-first grid.
- Golden Rule holds: all counts come from real staging aggregates; no synthetic rows are ever written.
