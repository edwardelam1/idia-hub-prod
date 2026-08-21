# Fix rail classification in the Activity Ledger

## Problem

The ledger currently treats "not on-chain" as "TradFi". Because almost every ledger row has an empty funding source, the TradFi tab is showing protocol fees, royalty yields, payout entries, manual adjustments and credit-usage debits — none of which are fiat-rail activity. Only fiat purchases (the Wix à la carte purchases, tagged `FIAT_FBO`) belong there.

Confirmed from the ledger data: of all rows, exactly one carries a fiat funding source (`FIAT_FBO`, "Wix à la carte purchase"). Everything else has no funding source; most of those carry an on-chain transaction hash, and the credit-usage fee rows carry neither.

## Change

Replace the "everything that isn't on-chain is TradFi" rule with an explicit classification:

- **TradFi rail** — only genuine fiat money movements: rows whose funding source indicates fiat (`fiat`, `fbo`, `wix`, `card`, `ach`, `wire`, `bank`), plus fiat credit purchases and bank settlements. This is where the Wix purchases land.
- **DeFi rail** — rows with an on-chain transaction hash or a Circle transfer ID, or a crypto funding source (USDC, MetaMask, wallet, Base).
- **Neither** — internal credit accounting that isn't a settlement on either rail (credit-usage fees, manual balance adjustments, free compute). These are hidden from both rails so the ledgers stay truthful; they remain visible as credit consumption in the Financial Hub.

Empty states stay as-is, so the DeFi tab reads "no on-chain settlement activity" when there is none, and TradFi shows only the handful of Wix rows.

## Technical notes

- Single file: `src/components/billing/ActivityLedger.tsx`.
- Add a `classifyRail(row): 'tradfi' | 'defi' | null` helper based on `funding_source`, `blockchain_tx_hash`, `circle_transfer_id`, and `transaction_type`; filter out `null` before rendering.
- No database or edge-function changes; no data is modified.
