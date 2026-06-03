## Goal
Replace the disabled legacy anon/service_role JWTs everywhere with the new Supabase publishable/secret key system. Login is currently 401'ing with "Legacy API keys are disabled".

## Frontend (3 files)

1. **`.env`**
   - `VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_L_foF7A1ds9WBnsVnvcNVA_JYrRwm8B"` (replaces legacy anon JWT)

2. **`src/integrations/supabase/client.ts`**
   - Rename const `SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY` and set value to `sb_publishable_L_foF7A1ds9WBnsVnvcNVA_JYrRwm8B`
   - Pass it as the 2nd arg to `createClient` and as the `apikey` header

3. **`src/lib/api.ts`**
   - Drop the legacy `VITE_SUPABASE_ANON_KEY` fallback; read only `VITE_SUPABASE_PUBLISHABLE_KEY`

(`src/components/modules/InventoryManagement.tsx` already reads `VITE_SUPABASE_PUBLISHABLE_KEY` — no change.)

## Edge functions — rename env vars to new system

Every function currently reads `Deno.env.get("SUPABASE_ANON_KEY")` or `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`. Rewrite each to:
- `SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SECRET_KEY`

Files to update:

```text
ANON references:
  confirm-wix-payment/index.ts
  life-pii-bridge/index.ts
  marketplace-bundle-access/index.ts
  process-delt-transfer/index.ts

SERVICE_ROLE references:
  ai-data-curator, best-friend-ai, confirm-wix-payment, crazy-8-security,
  create-business-intelligence-bundles, create-health-data-bundle,
  create-lifestyle-bundles, execute-hub-query, hydrate-terminal,
  life-pii-bridge, marketplace-bundle-access, process-delt-transfer,
  process-lifestyle-data, recover-health-pipeline, security-event-generator,
  seed-marketplace-catalog, synapse-controller, top-up-credits,
  verify-idia-life-tap, vulture-sanitization-agent, wix-payment-webhook
```

Since the user states "some edge functions are updated, some are not" but filesystem timestamps are all identical (sandbox sync wipes mtimes), I'll treat any file still containing the legacy env var names as not yet updated and rewrite only those references — leaving any function that's already on the new names untouched.

## Secrets

Add the two new runtime secrets so edge functions resolve them at runtime:
- `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_L_foF7A1ds9WBnsVnvcNVA_JYrRwm8B`
- `SUPABASE_SECRET_KEY` = (user-provided sb_secret_… value)

I'll trigger the add-secret flow so you can paste the secret key into the secure form.

## Out of scope (flagging only, not changing)

- DB function `public.fn_trigger_synapse_autonomous` hardcodes a `sb_secret_…` key in its `Authorization` header. That's a security issue (secret in DB code) and a brittleness issue (won't survive future rotations). Recommend follow-up to read it from Vault via `get_service_role_key()` like the other triggers do — but it's out of scope for this key-migration pass unless you say otherwise.
- Wix, Alchemy, relayer, and other non-Supabase secrets are unaffected.

## Validation

After changes:
- Reload preview → login should succeed (no more "Legacy API keys are disabled")
- Spot-check one edge function call (e.g. top-up-credits or hydrate-terminal) via the UI and confirm 200 in network log
