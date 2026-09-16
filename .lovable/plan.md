# Best Friend AI: read every staged row, every table

Today the assistant does not actually see everything when asked. Three concrete gaps, confirmed in the code:

1. **Vehicle data is skipped entirely in marketplace mode.** The cross-owner scan reads only the health and lifestyle staging tables. Ford vehicle telemetry — which is ecosystem-wide, not per-user — is never scanned for consent references, never sampled, and never counted in the marketplace totals.
2. **A hard ceiling on rows.** The scan walks pages of 1,000 rows and stops after 75 pages. Beyond ~75,000 rows per table the rest is silently ignored. Health staging already holds 46,800+ rows and grows daily.
3. **Personal (marketplace off) mode reads only the newest 500 rows per table**, and also skips vehicle data rows.

## Scope rule this locks in

Everything staged, from every contributor, is the ecosystem-wide view: trading interface tools, data marketplace tools, and Best Friend with marketplace enabled all read the entire staged pool regardless of owner. The single exception is Best Friend with marketplace disabled, which is the only personal, owner-scoped view.

## What changes


- **Totals come from the database, not from walking rows.** Counts, sums, averages, date ranges and the distinct consent-reference list are computed by the database in one set-based answer per table, so there is no page limit and no row ceiling — the answer covers 100% of rows however large the tables get.
- **Vehicle telemetry is included everywhere** the other two staging tables are: consent references, contributor resolution, marketplace totals, sample rows shown to the model, and the personal-mode view.
- **Row samples stay samples.** The model still receives a bounded, balanced set of example rows (the prompt cannot hold 46,000 rows), but every number it states — record counts, sums, contributor counts, consent references — comes from the full-table figures, not the sample. The receipt keeps carrying the complete consent reference set.
- **Personal mode** keeps a bounded row sample but reports full-table counts and totals for that person, across all three staging tables.

## Technical notes

- New database functions (SECURITY DEFINER, STABLE, granted to `service_role`):
  - `public.staged_aca_hashes()` — distinct `aca_hash_key` plus source table across `staged_health_data`, `staged_lifestyle_data`, `staged_ford_data`. Replaces the paged `collectStagedAcaHashes` scan.
  - `public.staged_marketplace_aggregates()` — per-table count, metric sums/averages, distinct event types/categories, Ford metric types/vehicles, and min/max `processed_at`. Replaces `fetchMarketplaceAggregates`'s two client-side page loops.
  - `public.staged_user_aggregates(_pseudo_id text)` — same shape scoped to one operator across all three tables (Ford stays ecosystem-wide per existing policy), backing the personal path alongside the existing `get_omni_aggregates`.
- `supabase/functions/best-friend-ai/index.ts`:
  - `collectStagedAcaHashes` → single `rpc("staged_aca_hashes")`; `MARKETPLACE_MAX_HASH_PAGES` and the page loops are removed.
  - `fetchMarketplaceRecords` gains a `staged_ford_data` branch for contributor registration, receipt hashes, and `fetchBalancedRowsForReceipt`; `MarketplaceFetchResult` gains `ford: any[]`; the widened union type replaces the two-table literal union.
  - `fetchMarketplaceAggregates` → single `rpc("staged_marketplace_aggregates")`, returning `health`/`lifestyle`/`ford` in the existing `OmniAggregates` shape.
  - `fetchOmniRecords` adds `staged_ford_data` (unscoped, ecosystem-wide) and keeps `MAX_OMNI_ROWS` as an explicit *sample* bound, with counts sourced from the aggregate RPC.
  - The prompt-context builder is updated to state that sample rows are illustrative and that all quoted figures come from full-table aggregates, including the Ford block.
  - Every new fetch/mapping step brackets `[PHASE_START]`/`[PHASE_END]` with the resolved counts; every catch logs the error message and stack.
- Deploy `best-friend-ai` after the migration. No change to pricing, the Synapse Controller, or receipt/settlement behaviour.
