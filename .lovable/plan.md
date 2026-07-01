## Diagnosis

The header shows `0` credits because the client-side query is silently permission-blocked, not because the balance is zero. Confirmed against the database for the signed-in user (`217c6224…`):

- Actual balance in `synapse_credit_ledger`: **9,990.39 CR** across 152 settled/completed rows.
- `get_synapse_balance(uuid)` RPC exists and is `SECURITY DEFINER`, **but** `EXECUTE` is not granted to `authenticated` or `anon` → the RPC call returns `null`, which the context coerces to `0`.
- `public.synapse_credit_ledger` has RLS policies scoping to `auth.uid() = user_id`, **but** the table has **zero** `GRANT`s. PostgREST therefore refuses the burn-rate query as well.

No frontend code change is needed — `SynapseCreditsContext` is already reading the right sources. The fix is a permissions migration.

## Migration

```sql
-- Allow signed-in users to call the balance RPC (SECURITY DEFINER handles row access)
GRANT EXECUTE ON FUNCTION public.get_synapse_balance(uuid) TO authenticated;

-- Allow signed-in users to read their own ledger rows (RLS still enforces user_id = auth.uid())
GRANT SELECT, INSERT, UPDATE, DELETE ON public.synapse_credit_ledger TO authenticated;
GRANT ALL ON public.synapse_credit_ledger TO service_role;
```

`anon` intentionally excluded — every policy scopes to `auth.uid()`, so anon has nothing to read anyway.

## Verification

After the migration:
1. Refresh `/dashboard`.
2. Header should render the real credit balance (~9,990 CR for the current user).
3. Console should show `[END: Synapse.Engine] … Gas[9990.39…]` instead of `Gas[0]`.
