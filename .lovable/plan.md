## Problem

We've conflated three names that mean three different things — and one of them no longer exists:

| Name | What it actually is | Where it lives |
|---|---|---|
| **USDC** | Real on-chain stablecoin on Base | `useWalletBalance.ts` reads `balanceOf` from contract `0x8335…2913` |
| **IDIA-BETA** | Internal vault scrip (sidecar credits) | `wallets.idia_beta_balance` column |
| **IDIA-USD** | Decommissioned. Does not exist. | (nothing — purge all references) |

Two concrete bugs flow from this:

1. **`useWalletBalance` reads on-chain USDC but stuffs it into a field named `idia_beta_balance`** — the on-chain truth is being mislabeled as internal scrip.
2. **`idia-circular-settlement` writes to `wallets.stablecoin_balance`** — that column does not exist. Real columns are `idia_beta_balance`, `idia_usd_balance` (deprecated), `corporate_revenue`, `cash_balance`, etc. These payout writes are silently failing or erroring.
3. **`SynapseCreditsContext` invents a `stablecoin_balance` rail** by reading `idia_beta_balance` and labeling currency as `"IDIA-BETA"` while the dashboard tile labels it `USDC`. Three layers, three different names, none correct.

## Decision (confirmed with you)

- **USDC = on-chain only**, sourced from the Base contract via `useWalletBalance`.
- **IDIA-BETA = internal scrip**, kept in DB but **not surfaced** in the dashboard.
- **IDIA-USD = removed everywhere** — concept, label, currency string, dead.
- Dashboard "Rail 3" tile shows the **on-chain USDC reading from the contract**, not a DB column.

## Plan

### 1. `src/hooks/useWalletBalance.ts`
Rename the field so the on-chain truth is honestly labeled.
- `interface WalletBalance { usdc_balance: number }` (was `idia_beta_balance`)
- All `setBalance({ idia_beta_balance: … })` → `setBalance({ usdc_balance: … })`
- Update consumers: `SynapsePurchaseModal.tsx` reads `walletBalance?.idia_beta_balance` → `walletBalance?.usdc_balance` (and rename the local `availableInternalUSDC` to `availableUSDC` since "internal" is wrong — it's on-chain).

### 2. `src/contexts/SynapseCreditsContext.tsx`
Stop pretending `wallets.idia_beta_balance` is a stablecoin and stop emitting an IDIA-USD currency code.
- Drop `stablecoin_currency` from `BalanceData` (no replacement — IDIA-USD is dead).
- Rename `ProtocolState.stablecoin_balance` → `usdc_balance`.
- Source `usdc_balance` from `useWalletBalance` (on-chain) — **not** from `wallets.idia_beta_balance`.
- Remove the `idia_beta_balance` read from the wallets `.select(...)` (it stays in DB but isn't surfaced here).
- Update the `[END: Synapse.Engine]` log: `Beta[…]` → `USDC[…]`.

### 3. `src/components/dashboards/IndividualDashboard.tsx`
- `rail3_Stablecoin` → `rail3_USDC`, sourced from `protocolState?.usdc_balance`.
- Tile already labels "Rail 3: USDC" — keep label, drop the misleading "Beta" caption underneath; replace with "On-Chain (Base)".

### 4. `supabase/functions/idia-circular-settlement/index.ts`
Fix the broken column write (lines ~200–215). `wallets.stablecoin_balance` does not exist.
- Since payouts on the on-chain rail (`routing === "on-chain"`) settle via the actual USDC ERC-20 transfer above (`yieldHash`), the on-chain balance is already authoritative. **Remove the DB-side balance update entirely for on-chain settlements** — the ledger insert (`synapse_credit_ledger`) is the audit record; on-chain truth is read live by `useWalletBalance`.
- For `routing === "fiat"` payouts, credit `wallets.cash_balance` (Life royalty silo) instead, with `total_earned` increment, mirroring the existing `distribute_data_royalty` RPC pattern.

### 5. `supabase/functions/top-up-credits/index.ts`
Already correct in shape (writes `corporate_revenue` for fiat, would need on-chain handling). Audit the `targetColumn = routing === "on-chain" ? "stablecoin_balance" : "corporate_revenue"` line (~148) — the `stablecoin_balance` branch is also writing to a non-existent column. Replace with: on-chain top-ups should NOT update a DB balance column (USDC truth is on-chain); only insert the `synapse_credit_ledger` event with the `blockchain_tx_hash`.

### 6. Purge `IDIA-USD` literal strings
Sweep and remove the string `"IDIA-USD"` and `idia_usd_balance` reads from UI surfaces:
- `WithdrawCryptoModal.tsx` ("IDIA-USD → USDC", "Convert IDIA-USD to USDC") — relabel as "USDC withdrawal" (no conversion, it's already USDC).
- Any "stablecoin_currency" badge readers.

The DB column `wallets.idia_usd_balance` stays (no schema change) but is no longer read or written.

## Out of scope
- No DB migration. Schema stays; we're just removing reads/writes to a column that doesn't exist (`stablecoin_balance`) and ignoring the deprecated `idia_usd_balance`.
- IDIA-BETA stays in `wallets.idia_beta_balance` for backend bookkeeping but is no longer rendered.

## Files touched
- `src/hooks/useWalletBalance.ts`
- `src/contexts/SynapseCreditsContext.tsx`
- `src/components/dashboards/IndividualDashboard.tsx`
- `src/components/billing/SynapsePurchaseModal.tsx`
- `src/components/billing/WithdrawCryptoModal.tsx`
- `src/components/billing/StablecoinPanel.tsx` (label cleanup)
- `supabase/functions/idia-circular-settlement/index.ts`
- `supabase/functions/top-up-credits/index.ts`

## Verification
1. Dashboard "Rail 3: USDC" must equal the value `useWalletBalance` logs (on-chain `balanceOf`).
2. Run a small fiat top-up → `wallets.corporate_revenue` increments, no errors about missing `stablecoin_balance`.
3. Run an on-chain top-up → no DB balance write attempted; `synapse_credit_ledger` row created with `blockchain_tx_hash`; dashboard reflects new on-chain balance after next 15s poll.
4. `rg "stablecoin_balance|IDIA-USD|idia_usd_balance" src supabase/functions` returns zero hits.
