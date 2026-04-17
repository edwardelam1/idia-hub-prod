

## Plan: Restore `anonymization-processor` as the canonical handler, delete `anonymize-and-stage-data`

### Investigation
- Last turn I edited `anonymize-and-stage-data` thinking it was the live function. User confirms the **canonical function is `anonymization-processor`** — it's the one `apple-health-sync` calls and writes to `staged_health_data`.
- `anonymize-and-stage-data` was supposed to be deleted but still exists.
- DB function `direct_life_anonymization_trigger()` already calls `/functions/v1/anonymization-processor` — confirms that's the live endpoint.
- The schema fix (only 6 columns, payload JSONB) needs to live in `anonymization-processor`, not the orphan file.

### Changes

**1. `supabase/functions/anonymization-processor/index.ts`**
- Read current file to confirm what `apple-health-sync` posts to it (field names like `raw_payload`, `step_count`, `recorded_at`, `user_id`, `raw_data_id`).
- Apply the same schema-correct insert logic:
  - Build `payload` as a plain JS object containing: `health_metrics`, `source_bundle` (com.apple.health identifiers), `device_type`, `source`, and any Strava extras.
  - Insert ONLY: `aca_hash_key`, `activity_type`, `entity_id`, `payload`, `processed_at`, `data_quality_score`.
  - No `JSON.stringify` on payload — let Supabase client serialize once.
- Preserve the existing `data_processing_queue` status update + `raw_health_data.processed=true` flagging that this function does (whatever the current file has).

**2. Delete `supabase/functions/anonymize-and-stage-data/`**
- Remove the directory and call `supabase--delete_edge_functions` to undeploy it.

**3. Deploy `anonymization-processor`**
- Use `supabase--deploy_edge_functions` so the fix is live immediately.

### Files Modified
- `supabase/functions/anonymization-processor/index.ts` — rewrite insert logic
- `supabase/functions/anonymize-and-stage-data/index.ts` — delete

### Outcome
- `anonymization-processor` (the real handler `apple-health-sync` talks to) inserts only valid columns.
- No more `healthkit_source_bundles` or "invalid input syntax for type json" errors on the live pipeline.
- Orphan `anonymize-and-stage-data` removed from codebase and Supabase.

