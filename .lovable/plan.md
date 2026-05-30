## Goal
Instrument `supabase/functions/idia-circular-settlement/index.ts` to expose exactly where Base Sequencer rejection occurs for `in-flight transaction limit reached for delegated accounts`, while preserving the current Life-aligned contract/config state.

## Plan
1. Add a Planck-scale executor helper above the main handler in `idia-circular-settlement/index.ts`.
   - Log nonce acquisition from pending state.
   - Simulate the contract call before signing.
   - Prepare the raw transaction with the explicit nonce.
   - Sign the prepared payload directly.
   - Broadcast with `sendRawTransaction` and emit a fatal diagnostic dump on rejection.

2. Replace only the Phase 1 and Phase 2 `client.writeContract` calls with the new executor.
   - Keep all existing addresses, ABI constants, revenue-split logic, routing logic, chain-ID enforcement, and ledger writes intact.
   - Preserve the current `ALCHEMY_BASE_RPC_URL` behavior.
   - Do not alter unrelated phases unless required for type/runtime compatibility.

3. Add a small sequencer-clear delay helper and apply it after confirmed success for Phase 1 and Phase 2.
   - This keeps the function behavior aligned with the diagnostic goal while reducing back-to-back mempool pressure within a single execution.

4. Tighten observability around settlement instance timing.
   - Keep the top-level pulse logging.
   - Add a per-execution correlation marker so logs can distinguish one settlement run from two overlapping invocations.
   - This makes it obvious whether the failure is caused by duplicate Edge Function execution or stale RPC nonce state.

5. Validate the implementation by reviewing the updated edge-function log trace.
   - Confirm logs show the full sequence: NonceCheck → Simulate → Prepare → Sign → Broadcast.
   - Confirm failures now identify whether the collapse happened at broadcast and what nonce was attempted.

## Guardrails
- Do not touch `process-delt-transfer`.
- Do not change the existing Life-aligned contract imports/constants behavior in `idia-circular-settlement` beyond the requested transaction execution path.
- Do not add database/schema changes.
- Do not broaden scope into frontend refactors unless the logs later prove duplicate submissions originate there.

## Technical details
- Target file: `supabase/functions/idia-circular-settlement/index.ts`
- Replace `writeContract` only for:
  - Phase 1 corporate USDC transfer
  - Phase 2 regional USDC transfer
- Use the existing wallet client and account already created in the function.
- Keep receipt waiting via `waitForTransactionReceipt` so downstream ledger behavior stays consistent.
- If the logs later show simultaneous function invocations, the next follow-up would be caller-side idempotency or dedupe at the function boundary, but that is outside this scoped change.