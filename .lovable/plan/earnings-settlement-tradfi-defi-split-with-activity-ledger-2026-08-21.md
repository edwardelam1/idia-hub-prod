# Earnings & Settlement: TradFi / DeFi split with Activity Ledger

Move the Activity Ledger out of the Financial Hub (Subscriptions/Billing) and into Earnings & Settlement, and give that page two settlement modes.

## What changes for the user

**Earnings & Settlement (`/earnings`)** gets a top-level toggle:

```text
[  TradFi (Bank / FBO)  |  DeFi (On-chain)  ]
```

- **TradFi view** — the current FBO-centric screen: available / pending / lifetime balances, verified bank destination, "Settle to Bank Account", Worldpay Egress badge, FBO custody disclaimer. Below it, a new **TradFi Activity Ledger** showing only fiat-rail movements (bank settlements, Wix/card purchases, invoice-backed entries) with the same expandable row detail the Financial Hub ledger has today.
- **DeFi view** — on-chain settlement: live wallet USDC / IDIA balances (Base mainnet, via the existing wallet balance hook), connected wallet address, a "Withdraw to Crypto Wallet" action reusing the existing withdraw modal, and a **DeFi Activity Ledger** showing only on-chain movements (entries carrying a blockchain tx hash / USDC amount / crypto funding source), with tx hashes linking out to BaseScan.
- Toggle choice persists across visits (localStorage) so users land in their preferred rail.

**Financial Hub (`/billing`)** loses its "Activity Ledger" tab. The remaining tabs (Network Overview, Invoice Archive, Protocol Tier) stay. Where the ledger was, a short pointer sends users to Earnings & Settlement. The Wix return-URL success banner keeps working and its "appears in the Activity Ledger below" copy changes to link to the new location.

## Ledger rows: what lands where

Both ledgers read the same source the Financial Hub used (`synapse_credit_ledger`, scoped to the signed-in user by RLS). Rows are split by rail:

- **DeFi**: row has a `blockchain_tx_hash`, or `funding_source` is a crypto rail (usdc / metamask / circle / on-chain).
- **TradFi**: everything else (wix, card, ach, internal settlement, invoice).

Each row keeps the existing columns — status icon, reference + timestamp, type badge, USD value, credits — and the existing expandable detail panel (settlement proof, gateway, compliance ID, unit price). No mock data; empty states say so plainly.

## Technical notes

- New shared component `src/components/billing/ActivityLedger.tsx`: extracted verbatim from the ledger block in `BillingCredits.tsx` (query + table + expand logic), parameterised by a `rail: "tradfi" | "defi"` prop and using the existing `["activity-ledger", userId]` query with client-side rail filtering, so the Wix `invalidateQueries` call keeps working unchanged.
- `EarningsSettlement.tsx`: wrap current content in a `Tabs` (or segmented toggle) with `tradfi` / `defi` values; extract the existing FBO body into a `TradFiSettlement` block and add a `DeFiSettlement` block using `useWalletBalance` and `WithdrawCryptoModal`.
- `BillingCredits.tsx`: remove the `ledger` `TabsTrigger` / `TabsContent`; keep the ledger query removal clean (query moves into the new component).
- BaseScan links use the existing Base mainnet convention already used in the liquidity page.
- No database or edge-function changes. Presentation/data-fetch layer only.
