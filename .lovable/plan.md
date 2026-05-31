## Plan

1. Update `supabase/functions/synapse-controller/index.ts` to remove the raw `fetch()` handoff block and replace it with a single `adminClient.from('settlement_queue').insert({ reference_id, payload: payoutData })` handoff.
2. Keep the existing `handoffAccepted` gate so `egress_logs.synapse_ledger_entry_id` is linked only after the queue write succeeds, preserving the orphan-audit behavior on handoff failure.
3. Update `supabase/functions/idia-circular-settlement/index.ts` to unwrap webhook payloads via `rawBody.record ? rawBody.record.payload : rawBody`, while still accepting direct/manual invocations for testing.
4. Verify or add the `settlement_queue` database structure with the fields already reflected in generated types (`id`, `reference_id`, `payload`, `status`, `created_at`). If anything is missing in the actual schema, add it via a Supabase migration rather than an ad hoc code-only assumption.
5. Wire a Postgres-driven webhook/trigger so inserts into `settlement_queue` call `idia-circular-settlement` with the inserted row as the webhook `record`, following the project’s existing `net.http_post` / database-trigger pattern.
6. Validate the end-to-end flow with a fresh manual test: `synapse-controller` should finish after queue insert, `idia-circular-settlement` should log `ACCEPTED` from the webhook path, and the settlement trace should continue without the parent-isolate `EarlyDrop` pattern.

## Technical details

- `synapse-controller` currently constructs `payoutData` and sets `handoffAccepted` around the existing handoff block, so the replacement is a surgical swap in that same section.
- `idia-circular-settlement` currently parses `await req.json()` directly and validates `total_fiat_amount` / `contributing_users` from the top-level body; this needs a small wrapper-aware parse step at the top of the HTTP handler.
- The generated Supabase types already include `settlement_queue`, but there is no matching migration in the repo, so implementation should confirm the live schema instead of assuming repo parity.
- The webhook should preserve the queue row for auditability; no destructive dequeue behavior should be added unless explicitly requested later.