## Finding

The prior fix did not solve it because `fetchMarketplaceRecords()` still does this:

```text
staged_health_data order by processed_at desc limit 500
```

Your database does have cross-user staged health data:

- `staged_health_data`: 19,358 rows
- Distinct staged ACA hashes: 76
- Distinct resolved contributors in staged health: 5
- `user_aca_records`: 203 ACA records across 15 platform GUIDs

But the newest 500 staged health rows are all from one contributor, so the receipt only contains one owner and `settlement_queue.contributing_users` stays `[you]`.

## Plan

1. **Replace the date-only marketplace sample**
   - Stop relying on `order(processed_at desc).limit(500)` as the payout source.
   - Build a contributor-balanced marketplace sample instead.

2. **Resolve owners through `user_aca_records`, not staged row owner fields alone**
   - Use `aca_hash_key` as the canonical lineage key.
   - Join/lookup each staged hash against `user_aca_records.aca_hash_key → platform_guid`.
   - This avoids the current problem where `pseudo_user_id` is null and staged row ordering hides other owners.

3. **Guarantee one receipt entry per real contributor**
   - Build `consumedReceipt` from representative ACA hashes grouped by resolved `platform_guid`.
   - If 5 contributors have staged health rows, the receipt should include at least 5 hashes.
   - Keep personal `BEST_FRIEND_AI_CHAT` self-only.

4. **Keep LLM sample separate from payout receipt**
   - The AI can still receive a capped sample for context.
   - Payout fan-out should be based on the contributor-balanced lineage set, not the truncated prompt rows.

5. **Add explicit diagnostics**
   - Log marketplace candidate hashes, resolved contributor count, final receipt count, and skipped unresolved hashes.
   - This makes the next settlement auditable from Edge Function logs.

6. **Deploy and verify**
   - Deploy `best-friend-ai`.
   - Run one marketplace query.
   - Confirm the new `settlement_queue` row has `contributing_users.length > 1` and matches the staged contributors currently visible in the database.

## Scope

- Edge-function fix only.
- No schema changes.
- No retroactive payout mutation for already-queued/closed settlements.