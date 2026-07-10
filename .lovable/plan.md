## Fix: lowercase transaction_type strings to match Postgres ENUM

Postgres ENUMs are case-sensitive. Two Edge Functions currently insert uppercase values that don't exist in the `synapse_credit_ledger.transaction_type` enum, so those inserts fail and the IDIA balances never surface in the UI.

### Changes

**`supabase/functions/idia-circular-settlement/index.ts`**
- Line 444: `"HUB_PROTOCOL_FEE"` → `"hub_protocol_fee"`
- Line 461: `"ECOSYSTEM_WAR_CHEST"` → `"ecosystem_war_chest"`
- Lines 591, 623: already `"data_sale_payout"` — leave unchanged.

**`supabase/functions/settlement-reconcile-ref/index.ts`**
- Line 167: `isUsdc ? "data_sale_payout" : "IDIA_ROYALTY_YIELD"` → `isUsdc ? "data_sale_payout" : "idia_royalty_yield"`.

No schema migration. No other function touched. No new secrets.

### Verification before deploy
- Query the live enum to confirm the exact lowercase labels exist:
  `SELECT unnest(enum_range(NULL::synapse_transaction_type));`
  (or whatever the enum type name is on `synapse_credit_ledger.transaction_type`). If any of the three target labels (`hub_protocol_fee`, `ecosystem_war_chest`, `idia_royalty_yield`) is missing, stop and report — do NOT invent new labels or add uppercase duplicates.

### Recovery after deploy
- Re-invoke `settlement-reconcile-ref` for each stuck `reference_id`. It re-reads Base RPC, sees the on-chain IDIA transfers, and inserts ledger rows under the corrected lowercase enum. Idempotency key `(blockchain_tx_hash, user_id, transaction_type)` prevents duplicates for already-settled USDC rows.

### Out of scope
- Schema changes, enum additions, backfill SQL against `settlement_ledger_repair_queue`, and any Phase 3 nonce/retry logic (already handled).
