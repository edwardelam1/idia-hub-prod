# Fix untruthful marketplace bundles

## What's actually wrong (verified against the live database)

The Marketplace is connected to real data — no mock data — but the numbers it publishes are wrong in three separate places.

1. **Record counts are capped at 1,000.** `staged_health_data` actually holds **30,216 rows from 9 distinct contributors**. The bundle builder (`create-health-data-bundle`) does a plain `select` with no pagination, so PostgREST returns only the first 1,000 rows. Every bundle therefore stores `record_count: 1000` and `unique_users: 2` (only 2 distinct users appear inside that first page).

2. **"2 records" on the card is a mislabeled field.** `BundleCard` renders `bundle.contacts` — which maps to `participant_count` (contributor count) — with the label "records". So the card shows the participant number (2) next to a title that brags about 1,000 records.

3. **345 duplicate bundles.** There are **345 active bundles, all in the single category `health.biometric`, all with distinct AI-written titles and randomly varying prices (2,600–4,200 CR)**. Seeding has no dedupe or upsert, so every run of `seed-marketplace-catalog` (including the auto-seed on Marketplace load) appends a fresh AI-titled clone of the same dataset. `staged_lifestyle_data` and `staged_business_data` are both empty, which is why only one category exists.

## Plan

### 1. True counts in the bundle builders
In `create-health-data-bundle`, `create-lifestyle-bundles`, and `create-business-intelligence-bundles`:
- Replace the unbounded `select` with an exact `count` query (`select('...', { count: 'exact', head: true })`) for the total, and a paginated scan (or a dedicated aggregate RPC) to compute distinct contributors and average quality across all rows, not just the first page.
- Preferred: add a Postgres aggregate function (e.g. `public.get_staging_aggregates()`) returning per-category `total_records`, `distinct_contributors`, `avg_quality` in one pass — one round trip, no 1,000-row ceiling.
- Pass the true totals into the curator payload so `data_json.record_count` and `participant_count` are honest.

### 2. Stop the duplicate explosion
- Add a deterministic bundle key (category + tier) and **upsert** instead of insert in `ai-data-curator`'s publish path, so a re-seed refreshes the existing bundle's counts rather than creating a new one.
- Deactivate the existing 345 duplicates: keep the newest bundle per (category, tier) and set `is_active = false` on the rest, via migration.
- Remove the auto-seed-on-empty side effect in `useMarketplaceBundles` (or keep it gated to admins only) so browsing the Marketplace never mutates the catalog.

### 3. Truthful card labels
In `BundleCard` / `DataMarketplace` mapping:
- Show **records** from `data_json.record_count` and **contributors** from `participant_count` as two distinct stats with correct labels.
- Drop the hardcoded-looking `100% relevance` badge when `match_percentage` isn't a real computed value, or compute it from filter overlap.

### 4. Pricing consistency
Prices currently come from free-form AI output, which is why identical datasets cost 2,600 vs 4,200 CR. Replace with a deterministic formula from the tier matrix (Analyst / Professional / Enterprise) plus record volume, and let the AI write copy only.

### 5. Verify
- Re-run seeding, then query `marketplace_bundles` to confirm: one bundle per (category, tier), `record_count = 30,216`, `participant_count = 9`.
- Load the Marketplace and confirm the card reads "30,216 records · 9 contributors" and that the catalog count no longer grows on refresh.

## Note
Because the lifestyle and business staging tables are empty, only health bundles will exist after the cleanup — that is the truthful state, consistent with the Golden Rule (no synthetic data).
