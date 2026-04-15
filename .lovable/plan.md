

# Fix Provenance Audit Log Realtime Updates

## Root Cause
The `egress_logs` table is not added to the Supabase `supabase_realtime` publication. Without this, the Postgres Changes subscription in `ProvenanceAuditLog.tsx` never receives INSERT events — the channel subscribes silently but gets nothing.

Additionally, the "Total Records" badge shows `logs.length` (client-side count of fetched rows), not a true DB count. The counter going to 14 may be from a page reload fetching fresh data while the table rows stayed stale from a previous render.

## Plan

### 1. Database Migration — Enable Realtime on `egress_logs`
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE egress_logs;
```
This is the only fix needed to make the existing realtime subscription code work.

### 2. Add query invalidation as fallback
The current realtime handler manually prepends to the cache via `setQueryData`. This works but can miss edge cases (e.g., if the component mounts after the event fires). Add `queryClient.invalidateQueries` as a belt-and-suspenders approach alongside the optimistic prepend — ensures a full refetch if the cache update fails.

## Files Changed
- DB migration: `ALTER PUBLICATION supabase_realtime ADD TABLE egress_logs`
- `src/components/trading/ProvenanceAuditLog.tsx` — add `invalidateQueries` fallback in the realtime handler

