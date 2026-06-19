## Root cause: recursive policy on `business_users` itself

The 42P17 fires on table `business_users`, not on the ledger or profile fetch. Its single `ALL` policy is recursive on its own table:

```
(user_id = auth.uid())
OR (business_id IN (
      SELECT business_id FROM get_user_business_access(auth.uid())
       WHERE business_id IN (
         SELECT bu2.business_id FROM business_users bu2          -- ← recurses into same table
          WHERE bu2.user_id = auth.uid()
            AND bu2.role = 'leadership'
            AND bu2.is_active = true)))
```

`get_user_business_access` is SECURITY DEFINER and safe, but the inner `SELECT … FROM business_users bu2` re-triggers the same policy → recursion. Any PostgREST query that touches a table whose policy joins `business_users` (e.g. `merchant_notifications`, which is what the log shows) inherits the loop.

## Fix

### 1. Add SECURITY DEFINER helper

```sql
CREATE OR REPLACE FUNCTION public.is_business_leadership(_business_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = _business_id
      AND user_id = auth.uid()
      AND role = 'leadership'::user_role
      AND is_active = true
  );
$$;
```

The function body bypasses RLS, so the inner `SELECT FROM business_users` no longer re-evaluates the policy.

### 2. Replace the recursive policy on `business_users`

```sql
DROP POLICY "Users can access their business user records" ON public.business_users;

CREATE POLICY "Users see their own membership"
  ON public.business_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Leadership sees co-members in their businesses"
  ON public.business_users FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))
    AND public.is_business_leadership(business_id)
  );
```

Mutations (INSERT/UPDATE/DELETE) on `business_users` are not currently exposed by any frontend code path; if you need write paths later we'll add scoped policies. The `ALL` policy is split into SELECT-only because that's what the existing logic actually covers.

### 3. Lowercase the legacy enum literal in `on_fiat_deposit_confirmed`

The function body still compares `NEW.transaction_type = 'DATA_SALE_PAYOUT'` (uppercase). The enum value we just added is lowercase `data_sale_payout`. The uppercase comparison silently never matches; rewrite the literal so DELT royalty mirroring actually fires.

### 4. Harden `charge-usdc.ts` diagnostic logging

At each call, emit a single `[TRIAD]` line covering:

- `relayer=<account.address>` (derived from `RELAYER_PRIVATE_KEY`)
- `usdc=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- `chainId=8453`
- `buyer=<buyer>` `treasury=<treasury>`
- `allowance=<bigint>` `balance=<bigint>` `required=<bigint>`
- `rpc_host=<hostname of getRpc()>`

So an APPROVAL_REQUIRED stall immediately reveals whether the relayer address in the log matches what IDIA Life provisioned against on BaseScan. No business-logic changes.

## Out of scope

- No frontend changes; `SynapseCreditsContext` / `PurchaseHistoryContext` queries are clean (`auth.uid() = user_id` only).
- No changes to RLS on `synapse_credit_ledger`, `profiles`, `wallets`, `user_subscriptions`, `user_payment_methods` — already audited and policy-clean.
- No new env vars, no contract address changes, no relayer key rotation.

## Verification

1. After migration, repeat the PostgREST request that produced 42P17 (`GET /merchant_notifications`) → expect 200, no recursion.
2. Run `SELECT * FROM public.business_users LIMIT 1` as an authenticated user → no error.
3. Trigger a USDC top-up that previously returned `APPROVAL_REQUIRED` → the new `[TRIAD]` log line in `top-up-credits` / `charge-usdc` reveals the exact relayer + allowance the chain is returning, which you can compare to BaseScan.
