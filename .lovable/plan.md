

## Investigation needed

The user pasted a snippet that exists in `best-friend-ai/index.ts` (or a variant) — the omni-fetch via `runVerificationLoop`. They say the AI queries 1 record but multiple records exist across tables. I need to:

1. Read current `best-friend-ai/index.ts` to confirm the snippet location and see `runVerificationLoop` definition.
2. Check `staged_health_data`, `staged_lifestyle_data`, `staged_data` row counts for the user's pseudoId.
3. Identify why only 1 record returns: likely `runVerificationLoop` only queries one table OR uses `.single()`/`.limit(1)` OR filters by wrong column (e.g. `pseudo_user_id` vs `entity_id`), OR the pseudoId passed is the raw user_id but the table stores `generate_pseudonym(user_id)`.

## Likely root cause

`runVerificationLoop` probably:
- Queries only `staged_health_data` (misses `staged_lifestyle_data`, `staged_data`, `raw_health_data`)
- Filters with `pseudo_user_id = pseudoId` while frontend sends raw `user_id` — should hash via `generate_pseudonym()` first, or query by `entity_id` (raw uuid)
- Or has a `.limit(1)` / `.single()` left over

Also note: `sourceLifestyle` is never overridden by the audit — only `sourceHealth = audit.data`. So lifestyle records from DB are never fetched.

## Plan

### 1. Fix `runVerificationLoop` in `supabase/functions/best-friend-ai/index.ts`
- Query BOTH staging tables in parallel:
  - `staged_health_data` filtered by `pseudo_user_id = generate_pseudonym(pseudoId)` OR `entity_id = pseudoId` (use OR / two queries)
  - `staged_lifestyle_data` filtered by `entity_id = pseudoId` OR `user_id = pseudoId`
  - Optionally `staged_data` for reward-tagged rows
- Remove any `.single()` / `.limit(1)`; cap with `.limit(500)` per table.
- Return `{ success, health: [...], lifestyle: [...] }` instead of a single `data` array.

### 2. Update the omni-fetch block
```ts
if (pseudoId) {
  const audit = await runVerificationLoop(supabase, pseudoId);
  if (audit.success) {
    if (audit.health.length > 0) sourceHealth = audit.health;
    if (audit.lifestyle.length > 0) sourceLifestyle = audit.lifestyle;
    console.log(`[HUB_ANALYST] DB override: ${audit.health.length} health, ${audit.lifestyle.length} lifestyle records.`);
  }
}
```

### 3. Add diagnostic logging
- Log the resolved pseudoId, the pseudonym hash, and per-table row counts so future "1 record" issues are obvious in the function logs.

### 4. Verify against live data
- Run `supabase--read_query` on `staged_health_data` and `staged_lifestyle_data` for the current user to confirm the new query returns the expected count, then deploy.

### Files Modified
- `supabase/functions/best-friend-ai/index.ts` — rewrite `runVerificationLoop` + override block.

### Outcome
- AI receives every relevant row across `staged_health_data` + `staged_lifestyle_data` (and `staged_data` if useful), not just 1.
- Lifestyle source is also overridden from DB, not silently dropped.
- Logs make the row counts visible per table for future debugging.

