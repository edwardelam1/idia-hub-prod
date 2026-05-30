# Plan: Adopt `contracts.ts` as Hub source of truth & fix mislabeled addresses

## 1. Create canonical config in Hub repo

Add **two parallel copies** of the IDIA Life `contracts.ts` (frontend + edge runtime) so the browser bundle and Deno functions both import from a typed source:

- **`src/config/contracts.ts`** — verbatim copy of the IDIA Life file (mainnet + testnet blocks, `ACTIVE_DEPLOYMENT = 'mainnet'`, `PROTOCOL` export, ABIs, BOOT guard).
- **`supabase/functions/_shared/contracts.ts`** — same address tables and ABIs, rewritten as a Deno-compatible module (no `import.meta` quirks; pure `export const`). Edge functions cannot import from `src/`, so this mirror is mandatory.

Both files share a hand-edited `// KEEP IN SYNC WITH …` header pointing at each other.

## 2. Refactor `idia-circular-settlement/index.ts`

Replace the loose top-of-file constants with imports from `_shared/contracts.ts`:

- `USDC_ADDRESS` ← `PROTOCOL.usdc`
- `REGISTRY_ADDRESS` ← `PROTOCOL.registry`
- `POOL_FACTORY_ADDRESS` ← `PROTOCOL.poolFactory`
- `GLOBAL_WAR_CHEST` ← `PROTOCOL.safe`  *(DAO Safe — unchanged value, clearer label)*
- **`ESCROW_ECOSYSTEM` ← `PROTOCOL.escrow.ecosystem` (`0xd052C6F3…e708`)** — **bug fix**: today this constant holds `0xDc93eca9…ADe9`, which is `escrow.investors`. Every Phase 3 `proposeDistribution` is currently hitting the wrong escrow contract.
- Keep `SYSTEM_CASH_REGISTER` (`0x649436db…f0e3`) as a local constant — not in `contracts.ts`.

No behavioral changes to Phase 1/2/3 logic; only the address bindings move.

## 3. Refactor `supabase/functions/process-delt-transfer/index.ts`

Three coordinated relabels via the shared module:

- `IDIA_TOKEN_ADDRESS`: **`0x137D913…387B` → `PROTOCOL.idiaToken` (`0x6526F939…01FB`)**. Today this is pointing at the Registry contract; any ERC20 call against it reverts or no-ops.
- `REGISTRY_ADDRESS`: `0x463ce6…74F7` → `PROTOCOL.registry` (`0x137D913…387B`).
- `GLOBAL_WAR_CHEST`: `0xd052C6F3…e708` → `PROTOCOL.safe` (`0x0910EF34…5d59`). The old value is actually `escrow.ecosystem`, not the DAO Safe.

Walk every reference (ABI choice, fallback paths, ledger description strings) to confirm semantics still match the new labels.

## 4. Verification

- `grep` the repo for any remaining raw `0x` mainnet addresses outside `src/config/contracts.ts`, `supabase/functions/_shared/contracts.ts`, and the unrelated DEX/Uniswap files (`useWalletBalance.ts`, `usdc-approval.ts`, `uniswap-abi.ts`, `LiquidityPools.tsx`, `uniswap-pool-stats/index.ts`). Decide per-file whether to migrate or leave (USDC-only files can keep their inline constant — they are not protocol addresses).
- Run `tsc --noEmit` implicit via the build pipeline.
- Deploy `idia-circular-settlement` + `process-delt-transfer` and tail edge logs for the BOOT trace and chain-ID guard.
- No DB migration; no schema impact.

## Out of scope

- Implementing a testnet toggle in edge functions (the IDIA Life `ACTIVE_DEPLOYMENT` flag is for the frontend bundle; Hub edge functions stay hard-mainnet under the existing `8453` chain-ID guard).
- Rewriting any business logic in `execute-hub-query`, Phase batching, or ledger schema.
- Frontend usages of `PROTOCOL.*` — once `src/config/contracts.ts` exists, components can adopt it in follow-up work.

## Technical details

- Edge `_shared/contracts.ts` must not import from npm/esm registries — it's a pure data module so it stays Deno-friendly.
- Both files export `PROTOCOL` typed as `ProtocolAddresses` with the `escrow.{team,ecosystem,liquidity,investors,publicSale}` nested shape, so a future mislabel ("ecosystem vs investors") becomes a TypeScript-level distinction rather than a hex-string lookalike.
- The BOOT-guard `console.log` at module load lets us confirm at runtime which deployment a function loaded.
