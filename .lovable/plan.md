## Diagnosis

The DB has **19,358 staged_health_data rows** (14,234 for the logged-in user, ~1,048,924 steps). Best Friend AI reports "30 rows / 202 steps" because it derives totals from a **post-truncation slice**, not from the database.

Flow in `supabase/functions/best-friend-ai/index.ts`:

1. `fetchOmniRecords` (line 13) hard-caps rows at `MAX_OMNI_ROWS = 5000` — already less than one user's row count.
2. `truncateRecords` (line 512) slices to `MAX_RECORDS_PER_TABLE = 150`, then **iteratively halves** until JSON < 80 KB. With 42 columns per row on `staged_health_data`, this collapses to ~30 rows.
3. `summarizeMarketplaceData` (line 578) then sums `steps_count` **over those ~30 surviving rows** — producing the "202 steps" figure — and the LLM parrots it.

Every other data-consumption path that shows counts to the user does it correctly (`useDashboardStats` uses `count: "exact"`; `marketplace-bundle-access` doesn't summarize row counts; `execute-vault-query` returns whatever the terminal SQL asks for). The problem is scoped to Best Friend AI.

## Fix

Compute the ground-truth aggregates against the database directly, then hand the LLM a **small sample of rows + the true totals**. The LLM must be told to report totals from the aggregates block, never by counting the sample.

### 1. Add an aggregate fetch in `supabase/functions/best-friend-ai/index.ts`

New helper `fetchOmniAggregates(supabase, pseudoId)` that runs, for both `staged_health_data` and `staged_lifestyle_data` scoped to the same `user_id/entity_id/pseudo_user_id` filter used today:

- Row count via `.select("id", { count: "exact", head: true })`
- Sum/avg/min/max for numeric fields relevant to the AI (steps, average_heartrate, data_quality_score, distance, calories) via a lightweight RPC `get_omni_aggregates(pseudo_id uuid)` that returns one JSON row. Prefer an RPC because PostgREST cannot sum columns in a single round-trip. Add it via the migration tool with:
  - `SECURITY DEFINER` (Best Friend AI runs with service role anyway, but the RPC is safer/simpler than N head-count round-trips).
  - `GRANT EXECUTE ... TO service_role` only.
- Date range (min/max `processed_at`).

Return `{ health: {count, totals, range}, lifestyle: {count, totals, range} }`.

### 2. Rewire `Deno.serve` handler (around line 738)

Call `fetchOmniAggregates` in parallel with `fetchOmniRecords`. Keep the row fetch for sampling only — reduce `MAX_OMNI_ROWS` to 500 since the LLM never needed 5000 rows and it was just fueling truncation waste.

### 3. Rewrite `summarizeMarketplaceData` (line 578)

Change signature to `summarizeMarketplaceData(aggregates, sampleHealth, sampleLifestyle)`. Return:

```
{
  health_records: aggregates.health.count,       // TRUE total
  lifestyle_records: aggregates.lifestyle.count, // TRUE total
  step_volume: aggregates.health.totals.steps,   // TRUE total
  average_quality: aggregates.health.totals.avg_quality,
  baseline_hr, max_hr,                            // from aggregates
  sample_size: sampleHealth.length + sampleLifestyle.length,
  date_range: aggregates.health.range,
}
```

### 4. Update `buildOrchestratorPrompt` and the navigation branch (lines 766–777)

Include a `TRUE_TOTALS` block sourced from aggregates and a separate `SAMPLE_ROWS` block sourced from the truncated slice. Add one line to both `STORE_CLERK_PERSONA` and the orchestrator prompt:

> "When reporting counts, sums, averages, or ranges, use the TRUE_TOTALS block. The SAMPLE_ROWS block is a preview of individual records and is NOT representative of totals."

### 5. Keep `truncateRecords` for the sample block only

No change to its behavior — it still exists to keep the LLM payload under the token limit for the sample preview. It just no longer feeds the totals.

## Files touched

- `supabase/functions/best-friend-ai/index.ts` — new `fetchOmniAggregates`, rewired handler, rewritten `summarizeMarketplaceData`, prompt tweaks.
- New migration: `create function public.get_omni_aggregates(pseudo_id uuid) returns json ...` with `SECURITY DEFINER`, `set search_path = public`, and `GRANT EXECUTE ... TO service_role`.

## Out of scope

- `useHealthMetrics.tsx` calls a non-existent `/api/v1/health/metrics` endpoint (falls back to `VITE_API_BASE_URL` which isn't set). That's a separate broken hook, not the "30 rows" bug — flag but do not fix here unless you want it included.
- Marketplace bundle purchase, execute-hub-query, execute-vault-query — verified they don't produce the wrong totals reported.

## Verification

After deploy, ask Best Friend AI "how many records do I have and what's my total step count?" — it should report ~14,234 records and ~1,048,924 steps for the logged-in user, sourced from the aggregates block.