## Two fixes

### 1. Replace `SUPABASE_SECRET_KEY` with `SUPABASE_SERVICE_ROLE_KEY`

Supabase Edge Functions natively inject `SUPABASE_SERVICE_ROLE_KEY` — `SUPABASE_SECRET_KEY` is non-standard and unreliable. The same anti-pattern exists in **21 edge functions**, not just `top-up-credits`. Fix them all in one pass to prevent the next "supabaseKey is required" stall:

```
supabase/functions/top-up-credits/index.ts
supabase/functions/marketplace-bundle-access/index.ts   (3 occurrences)
supabase/functions/wix-payment-webhook/index.ts
supabase/functions/vulture-sanitization-agent/index.ts
supabase/functions/ai-data-curator/index.ts
supabase/functions/verify-idia-life-tap/index.ts
supabase/functions/synapse-controller/index.ts
supabase/functions/seed-marketplace-catalog/index.ts
supabase/functions/life-pii-bridge/index.ts
supabase/functions/security-event-generator/index.ts
supabase/functions/recover-health-pipeline/index.ts
supabase/functions/process-lifestyle-data/index.ts
supabase/functions/process-delt-transfer/index.ts
supabase/functions/create-health-data-bundle/index.ts
supabase/functions/crazy-8-security/index.ts
supabase/functions/create-business-intelligence-bundles/index.ts
supabase/functions/hydrate-terminal/index.ts
supabase/functions/create-lifestyle-bundles/index.ts
supabase/functions/execute-hub-query/index.ts
supabase/functions/confirm-wix-payment/index.ts
```

Mechanical string replace: `SUPABASE_SECRET_KEY` → `SUPABASE_SERVICE_ROLE_KEY`. No other logic changes. Deploy all touched functions.

### 2. Add `data_sale_payout` to `idia_transaction_type` enum

A PostgREST caller is filtering `transaction_type = 'DATA_SALE_PAYOUT'` against `synapse_credit_ledger` and failing with SQLSTATE 22P02. The enum currently contains only: `data_sale, deposit, withdrawl, fee, reward, INTERNAL_DEPOSIT`. There is no `data_sale_payout` value — that's the actual gap.

Per your "all enums lowercase" rule, run a migration that:
1. Adds `data_sale_payout` (lowercase) to `idia_transaction_type`.
2. Normalizes the legacy uppercase `INTERNAL_DEPOSIT` value to lowercase `internal_deposit` to remove the casing inconsistency that introduced this whole class of bug.

Postgres requires the rename path: `ALTER TYPE ... RENAME VALUE 'INTERNAL_DEPOSIT' TO 'internal_deposit'` (no data rewrite needed), then `ADD VALUE IF NOT EXISTS 'data_sale_payout'`. The lowercase `internal_deposit` is already what `top-up-credits` inserts (`transaction_type: "internal_deposit"`), so this aligns enum values with the code.

### Out of scope

- No changes to query logic, RLS, ledger schema columns, or the circular settlement function.
- Not touching the `DATA_SALE` string in `SystemHealthDashboard.tsx` (that compares `egress_type`, a different column, not the enum).

### Verification

- Confirm `top-up-credits` no longer stalls at `INIT_ADMIN_CLIENT`.
- Confirm the PostgREST query against `synapse_credit_ledger` with `transaction_type=eq.data_sale_payout` (lowercase) returns 200 instead of 22P02. The caller must send lowercase; uppercase `DATA_SALE_PAYOUT` will continue to fail by design.
