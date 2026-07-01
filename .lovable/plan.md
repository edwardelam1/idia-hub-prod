## Goal
Show real financial values when a user has a wallets row, and display `--` (not `$0`) when the data does not exist in the database. No backfill, no auto-provisioning, no placeholder rows.

## Root cause
- `useWalletBalance` and `SynapseCreditsContext` both coalesce missing data to `0`, so users without a `profiles.wallet_address` or a `wallets` row look identical to users with genuine zero balances.
- `StablecoinPanel` is hardcoded to `$0.0000` and ignores the ledger entirely.

## Changes (frontend only, no DB writes)

### 1. `src/hooks/useWalletBalance.ts`
- Change `WalletBalance` fields to `number | null`.
- Initial state: `{ usdc_balance: null, eth_balance: null }`.
- When no session, no `profiles.wallet_address`, or the on-chain read fails: leave values as `null` (do not overwrite to 0).
- Only set numeric values after a successful on-chain read.

### 2. `src/contexts/SynapseCreditsContext.tsx`
- Extend `ProtocolState` / `BalanceData` so `hub_operating_cash`, `fbo_royalty_balance`, `usdc_balance`, and a new `idia_token_balance` are `number | null`.
- After the `wallets` query: if `vault` is `null` (no row for this user), set all wallet-sourced silos to `null` instead of `0`. Only map to numbers when the row exists.
- `synapse_gas_credits` stays numeric (comes from RPC, independent silo).
- USDC keeps mirroring `useWalletBalance` — pass through `null` when unavailable.

### 3. `src/components/dashboards/IndividualDashboard.tsx`
- Replace `?? 0` fallbacks with pass-through of `null`.
- Add a small `formatSilo(value, formatter)` helper: returns `--` when value is `null`, otherwise the formatted string.
- Apply to the ETH card, USDC card, and Silo 3 (Yield) card.
- Synapse Credits card stays numeric.
- If we render an IDIA Token card here, use the same `--` treatment tied to `protocolState.idia_token_balance`.

### 4. `src/components/billing/FBOReservoirGauge.tsx`
- Read `balanceData?.fbo_balance` without `?? 0`.
- Render `--` (keeping the `USD` suffix) when the value is `null`.

### 5. `src/components/billing/StablecoinPanel.tsx`
- Stop hardcoding `$0.0000`. Read `balanceData?.usdc_balance` from `useSynapseCredits`.
- Render `--` when `null`, otherwise the formatted USDC value.

### 6. Downstream consumers that read the same fields
- `SynapsePurchaseModal.tsx` and `SynapseTopUp.tsx` currently do `walletBalance?.usdc_balance ?? 0` for gating logic. Keep the numeric fallback there (payment math must not break) but guard any *display* of the balance so it shows `--` when unknown.

## What we are NOT doing
- No `INSERT` into `wallets`.
- No triggers on `profiles`.
- No placeholder wallet addresses.
- No changes to edge functions or RLS.

## Verification
- User with a wallets row + real `profiles.wallet_address`: sees actual ETH, USDC, IDIA Token, and Silo 3 numbers.
- User missing the wallets row: all four cards render `--`.
- User with a wallets row but no on-chain address in profile: on-chain silos (ETH, USDC) render `--`, DB-backed silos (Silo 3, IDIA Token) render their real values.