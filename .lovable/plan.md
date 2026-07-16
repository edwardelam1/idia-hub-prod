## Status of your three tasks

I verified the current state before planning. Not everything you listed needs to be built — most of it is already in place from the earlier mutex work. Here's the honest breakdown:

### Task 1 — REST-safe table mutex: **already exists, no migration needed**
Verified in the live database:
- `public.relayer_mutex` table exists with the exact 4 columns you specified.
- The `primary-relayer` seed row is present (currently unlocked).
- `acquire_relayer_lock(run_id text, timeout_seconds integer DEFAULT 180) RETURNS boolean` — body matches your spec verbatim, uses `FOUND`, `SECURITY DEFINER`, `search_path = public`.
- `release_relayer_lock(run_id text) RETURNS void` — clears `locked_by`/`locked_at`/`expires_at` scoped to `locked_by = run_id`.

No advisory locks anywhere. No PgBouncer risk. I will not regenerate this.

### Task 2 — polling wrapper: **already wired correctly**
In `supabase/functions/idia-circular-settlement/index.ts`:
- `runCorrelationId` is generated per invocation.
- 30-iteration acquire loop with `await new Promise(res => setTimeout(res, 2000))` between attempts (lines 309–328).
- `throw new Error("Timeout waiting for relayer lock...")` on exhaustion.
- Phase 1/2/3 are wrapped in `try { ... } finally { release_relayer_lock }` (lines 330–729).

No changes required.

### Task 3 — this is where the real bugs are, and they explain the double-payout
Two defects to fix in `supabase/functions/idia-circular-settlement/index.ts`:

**Bug A — invalid ENUM string (Phase 3 IDIA row).**  
The `idia_transaction_type` enum in this database contains `idia_royalty_yield` but does NOT contain `data_sale_idia_award`. Line 653 writes `transaction_type: "data_sale_idia_award"`, which the DB rejects. Fix: change to `"idia_royalty_yield"` and change the `phase` label passed to `insertLedgerWithRepair` from `"contributor_idia_award"` to `"idia_royalty_yield"` so the repair queue is phase-accurate.

**Bug B — the ledger bleed (catch block at lines 670–702).**  
Root cause of the doubled USDC payout: the `try` wraps both the yield (USDC) transfer AND the IDIA `automatedDistribute` call AND both ledger inserts. When the IDIA leg throws (which it did, thanks to Bug A upstream propagating during earlier runs, or any future IDIA revert), control lands in the shared catch — which unconditionally writes a `transaction_type: "data_sale_payout"` failed row. So a run where the USDC yield already succeeded (and its `data_sale_payout` row was inserted at line 627) also gets a second `data_sale_payout` row from the catch. That's the double-post you saw.

Fix: track per-phase progress with two booleans (`yieldSettled`, `idiaSettled`) inside the loop. In the catch:
- If `!yieldSettled`, write ONE failed row typed `data_sale_payout` (phase `contributor_yield`).
- Else if `!idiaSettled`, write ONE failed row typed `idia_royalty_yield` (phase `idia_royalty_yield`) — never `data_sale_payout`.
- Never write both. Never re-write a phase that already succeeded.

## Files touched

1. `supabase/functions/idia-circular-settlement/index.ts`
   - Line ~653: `transaction_type: "data_sale_idia_award"` → `"idia_royalty_yield"`, and `phase: "contributor_idia_award"` → `"idia_royalty_yield"`.
   - Line ~658 description text updated to reference royalty yield.
   - Loop body (lines ~578–702): introduce `let yieldSettled = false; let idiaSettled = false;` set to true only after each corresponding `insertLedgerWithRepair` returns. Rewrite the catch block so it emits exactly one failed-row insert, mapped to the phase that failed (`data_sale_payout` for yield, `idia_royalty_yield` for IDIA).

Nothing else changes: mutex logic, polling loop, finally-release, Phase 1/2 flow, and background write-back all stay as-is.

## Verification

- Redeploy `idia-circular-settlement`.
- Trigger a synthetic settlement with one contributor whose wallet is valid; confirm ledger has exactly one `data_sale_payout` row and one `idia_royalty_yield` row (both `completed`).
- Force an IDIA revert (temporarily use a bad amount or invalid recipient in a sandbox run); confirm ledger has one `data_sale_payout` completed row and one `idia_royalty_yield` failed row — no duplicated USDC row.
- Confirm relayer_mutex acquire/release still cycles cleanly (row returns to `locked_by IS NULL` after each run).
