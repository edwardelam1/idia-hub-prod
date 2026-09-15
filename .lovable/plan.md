# One bundle per dataset, priced by the data itself

## The problem (confirmed in the live catalogue)

Every dataset and time window currently appears three times — the same 16,271 biometric records are sold as Analyst (99 CR), Professional (124 CR) and Enterprise (149 CR). Identical data, three prices.

The cause: bundle generation loops over three tiers for every window, and the price formula multiplies the data-derived cost by a tier multiplier (1.0 / 1.25 / 1.5). So the tier, not the data, sets the last word on price.

## What changes

**One listing per dataset per window.** Generation stops creating a row per tier. For biometric data that means four listings (24 hours, 7 days, 30 days, all time) instead of twelve.

**Price comes only from the data.** The credit cost is derived from how much of the dataset a buyer would have to consume through Best Friend AI or an SQL query: number of records divided by how many rows one query returns, times the per-query credit rate for that data sector, adjusted by measured data quality. No tier multiplier anywhere.

**The tier badge becomes a size label.** It stays visible and filterable, but it is decided by record volume alone (Analyst for small sets, Professional for mid, Enterprise for large) and has no effect on price. Two listings can never share a dataset and window.

**Existing duplicates are cleaned up.** For each dataset and window, the listing with the richest title, description and insights is kept, repriced under the new formula and given the correct size label; the other two are retired. Nothing is deleted outright.

**Repeat runs stay stable.** A uniqueness rule on dataset plus window prevents duplicates from reappearing, and the regular refresh updates the single surviving listing in place instead of adding siblings.

## Technical detail

- `supabase/functions/_shared/window-bundle-runner.ts`: drop the `TIERS` loop; emit one curator payload per (category, window) above the minimum record floor. Derive `tier` from `totalRecords` via a size band and pass it through as a label. Stale-key set becomes `category|window_key`.
- `supabase/functions/_shared/bundle-pricing.ts`: remove `TIER_MULTIPLIERS` from the price calculation; `price = ceil(chatEquivalents × perChatFeeCR × qualityFactor)`, anchored to the same `SECTOR_VALUES` × buyer-weight rate `synapse-controller` charges per query. Keep returning the breakdown so the card can explain the cost.
- `supabase/functions/ai-data-curator/index.ts`: `lookupBundle` matches on (category, window_key) only, so refreshes update the single row. Remove the tier line from the AI pricing prompt so copy never suggests tier-based money.
- Migration: retire the non-richest duplicates (`is_active = false`), recompute `price` on survivors from `data_json.record_count`, set the size label, and add a partial unique index on `(category, window_key) WHERE is_active`.
- Frontend needs no contract change — `tier` stays on the bundle row. The collapsed card keeps showing the badge, record count and credit cost.

## Verification

Re-query the catalogue after the migration: each (category, window) pair returns exactly one active row, and the biometric 30-day listing shows a single credit price traceable to 16,271 records rather than three tier prices.
