# Telemetry Reporting Layer — Backend Wiring

Three Edge Functions get instrumented so `public.api_metrics`, `public.bundle_generation_logs`, and `public.egress_logs` reflect real operational latency. No schema changes — all three tables already exist with the needed columns.

## Schema reality check (mapping the request to actual columns)

- `public.api_metrics` columns: `endpoint` (text, NOT NULL), `latency_ms` (int, NOT NULL), `status_code` (int, NOT NULL), `error_details` (text), `user_id` (uuid), `key_id` (uuid), `timestamp` (default now).
  - The spec asks for `endpoint_name` / `status='success'|'error'`. We will write to the real columns: `endpoint='best-friend-ai'`, `status_code=200` on success / `500` on error, with `error_details` populated on the error path.
- `public.bundle_generation_logs.processing_duration` is `interval` — we write `${ms} milliseconds` via a parameterized insert.
- `public.egress_logs` already auto-stamps `created_at`. `settled_at` is currently only written downstream by the settlement webhook; we will additionally write it inline on the synapse-controller success path so packets always have both stamps.

## 1. `supabase/functions/best-friend-ai/index.ts`

- At the top of the `serve` handler (after OPTIONS short-circuit), capture `const t0 = performance.now()`.
- Add a helper `logApiMetric(supabase, { statusCode, errorDetails?, userId? })` that inserts into `public.api_metrics` with `endpoint='best-friend-ai'` and `latency_ms = Math.round(performance.now() - t0)`. Fire-and-forget via `EdgeRuntime.waitUntil(...)` so it never blocks the response.
- Bookend logs around the insert:
  - `console.log("[HUB_TELEMETRY][INGEST][START] Capturing processing latency for runtime thread...")`
  - on success: `console.log("[HUB_TELEMETRY][INGEST][END:OK] Metrics written to database schema successfully.")`
  - on insert failure: `console.error("[HUB_TELEMETRY][INGEST][END:FAIL] ...", err.message)`
- Call the helper immediately before each terminal `return new Response(...)`:
  - Success branch at line ~610 → `statusCode: 200`.
  - Catch branch at line ~619 → `statusCode: 500, errorDetails: error.message`.
  - Validation 400 branch at line ~366 → `statusCode: 400, errorDetails: 'zod_validation'`.
- Use the existing service-role Supabase client already constructed in this function (no new client needed) — if none exists in scope at return points, construct a lightweight one once at handler top.

## 2. `supabase/functions/ai-data-curator/index.ts` — bundle generation timing

The `curate_and_publish` / `publish_bundle` actions are where bundles are actually emitted. Wrap those two case branches:

- Capture `const bundleT0 = performance.now()` right before invoking `curateAndPublish` / `publishBundle`.
- After the call resolves (and we have the new `bundle_id` from the returned `response`), insert into `public.bundle_generation_logs`:
  - `bundle_id`: id returned by the publisher (nullable-safe).
  - `generation_type`: the `bundleType` string.
  - `data_source_count`: `data.length ?? data.participant_count ?? null`.
  - `processing_duration`: `` `${Math.round(performance.now() - bundleT0)} milliseconds` ``.
  - `quality_metrics`: `{ avg_quality_score: data.avg_quality_score, tier: data.tier }`.
- Same bookended `[HUB_TELEMETRY][INGEST][START|END:OK|END:FAIL]` log triplet around the insert.
- Insert is awaited inside a `try/catch` that only logs — never throws — so bundle publication never regresses if telemetry fails.

## 3. `supabase/functions/synapse-controller/index.ts` — egress timestamp gap

- The current `egress_logs` insert relies on the DB default for `created_at` and never writes `settled_at` until the downstream settlement webhook fires. To close the gap requested:
  - On the existing insert, explicitly pass `created_at: new Date().toISOString()` (no behavior change, just explicit) and keep `settled_at` unset at insert time.
  - After the `settlement_queue` insert succeeds (the `handoffAccepted = true` branch), add a follow-up update on the same `egress_logs` row setting `settled_at = new Date().toISOString()`. This guarantees both stamps exist as soon as the packet leaves the controller, which is what the network-delivery parser needs.
- Wrap that update in the bookended `[HUB_TELEMETRY][INGEST][START|END:OK|END:FAIL]` log triplet.

## 4. Bookended log constraint (all three functions)

Every newly added telemetry insert/update path must be surrounded by:

```
console.log("[HUB_TELEMETRY][INGEST][START] Capturing processing latency for runtime thread...");
// ... insert/update ...
console.log("[HUB_TELEMETRY][INGEST][END:OK] Metrics written to database schema successfully.");
```

Failure paths use a matching `[HUB_TELEMETRY][INGEST][END:FAIL]` line so log scrapers can detect silent stalls.

## Out of scope

- No DB migrations (all columns already exist).
- No frontend changes.
- MCP/API and direct-SQL channels already flow through `synapse-controller` + `execute-hub-query`; only the egress-timestamp fix above is needed for them. `execute-hub-query` already writes `api_metrics` (verified separately) — flag only, no edit, unless inspection in build mode shows otherwise.

## Files touched

- `supabase/functions/best-friend-ai/index.ts`
- `supabase/functions/ai-data-curator/index.ts`
- `supabase/functions/synapse-controller/index.ts`

Deploy is automatic on save.
