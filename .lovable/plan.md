

## Plan: Unfreeze the Synapse settlement loop (corrected to actual schema)

The user's audit is directionally right but references tables/columns that don't exist (`synapse_ledger`, `pseudo_id`, `owner_id`, `status`). The real schema is `synapse_credit_ledger` + `egress_logs`, and `synapse-controller` already writes both atomically with service role. No RPC or RLS policy needed.

The actual blockers are in `best-friend-ai`:

1. **Receipt is agent-gated.** Only `MEDICAL_AGENT` returns health hashes; `CONSTRUCTION_AGENT`/`FINANCE_AGENT` return only lifestyle hashes; `GENERAL_NAVIGATOR` returns nothing. Any ambiguous question routes to NAVIGATOR → empty receipt → no burn.
2. **Lifestyle hashes are all NULL** in DB (64/64). Even when LIFESTYLE branch fires, `.filter(Boolean)` drops every row.
3. **Fallback identifier missing.** When `aca_hash_key` is null, we should fall back to the row `id` so the controller still records what was consumed.

### Fix in `supabase/functions/best-friend-ai/index.ts` (receipt block, lines 383-391)

Replace agent-gated logic with: in marketplace mode, build the receipt from **every record actually shown to the AI**, using `aca_hash_key` when present and falling back to `id`:

```ts
let consumedReceipt: string[] = [];
if (isDataScientistMode) {
  const healthIds = healthMetrics.map((r: any) => r.aca_hash_key || r.id).filter(Boolean);
  const lifeIds   = lifestyleEvents.map((r: any) => r.aca_hash_key || r.id).filter(Boolean);
  consumedReceipt = [...healthIds, ...lifeIds];
}
```

This guarantees the frontend's `receipt.length > 0` gate fires whenever the AI actually saw data (the 55 + 64 case the user keeps hitting), regardless of which agent the router picked.

### Backfill `aca_hash_key` for lifestyle records (one-shot SQL via insert tool)

So future receipts carry real ACA hashes instead of row IDs:

```sql
UPDATE public.staged_lifestyle_data
SET aca_hash_key = encode(sha256((id::text || COALESCE(entity_id::text,'') || COALESCE(event_type,''))::bytea), 'hex')
WHERE aca_hash_key IS NULL;
```

### What we are NOT doing (and why)

- **Not creating `trigger_synapse_settlement` RPC.** `synapse-controller` already does the atomic ledger + egress write. Adding a parallel RPC would double-charge.
- **Not creating `"Synapse Service Access"` RLS policy.** Service role bypasses RLS by definition. Egress writes already succeed when the controller is reached.
- **Not touching a `synapse_ledger` table.** It doesn't exist. The financial ledger is `synapse_credit_ledger` (already populated by the controller).

### Verification after deploy

1. Open `/best-friend` in Marketplace Mode, ask any data question.
2. Confirm `consumed_records` is non-empty in the response.
3. Run:
   ```sql
   SELECT created_at, amount, description FROM synapse_credit_ledger ORDER BY created_at DESC LIMIT 5;
   SELECT created_at, egress_type, array_length(aca_record_references,1) FROM egress_logs ORDER BY created_at DESC LIMIT 5;
   ```
   Expect a fresh `-1` ledger entry and a matching egress row.

### Files Modified
- `supabase/functions/best-friend-ai/index.ts` — receipt construction (lines ~383-391).
- Migration: backfill `staged_lifestyle_data.aca_hash_key`.

### Outcome
- Every marketplace AI query that touches data fires `synapse-controller` → 1 CR burn + egress log + liability token → ledger and provenance UI move.

