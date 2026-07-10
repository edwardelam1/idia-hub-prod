# Fix: Deterministic serial nonce for Phase 3 contributor payouts

## Problem
The Phase 3 batch loop in `supabase/functions/idia-circular-settlement/index.ts` already awaits each `writeContract` + `waitForTransactionReceipt` sequentially, but it lets viem auto-derive the nonce on every call. Under Alchemy/Base pending-pool churn (and after a reverted or slow-propagating tx), viem can either reuse a nonce or pull a stale `pending` value, tripping the "in-flight transaction limit reached for delegated accounts" rejection. Each contributor also fires two writes (USDC yield + escrow proposal) with no shared nonce baseline.

## Fix scope
Only Phase 3 (`Phase_3_Contributor.BatchExecution`, lines ~478–575). Phases 1, 2, corporate/regional transfers, ledger writes, and repair-queue logic stay unchanged.

## Changes to `idia-circular-settlement/index.ts`

1. **Before the loop:** fetch a single starting pending nonce for the relayer directly from Base RPC and hold it in `let currentNonce`. Log the baseline.
2. **Inside the loop, per contributor:**
   - Pass `nonce: currentNonce` explicitly to the USDC `writeContract` call, then `waitForTransactionReceipt({ confirmations: 1 })`. On broadcast success (hash returned), `currentNonce++` immediately so the next tx is pre-slotted even if the receipt is slow.
   - Pass `nonce: currentNonce` to the escrow `proposeDistribution` `writeContract`, await its receipt, then `currentNonce++`.
   - Keep the existing 500 ms sequencer buffer and ledger insert.
3. **Error path (existing `catch (txError)`):** after logging and pushing to `skippedContributors`, re-sync from chain: `currentNonce = await client.getTransactionCount({ address: account.address, blockTag: "pending" })` so a rejected/dropped tx doesn't leave a permanent nonce gap that stalls every following contributor. Also route the failure through `insertLedgerWithRepair` (already imported) so the repair queue captures it, matching the pattern from the user's snippet.
4. Keep all existing `[BEGIN/END]` Planck-style logs and add one `[PROCESS: Batch.Sequencer]` line with the resolved starting nonce.

## Why this clears the stall
- Only one in-flight tx per relayer at any moment (unchanged) **plus** an authoritative nonce counter means viem can't silently duplicate or skip a slot.
- On a hard failure, re-reading `pending` heals from dropped/reorged txs instead of propagating a bad `currentNonce` for the rest of the batch.
- Phases 1 & 2 already funnel through `executePlanckScaleTransaction`, which reads a fresh nonce per call — safe because they run one-shot, not in a tight loop.

## Out of scope
- No schema changes.
- No changes to `settlement-reconcile-ref`, corporate/regional transfers, or the BigInt JSON polyfill.
- No new secrets.

## Verification
After edit: redeploy `idia-circular-settlement`, then re-run one of the previously stuck references (e.g. `SYN-D9DDFDD1`) and check function logs for the `[PROCESS: Batch.Sequencer]` baseline nonce line and sequential per-contributor `[END: Batch.Item]` block numbers with no "in-flight transaction limit" errors.
