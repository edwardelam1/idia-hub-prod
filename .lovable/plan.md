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

### 2. Stop the duplicate explosion (no upserts)
- In `ai-data-curator`'s publish path, look up the existing active bundle for that (category, tier) first. If one exists, issue an explicit `UPDATE` of its counts, copy and price. If none exists, issue an `INSERT`. Two distinct statements — no upsert, no `ON CONFLICT`.
- Deactivate the existing 345 duplicates: keep the newest bundle per (category, tier) and set `is_active = false` on the rest, via migration.
- Remove the auto-seed-on-empty side effect in `useMarketplaceBundles` (or keep it gated to admins only) so browsing the Marketplace never mutates the catalog.

### 3. Truthful card labels
In `BundleCard` / `DataMarketplace` mapping:
- Show **records** from `data_json.record_count` and **contributors** from `participant_count` as two distinct stats with correct labels.
- Drop the hardcoded-looking `100% relevance` badge when `match_percentage` isn't a real computed value, or compute it from filter overlap.

### 4. Pricing derived from Best Friend chat equivalence

Prices currently come from free-form AI output, which is why identical datasets cost 2,600 vs 4,200 CR. Replace with a deterministic formula anchored to what the same information already costs through Best Friend AI.

The per-query cost already lives in `synapse-controller.calculateDynamicFee`:

```text
feeCR (one query / one chat) = ceil(1 * SECTOR_VALUES[sector] * buyerWeight)
```

`SECTOR_VALUES` runs 1.0 (general/primary) to 2.5 (quinary); `buyerWeight` defaults to 1.0. One Best Friend chat surfaces at most `MAX_OMNI_ROWS = 500` rows of context. So the honest bundle price is "how many chats would it take to see this dataset":

```text
chatEquivalents = ceil(record_count / 500)
basePrice       = chatEquivalents * ceil(SECTOR_VALUES[sector] * buyerWeight)
bundlePrice     = ceil(basePrice * tierMultiplier * qualityFactor)
```

- `tierMultiplier`: Analyst 1.0, Professional 1.25, Enterprise 1.5 — licensing breadth, not extra rows.
- `qualityFactor`: `0.75 + (avg_quality_score * 0.25)` — perfect-quality sets pay full freight, weak ones are discounted.
- Sector resolution reuses the same shared `SECTOR_VALUES` module the controller uses, so Marketplace and chat pricing can never drift.

At today's real numbers (30,216 health records, general sector, quality 1.0): 61 chat-equivalents → 61 CR Analyst, 77 CR Professional, 92 CR Enterprise — instead of the fictional 2,600–4,200 CR.

The pricing helper goes in `supabase/functions/_shared/` so every builder imports the same code. The AI curator keeps writing title, description, insights and features only; any `price` it returns is ignored.

### 5. Verify
- Re-run seeding, then query `marketplace_bundles` to confirm: one bundle per (category, tier), `record_count = 30,216`, `participant_count = 9`, prices matching the formula above.
- Re-run seeding a second time and confirm the row count stays flat (update path, not insert).
- Load the Marketplace and confirm the card reads "30,216 records · 9 contributors" and that the catalog count no longer grows on refresh.

## Note
Because the lifestyle and business staging tables are empty, only health bundles will exist after the cleanup — that is the truthful state, consistent with the Golden Rule (no synthetic data).
