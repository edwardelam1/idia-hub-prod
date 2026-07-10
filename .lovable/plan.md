## Fix: Concurrency-safe nonce retry for Phase 3 payouts

The current serial-nonce implementation still collides when the Edge Function is invoked concurrently (independent containers each read the same `pending` nonce → `replacement transaction underpriced` / `in-flight transaction limit reached`). Manual `currentNonce++` in isolated containers can't coordinate across invocations.

### Change scope
Only Phase 3 loop in `supabase/functions/idia-circular-settlement/index.ts` (lines ~478–610). No schema changes, no other function changes, no new secrets.

### What changes

Replace the pre-loop `currentNonce` fetch and per-tx `nonce: currentNonce` / `currentNonce++` pattern with a per-transaction retry-with-backoff helper. Each broadcast attempt re-reads the freshest `pending` nonce from Base RPC, so a nonce stolen by a sibling container triggers a wait-and-retry rather than a permanent skip.

1. **Add a local helper** `sendWithNonceRetry(txFn, label)` inside Phase 3 that:
   - Reads `client.getTransactionCount({ address: account.address, blockTag: "pending" })` at the start of every attempt.
   - Calls `txFn(nonce)` (the caller passes a closure that runs `writeContract` with that nonce and returns the hash).
   - Awaits `waitForTransactionReceipt({ hash, confirmations: 1 })`.
   - On error: if the message matches `nonce` / `underpriced` / `in-flight transaction limit` / `already known`, backs off `2^attempt * 500ms` (500ms, 1s, 2s, 4s, 8s) up to 5 attempts and retries. Any other error rethrows immediately.
   - Returns `{ hash, receipt }` on success; throws on exhaustion with a `Max retries exhausted…` message.

2. **Rewrite the loop body** for each contributor:
   - Remove the pre-loop `let currentNonce = ...` fetch and all `nonce: currentNonce` / `currentNonce++` lines.
   - Yield transfer: `sendWithNonceRetry((nonce) => client.writeContract({ ...USDC transfer args, account, nonce }), "yield")`.
   - Proposal: `sendWithNonceRetry((nonce) => client.writeContract({ ...proposeDistribution args, account, nonce }), "proposal")`.
   - Keep the 500ms inter-contributor buffer, ledger insert, and `contributorPayouts.push`.

3. **Error handling stays the same shape**: the existing `catch (txError)` block still pushes to `skippedContributors` and routes through `insertLedgerWithRepair` — it now catches both hard errors (revert, insufficient funds) and "retries exhausted" from the helper.

4. **Logging**: keep all `[BEGIN/END/STATUS: Batch.Item]` lines. Add per-attempt `[PROCESS: Batch.Sequencer] Verified nonce: N (attempt K)` and `[WARN: Batch.Item.Collision] … yielding {ms}ms` lines. Drop the now-stale `[PROCESS: Batch.Sequencer] starting nonce` line.

### Why this clears the stall
- Every attempt asks Base RPC for the current `pending` nonce, so parallel containers stealing a slot no longer poison later txs in this loop.
- Backoff gives the sibling tx time to mine, so retry sees an advanced nonce and succeeds.
- Non-nonce errors (revert, insufficient funds) still fail fast and land in the repair queue — no silent hiding.

### Out of scope
- Cross-invocation locking (would need Redis or a DB advisory lock — noted for follow-up if concurrency is heavy).
- Any changes to Phases 1, 2, corporate/regional transfers, `settlement-reconcile-ref`, or the BigInt polyfill.

### Verification
Redeploy `idia-circular-settlement`, re-run a previously stuck reference, and confirm function logs show `[WARN: Batch.Item.Collision]` followed by a successful retry rather than a `[FATAL STALL]`, and all contributor `[END: Batch.Item]` lines have block numbers.
