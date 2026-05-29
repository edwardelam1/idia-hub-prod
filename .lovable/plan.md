# Force regional-routing edge transport to Alchemy with a hard fallback

The remaining loop is in `supabase/functions/idia-circular-settlement/index.ts`, where the wallet client still binds directly to `BASE_RPC_URL` and aborts entirely if that secret is missing or stale. The requested fix is to make the transport binding ironclad by introducing a production Alchemy constant and resolving `activeRpcUrl = BASE_RPC_URL || PROD_ALCHEMY_URL` at client initialization.

## Planned changes

1. **`supabase/functions/idia-circular-settlement/index.ts` top-level network constants** — replace the current hard failure on missing `BASE_RPC_URL` with a hardcoded `PROD_ALCHEMY_URL` constant plus a nullable `BASE_RPC_URL` read, so the function can always fall back to Alchemy.

2. **`supabase/functions/idia-circular-settlement/index.ts` wallet client initialization** — update the explicit initialization block to:
   - compute `const activeRpcUrl = BASE_RPC_URL || PROD_ALCHEMY_URL`
   - emit the requested `[REGIONAL_ROUTING][TRANSPORT_BINDING]` log
   - bind `createWalletClient(... transport: http(activeRpcUrl))`

3. **Validation guard** — keep the Base Mainnet chain ID verification in place, but update the error wording so it reflects the active route rather than implying only `BASE_RPC_URL` was used.

## Scope

- Only the regional-routing edge function initialization block is changed.
- No settlement math, routing, or ledger logic changes.
- No frontend or other edge functions are modified in this pass.
