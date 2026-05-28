## Goal
Keep the Alchemy Base RPC URL fully private. The client never sees the key; all on-chain reads go through a Supabase edge function that forwards JSON-RPC to Alchemy, with public `mainnet.base.org` as fallback.

## Changes

### 1. Runtime secret
Add `ALCHEMY_BASE_RPC_URL` via the secrets tool. Value = `https://base-mainnet.g.alchemy.com/v2/jKAs5SHfEFihKOngFIL2N`.
(I'll prompt you in a secure form — do not paste the key in chat again, and rotate it in the Alchemy dashboard since it was shared in plaintext.)

### 2. New edge function: `base-rpc-proxy`
`supabase/functions/base-rpc-proxy/index.ts`
- `verify_jwt = true` (only authenticated Hub users can use it)
- POST-only, accepts a standard JSON-RPC body (single or batch)
- Allow-lists read-only methods: `eth_call`, `eth_blockNumber`, `eth_chainId`, `eth_getBlockByNumber`, `eth_getLogs`, `eth_getTransactionReceipt`, `eth_gasPrice`, `eth_feeHistory`. Any other method → 403.
- Forwards to `Deno.env.get('ALCHEMY_BASE_RPC_URL')`; on non-200 falls back to `https://mainnet.base.org`
- Returns Alchemy's JSON verbatim with CORS headers
- No request logging of bodies (avoid leaking position queries)

### 3. Client transport
Update `src/hooks/useWalletLpPositions.ts`:
- Replace the viem `http(...)` transport with a custom transport that POSTs to the edge function using the authenticated supabase client (so the JWT is attached automatically)
- Drop any reference to `VITE_BASE_RPC_URL` — key never reaches the bundle
- Keep all existing logic (NFPM `positions()`, `slot0`, fee `collect()` static-call, USD math)

### 4. No other surface changes
- `LiquidityPools.tsx`, subgraph hook, `NoWalletState`, deep-links — untouched
- No DB changes, no new tables, no UI changes

## Technical notes

```text
Browser (viem)
  └── customTransport.request({ method, params })
        └── supabase.functions.invoke('base-rpc-proxy', { body: {...jsonrpc} })
              └── Edge fn validates method allow-list
                    └── fetch(ALCHEMY_BASE_RPC_URL)  ──► fallback mainnet.base.org on failure
```

Method allow-list keeps the proxy from being abused as a generic open relay. Auth gate (`verify_jwt = true`) keeps it scoped to logged-in Hub users.

## Out of scope
Write methods (`eth_sendRawTransaction` etc.), wagmi/wallet-connect, caching layer, rate limiting beyond Supabase's defaults.

## Action required from you
After approving the plan I'll request the `ALCHEMY_BASE_RPC_URL` secret via the secure form. **Rotate the key in Alchemy first** — the value you pasted is now compromised.