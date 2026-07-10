## Fix: add `idia_royalty_yield` enum label + lowercase reconcile-ref string

### Migration
Extend the existing `public.idia_transaction_type` enum with a new label:

```sql
ALTER TYPE public.idia_transaction_type ADD VALUE IF NOT EXISTS 'idia_royalty_yield';
```

No table, RLS, or grant changes. `ADD VALUE` cannot run inside a transaction with other DDL that references the new value in the same statement — this migration only issues the ALTER TYPE and nothing else, so it's safe.

### Code change
`supabase/functions/settlement-reconcile-ref/index.ts` line 167:
- `isUsdc ? "data_sale_payout" : "IDIA_ROYALTY_YIELD"` → `isUsdc ? "data_sale_payout" : "idia_royalty_yield"`

Deploy `settlement-reconcile-ref` after the migration lands.

### Recovery
Re-invoke `settlement-reconcile-ref` for each stuck `reference_id`. It re-reads Base RPC, sees on-chain IDIA transfers, and inserts ledger rows under the new lowercase enum. Idempotency `(blockchain_tx_hash, user_id, transaction_type)` prevents duplicates.

### Out of scope
No changes to `idia-circular-settlement` (already fixed and deployed), no repair-queue backfill SQL, no Phase 3 nonce logic.
