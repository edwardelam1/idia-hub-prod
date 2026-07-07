## Patch `supabase/functions/hydrate-terminal/index.ts`

Update the vault query to select the full row and inject the relational business ID into the payload returned to the terminal.

### Changes

1. Change the `.select('schema_payload')` call to `.select('*')` so relational ID columns come back alongside the JSON payload.
2. After the existing validation, derive `relationalBusinessId` by checking `data.business_id || data.organization_id || data.merchant_id || data.id`.
3. Return `payload: { ...data.schema_payload, businessId: relationalBusinessId }` so the Sovereign Node terminal always receives a bound ID.
4. Keep existing CORS handling, logging, and error branches unchanged.
5. Deploy the `hydrate-terminal` edge function after the edit.

### Not changed

- No schema/RLS/migration changes.
- No changes to the client-side `ProvisioningEngine` or any other function.
