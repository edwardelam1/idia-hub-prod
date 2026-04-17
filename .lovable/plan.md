

## Plan: Fix `anonymization-processor` schema mismatch

### Investigation needed
Need to read the actual `anonymization-processor/index.ts` to confirm where `healthkit_source_bundles` is referenced and what other columns it currently writes. Also verify `staged_health_data` real schema (the file isn't in the listed tree — may be named differently).

### Assumed Changes (pending file read in implementation mode)

**`supabase/functions/anonymization-processor/index.ts`**
1. Remove `healthkit_source_bundles` from the `.insert()` object on `staged_health_data`.
2. Move any source-bundle metadata (e.g. `com.apple.health` identifiers, original payload reference) into the `payload` JSONB field as a nested key: `payload.source_bundle = {...}`.
3. Ensure `payload` is built as a plain JS object (not a pre-stringified string) so the Supabase client serializes it once — prevents "invalid input syntax for type json".
4. Final insert columns limited to: `aca_hash_key`, `activity_type`, `entity_id`, `payload`, `processed_at`, `data_quality_score`.
5. Any health metric fields (steps, heart rate, etc.) currently written as top-level columns get folded into `payload` as well, unless they map to existing schema columns confirmed at implementation time.

### Files Modified
- `supabase/functions/anonymization-processor/index.ts`

### Outcome
- No more `column "healthkit_source_bundles" does not exist` errors.
- Source bundle metadata preserved inside `payload` JSONB for downstream queries.
- Insert payload is a clean object — Supabase handles JSON serialization, eliminating the "invalid input syntax" error.

