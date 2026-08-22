# Fix two dead indicators on the Protocol Stream dashboard

Two of the five pipeline lights never fire. Confirmed causes from the live database:

## 1. Apple Health Sync (never fires)

The dashboard listens to inserts on `raw_health_data`. That table has **0 rows** — ingestion actually writes to `staged_health_data` (30,843 rows, newest 2026-08-22 03:34 UTC). `staged_health_data` is also **not** in the `supabase_realtime` publication, so nothing is broadcast today.

Fix:
- Migration: add `public.staged_health_data` to the `supabase_realtime` publication and set `REPLICA IDENTITY FULL` on it.
- Point the Apple Health listener at `staged_health_data` (keep the existing `raw_health_data` listener as a harmless fallback).

## 2. Royalty Payment (never fires)

The dashboard checks `entry_type === "ROYALTY"`. No such value exists in `synapse_credit_ledger`. Royalty rows are stored as `entry_type = 'deposit'`, `transaction_type = 'idia_royalty_yield'` (91 rows). Payout rows use `transaction_type = 'data_sale_payout'`.

Fix:
- Match on `transaction_type` in (`idia_royalty_yield`, `data_sale_payout`) case-insensitively for the Royalty light.
- Make the Synapse Engine check case-insensitive too (`USAGE`/`usage` both exist in the data).

## Also worth knowing (no code change unless you want it)

Realtime respects RLS: both tables only expose rows where `user_id = auth.uid()` to a signed-in user. So the dashboard lights up for **your own** activity only. `staged_health_data` additionally has an authenticated-read-all policy, so health ingest from any user will pulse. If you want the ledger lights to reflect ecosystem-wide activity, that needs a separate decision (broadcast channel or a non-PII aggregate feed) — not part of this fix.

## Technical detail

Files touched:
- new migration — publication + replica identity for `staged_health_data`
- `src/components/system/SystemHealthDashboard.tsx` — listener table + normalized matching
- `src/hooks/usePipelineActivity.tsx` — same two corrections so the pipeline monitor agrees (it currently keys off `transaction_type === "FEE"`, which also never matches; real value is lowercase `fee`)
