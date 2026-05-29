# Replace Base public RPC with Alchemy endpoint

The fatal stall came from `process-delt-transfer` posting `eth_sendRawTransaction` to `https://mainnet.base.org`, which throttles delegated accounts ("in-flight transaction limit reached"). The `BASE_RPC_URL` edge secret is currently set to the public endpoint, and several client/proxy fallbacks also hard-code it.

## Changes

1. **Secret update** — set `BASE_RPC_URL` to `https://base-mainnet.g.alchemy.com/v2/jKAs5SHfEFihKOngFIL2N` via the secrets tool. This is the single fix that resolves the runtime error, since `process-delt-transfer` and `idia-circular-settlement` both read `Deno.env.get("BASE_RPC_URL")`.

2. **`supabase/functions/base-rpc-proxy/index.ts`** — also set the `ALCHEMY_BASE_RPC_URL` secret to the same Alchemy URL so the read-only proxy stops falling back to the public node. Update the in-file `FALLBACK_RPC` constant to the Alchemy URL as a defense-in-depth fallback.

3. **`src/hooks/useWalletBalance.ts`** — change the hard-coded fallback (`let rpcUrl = "https://mainnet.base.org"`) to the Alchemy URL so read-only `balanceOf` calls also route through Alchemy when `system_configs.BASE_RPC_URL` is absent.

4. **`src/lib/usdc-approval.ts`** — update both occurrences (`wallet_addEthereumChain` rpcUrls array and `createPublicClient` transport) to the Alchemy URL.

5. **Redeploy** `process-delt-transfer`, `idia-circular-settlement`, and `base-rpc-proxy` after the secret update so they pick up the new env var.

## Out of scope

- No logic changes to the settlement flow itself.
- viem's internal chain definition still lists `mainnet.base.org` as its default RPC, but we always pass an explicit `transport: http(URL)`, so that default is never used.
