
## Goal
Populate the IDIA Data Marketplace "Available Datasets" grid with the bundles that already exist in the backend layer. Today the UI shows nothing because:

1. `marketplace_bundles` table has **0 rows** (verified).
2. `useMarketplaceBundles` hook returns `[]` without ever querying Supabase.
3. The hook also reads `bundle.contacts_count`, but the table column is actually `participant_count` — so even if rows existed they would mis-map.
4. `ai-data-curator` edge function generates bundle metadata via Gemini, but never persists it. `create-health-data-bundle` is an empty file.

Per the Golden Rule (no synthetic/simulated data in production tables), we will not hand-fabricate datasets. Instead we will (a) wire the UI to the real table, and (b) wire the existing AI-curator edge function so it actually writes its output into `marketplace_bundles`, then trigger one curation run so the catalog is populated from the live data the curator has access to.

## Plan

### 1. Fix the read path (UI ↔ DB)
File: `src/hooks/useMarketplaceBundles.tsx`
- Replace the stub `return []` with a real query:
  ```ts
  supabase
    .from('marketplace_bundles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  ```
- Map DB column `participant_count` → interface field `contacts_count` so existing UI (`DataMarketplace.tsx`, `BundleCard`) keeps working without UI changes.
- Keep the 30s `refetchInterval` so newly curated bundles surface live.

### 2. Make the curator persist its output
File: `supabase/functions/ai-data-curator/index.ts`
- Add a new action `publish_bundle` that takes the curated metadata (title, description, key_insights, features, suggested_filters, tier, recommended_price, category, data_json, participant_count, match_percentage, bundle_category, data_fusion_level) and inserts a row into `marketplace_bundles` with `is_active=true`, `bundle_version=1`.
- Add a convenience action `curate_and_publish` that runs `analyze_data` → `curate_bundle` → `recommend_pricing` → insert in one call, so a single invocation produces a publishable bundle.
- Use the existing service-role client already created in the function. CORS unchanged.

### 3. One-time catalog backfill (no fabricated data)
File: new `supabase/functions/seed-marketplace-catalog/index.ts` (admin-only, `verify_jwt = true`)
- Pulls live, anonymized aggregates from existing pipeline tables (`universal_data_bundles`, staged lifestyle data already produced by `process-lifestyle-data`). No invented records.
- For each distinct `bundle_category` present in `universal_data_bundles`, calls `ai-data-curator` action `curate_and_publish` to produce one Analyst, one Professional, and one Enterprise tier entry, sized & priced from the real underlying aggregates per the Marketplace bundle pricing tiers memory (Analyst 300–500 CR, Professional 500–2000 CR, Enterprise 2000–5000 CR).
- If `universal_data_bundles` is empty, the function returns `{ seeded: 0, reason: "no source aggregates yet" }` rather than fabricating rows. (Honors the Golden Rule.)

### 4. Column-name alignment
Don't migrate the table — we only need the UI hook to translate `participant_count` ↔ `contacts_count`. No schema change.

### 5. Trigger initial population
After deploy, invoke `seed-marketplace-catalog` once from the admin client. Whatever real aggregates exist will produce real bundles. The Marketplace grid will then render them via the now-live hook.

## Files touched
- `src/hooks/useMarketplaceBundles.tsx` — real query + column rename
- `supabase/functions/ai-data-curator/index.ts` — add `publish_bundle` + `curate_and_publish` actions
- `supabase/functions/seed-marketplace-catalog/index.ts` — new admin function
- `supabase/config.toml` — register new function

## What this does NOT do
- Does not insert hand-written/mock bundles. If `universal_data_bundles` has no aggregates yet, the marketplace stays empty until the upstream pipeline produces them — which is the correct behavior under the Golden Rule.
- Does not change `BundleCard`, `MarketplaceFilters`, or any UI component. The shape consumed by `DataMarketplace.tsx` is preserved by the hook's mapping layer.

## Verification after build
1. `select count(*) from marketplace_bundles where is_active` > 0 once seeded.
2. `/marketplace` route shows BundleCards with real titles/tiers/prices.
3. Hook returns `contacts_count` populated from `participant_count`.
