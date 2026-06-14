## Fix: Standardize Phase 3 batch loop to use Planck-Scale executor + 3.5s sequencer pacing

**Root cause:** Phase 3's contributor loop uses raw `client.writeContract()` + a 500ms `setTimeout`, blasting two delegated-account transactions into the same Base block slot. Base/Reth enforces a one-in-flight-tx rule for EIP-7702 delegated accounts, so the second tx is rejected (surfaced by viem as a generic "missing/invalid parameters" stall). Phases 1 & 2 already use `executePlanckScaleTransaction` + `forceSequencerDelay(3500)` and succeed.

### Change (only edit: `supabase/functions/idia-circular-settlement/index.ts`, lines ~400–468)

Inside `for (...contributing_users)`, replace the existing per-iteration `try { ... } catch` body with the standardized sequence:

1. **Yield (USDC transfer)** — call `executePlanckScaleTransaction(client, account, USDC_ADDRESS, ERC20_ABI, "transfer", [lifeWallet, parseUnits(perContributorYield.toFixed(6),6)], "Batch.Item.Yield")`, await receipt with `confirmations:1`, on success log `[END: Batch.Item.Yield]` and call `await forceSequencerDelay(3500)`; otherwise `throw` to break to the per-item catch.
2. **Proposal (escrow `proposeDistribution`)** — same pattern via `executePlanckScaleTransaction(... ESCROW_ECOSYSTEM, ESCROW_ABI, "proposeDistribution", [...], "Batch.Item.Proposal")`, await receipt, on success log `[END: Batch.Item.Proposal]` and `await forceSequencerDelay(3500)` to clear the slot before the **next contributor**; otherwise `throw`.
3. **Ledger hydration** — insert into `synapse_credit_ledger` exactly as today (user_id, amount, entry_type:`deposit`, transaction_type:`DATA_SALE_PAYOUT`, status:`completed`, blockchain_tx_hash: yieldHash, is_settled:true, settled_at, description). Wrap the `error` from `.insert(...)` and `throw` if present.
4. **Push to `contributorPayouts`** with `{ wallet: lifeWallet, yield_hash, proposal_hash }`, log `[END: Batch.Item.Ledger]`.
5. **Catch block** — keep `[BEGIN/END: Batch.Item.Error]` telemetry brackets around the `[FATAL STALL: Batch.Item]` error log; `continue;` so one bad contributor never halts the batch.
6. **Remove** the obsolete `await new Promise(r => setTimeout(r, 500))` — pacing is now handled by `forceSequencerDelay(3500)` after each on-chain step.

### Out of scope
- No changes to Phases 1, 2, 4, 5 logic, signatures, or split percentages.
- No changes to the executor itself, ABIs, contract addresses, env handling, or HTTP handler.
- No DB schema / migration changes.
- No frontend changes.

### Verification
- Re-deploy `idia-circular-settlement` and trigger a settlement.
- In edge logs confirm: `[END: Batch.Item.Yield] → [BEGIN: Sequencer.Delay] 3500ms → [END: Batch.Item.Proposal] → [BEGIN: Sequencer.Delay] 3500ms` per contributor, with no `in-flight transaction limit reached` errors.
- Confirm `synapse_credit_ledger` rows are created with `status='completed'` and valid `blockchain_tx_hash`.
