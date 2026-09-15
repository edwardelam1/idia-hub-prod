# Diverse bundles + honest tier filters

## What's actually happening now

- There are exactly four live listings, all from one data stream: Apple Health biometrics, at 24h / 7d / 30d / all-time.
- Every one is labelled "Enterprise" because the label is a size band and all four windows hold more than 1,000 records (1,348 / 11,330 / 16,271 / 45,637). Nothing is hardcoded there — there is simply no smaller dataset to produce an Analyst or Professional listing.
- The other three staging tables (lifestyle, business, vehicle) are empty, so the generator correctly produces nothing for them.
- The filters popup is hardcoded: the green "Analyst" pill and the "Available: Analyst tier filters" line come from a fixed role-to-tier map, not from the bundles actually on offer.
- A scheduled refresh already exists and runs every 6 hours, watching all four staging tables. A second 24-hour job would duplicate it.

## What we'll change

### 1. Split the health stream into real, distinct bundles

All 46,235 health records are currently lumped into a single category. The records actually carry eleven different measurement streams. We'll group them into meaningful datasets so the marketplace offers genuinely different products:

- Movement & Gait — steps, walking speed, step length, double support, walking asymmetry
- Energy Expenditure — active and basal calories
- Cardiac — heart rate, heart-rate variability
- Environmental Exposure — ambient noise
- Lifestyle Signals — everything else

Each of these gets its own listing per time window, priced from its own record count. Smaller streams (cardiac, environmental) fall into the Analyst and Professional size bands naturally, so the catalogue stops being all-Enterprise. Expected result: roughly 12-18 live listings across the three size labels instead of 4.

### 2. Make the filter popup truthful

- The tier pill and the "Available tiers" line read from the tiers actually present in the live catalogue, not a fixed list.
- If only one size band exists, only that one shows.
- Role-based restriction stays, but it can never advertise a tier that has no bundles behind it.

### 3. Scheduling

Keep the existing 6-hour refresh — it already picks up new data from all four staging tables and creates listings once a window passes the minimum record floor. No new cron job. (If you'd rather it ran exactly daily, say so and we'll change the schedule instead of adding a second one.)

### 4. Regenerate

Run the catalogue generator once after the change so the new listings appear immediately; the four current all-Enterprise rows are retired automatically by the existing stale-listing sweep.

## Technical notes

- `public.get_staging_aggregates_windowed()` is rewritten so the health CTE maps `activity_type` onto the five domain categories above via a `CASE`, instead of `'health.' || faculty`. Lifestyle, business and vehicle CTEs are untouched.
- `_shared/window-bundle-runner.ts` needs no change: it already emits one payload per `(category, window)` and derives the size label from `resolveSizeLabel(totalRecords)`. More categories in, more bundles out.
- `MIN_RECORDS` stays at 10, so thin streams (hrv: 26 rows) still list where they clear the floor per window.
- `FilterModal.tsx`: `filterAccess` becomes the intersection of the role map with `dynamicFilters.tiers` (already derived from live bundles by `useDynamicFilters`); the hardcoded `<Badge>Analyst</Badge>` section header becomes driven by the same list.
- Existing partial unique index on `(category, window_key) WHERE is_active` keeps one listing per dataset per window.
- Generation is triggered by invoking `seed-marketplace-catalog` once after the migration.
