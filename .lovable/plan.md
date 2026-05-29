## Goal

Eliminate the RPC "in-flight transaction" stalls in `supabase/functions/idia-circular-settlement/index.ts` by enforcing strict sequential execution: broadcast one transaction, wait for its receipt, then move to the next. This removes the need for manual nonce tracking inside the contributor loop and keeps at most one pending transaction in the mempool from the relayer wallet at any time.

## Scope

- Only `supabase/functions/idia-circular-settlement/index.ts` is modified.
- No frontend, no other edge functions, no ledger/math/routing changes.
- Same revenue split, same contracts, same ledger writes.

## Planned changes

### 1. Phase 1 & Phase 2 (corporate + regional transfers)

Apply the same sequential pattern to the two top-level transfers so they cannot race the contributor loop or each other:

- After `client.writeContract(...)` for the corporate transfer, immediately `await client.waitForTransactionReceipt({ hash: corporateHash, confirmations: 1 })` and log success/revert.
- Do the same for the regional transfer.
- Drop the manual `masterNonce` tracking — viem will pull `pending` nonce on each call now that we wait between sends.

### 2. Phase 3 & 5 (contributor distribution loop) — the core fix

Replace the current `for` loop body with the requested sequential pipeline:

```text
[BEGIN: Phase_3_Contributor.BatchExecution]
for each contributor (i / N):
  [BEGIN: Batch.Item] Processing transfer i+1/N to <wallet>
  try:
    1. yieldHash    = writeContract(USDC.transfer, [wallet, yield])
       log "TX Broadcasted. Hash: ... Awaiting network confirmation..."
       yieldReceipt = waitForTransactionReceipt({ hash: yieldHash, confirmations: 1 })
       log success (block #) or revert

    2. proposalHash    = writeContract(ESCROW.proposeDistribution, [...])
       proposalReceipt = waitForTransactionReceipt({ hash: proposalHash, confirmations: 1 })
       log success (block #) or revert

    3. ledger insert (status = "completed" only if yieldReceipt.status === "success",
                      else "failed"; store both hashes as today)

    4. sleep 500ms (RPC rate-limit buffer)

  catch txError:
    [BEGIN: Batch.Item.Error]
    [FATAL STALL: Batch.Item] Failed executing transfer for <wallet>: <msg>
    [END: Batch.Item.Error]
    continue   // skip this contributor, do not abort the whole batch
[END: Phase_3_Contributor.BatchExecution] Pipeline cleared.
```

Key properties of the new loop:

- No `nonce:` field passed to `writeContract` anymore — viem fetches the pending nonce per call, which is now always correct because we waited for the previous tx to mine.
- Exactly one in-flight tx from the relayer at any time → bypasses Alchemy/Base in-flight delegation limits.
- A single contributor failure logs and `continue`s; the remaining contributors are still processed.
- The existing 1500ms blanket `setTimeout` is replaced by the 500ms buffer inside the per-item try block.

### 3. Logging

- Use the exact log tags from the spec: `[BEGIN: Phase_*.BatchExecution]`, `[BEGIN: Batch.Item]`, `[STATUS: Batch.Item]`, `[END: Batch.Item]`, `[ERROR: Batch.Item]`, `[BEGIN/END: Batch.Item.Error]`, `[FATAL STALL: Batch.Item]`, `[END: Phase_*.BatchExecution] Pipeline cleared.`, and a `[FATAL STALL: Phase_*.Global]` outer catch.
- Keep the existing `currentStep` markers so the top-level error handler still reports the phase.

### 4. What is NOT changed

- `PROD_ALCHEMY_URL` / `BASE_RPC_URL` resolution and the `[REGIONAL_ROUTING][TRANSPORT_BINDING]` log stay as-is.
- Chain ID 8453 enforcement stays.
- Revenue split (60/10/30), contract addresses, and ledger schema/inserts stay.
- Response shape (`{ success, corporateHash, regionalHash, payouts }`) stays.

## Validation after deploy

1. Deploy `idia-circular-settlement`.
2. Trigger one settlement with ≥2 contributors.
3. In edge function logs, confirm the sequence: `Batch.Item 1/N broadcast → receipt success block X → Batch.Item 2/N broadcast → ...` with no `nonce too low` / `replacement transaction underpriced` / in-flight-limit errors.
