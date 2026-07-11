
## Problem

Concurrent invocations of `idia-circular-settlement` race on the relayer wallet's pending nonce. Both grab nonce `334` from Alchemy at the same millisecond, one broadcast wins, the other is rejected with `replacement transaction underpriced`. We need a single-writer lock across Edge invocations that is safe over Supabase's stateless REST API (no session-scoped `pg_advisory_lock`).

## Solution — Table-Based Mutex (REST-safe, crash-proof)

A single row in a `relayer_mutex` table acts as the lock. Concurrent executions poll for it; whoever wins the atomic `UPDATE ... WHERE locked_by IS NULL OR expires_at < now()` owns the relayer sequencer. A built-in expiration (default 3 minutes) auto-heals dead locks if a function crashes before releasing.

### Step 1 — Database migration

Create the mutex table, seed the single lock row, and add two `SECURITY DEFINER` RPCs:

```sql
CREATE TABLE IF NOT EXISTS public.relayer_mutex (
  id TEXT PRIMARY KEY,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

INSERT INTO public.relayer_mutex (id) VALUES ('primary-relayer') ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.acquire_relayer_lock(run_id TEXT, timeout_seconds INT DEFAULT 180)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_locked BOOLEAN;
BEGIN
  UPDATE public.relayer_mutex
     SET locked_by = run_id,
         locked_at = now(),
         expires_at = now() + (timeout_seconds || ' seconds')::interval
   WHERE id = 'primary-relayer'
     AND (locked_by IS NULL OR expires_at < now());
  v_locked := FOUND;
  RETURN v_locked;
END; $$;

CREATE OR REPLACE FUNCTION public.release_relayer_lock(run_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.relayer_mutex
     SET locked_by = NULL, locked_at = NULL, expires_at = NULL
   WHERE id = 'primary-relayer' AND locked_by = run_id;
END; $$;

GRANT SELECT ON public.relayer_mutex TO service_role;
GRANT EXECUTE ON FUNCTION public.acquire_relayer_lock(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_relayer_lock(TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.acquire_relayer_lock(TEXT, INT) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_relayer_lock(TEXT) FROM public, anon, authenticated;
```

RLS is not enabled — the table is service-role only and never reached from the client.

### Step 2 — `supabase/functions/idia-circular-settlement/index.ts`

Immediately after the Supabase client is created and before `CONFIGURING_BLOCKCHAIN`, insert a poll-to-acquire block, then wrap Phases 1/2/3 in `try { … } finally { release }`.

```ts
// After: queueSupabase = supabase;  (Supabase client is ready)

let lockAcquired = false;
console.info(`[LOCK] Attempting single-writer lock for relayer... runId=${runCorrelationId}`);
for (let i = 0; i < 30; i++) {                       // up to ~60s
  const { data: acquired, error: lockErr } = await supabase.rpc(
    'acquire_relayer_lock',
    { run_id: runCorrelationId, timeout_seconds: 180 },
  );
  if (lockErr) console.warn(`[LOCK WARN] ${lockErr.message}`);
  if (acquired) {
    lockAcquired = true;
    console.info(`✅ [LOCK] Acquired. Entering exclusive sequencer mode. runId=${runCorrelationId}`);
    break;
  }
  console.info(`⏳ [LOCK] Relayer busy. Yielding 2000ms... runId=${runCorrelationId}`);
  await new Promise(r => setTimeout(r, 2000));
}
if (!lockAcquired) {
  throw new Error('Timeout waiting for relayer lock. Another settlement is occupying the sequencer.');
}

try {
  // >>> existing CONFIGURING_BLOCKCHAIN + PHASE 1 + PHASE 2 + PHASE 3 + ledger writes go here <<<
} finally {
  console.info(`[LOCK] Releasing relayer lock. runId=${runCorrelationId}`);
  try {
    await supabase.rpc('release_relayer_lock', { run_id: runCorrelationId });
  } catch (relErr: any) {
    console.error(`[LOCK] Release failed (auto-expire will recover): ${relErr?.message ?? relErr}`);
  }
}
```

Notes:
- `runCorrelationId` already exists as the function parameter — reuse it, do not mint a new UUID.
- The existing queue-status writeback (`queueFinalStatus`, `insertLedgerWithRepair`, etc.) stays inside the `try` block so it still runs before the lock releases.
- No other files change.

### Why this works

- **True queuing.** The atomic `UPDATE ... FOUND` guarantees exactly one caller wins per poll.
- **Crash-proof.** If a run dies mid-broadcast, the row's `expires_at` (3 min) lets the next caller reclaim it — no manual reset.
- **REST-safe.** Row-level state, no session-scoped `pg_advisory_lock`, safe across PgBouncer/stateless Edge invocations.
- **Zero blockchain-logic changes.** Phases 1/2/3 are untouched; the only new behavior is serialization.

### Verification

After deploy, fire two settlements back-to-back and read `edge-function-logs-idia-circular-settlement`:
1. `[LOCK] Acquired runId=A` → full Phase 1/2/3 sequence → `[LOCK] Releasing runId=A`.
2. `[LOCK] Relayer busy… Yielding` messages from runId=B during A's execution.
3. `[LOCK] Acquired runId=B` only after A releases.
4. Zero `replacement transaction underpriced` errors.
