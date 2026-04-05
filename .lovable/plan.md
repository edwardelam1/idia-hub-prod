

# Plan: Synthetic Peg IDIA-USD Credit System

This is a large architectural upgrade that migrates the existing CRD-based credit system to a proper IDIA-USD synthetic peg model with Circle USDC backing, a crypto withdrawal off-ramp, and a data sale revenue distribution engine with Flare Network receipts.

---

## Part 1: Database Migration — Immutable Ledger v2

The existing `synapse_credit_ledger` table has columns: `amount`, `balance_after`, `entry_type` (text), `description`, `reference_id`, `metadata`, `user_id`. We need to evolve this schema.

**Migration SQL:**

1. Create enums:
   - `idia_transaction_type` = `('DATA_SALE', 'DEPOSIT', 'WITHDRAWAL', 'FEE', 'REWARD')`
   - `idia_transaction_status` = `('PENDING', 'SETTLED', 'FAILED')`

2. Add new columns to `synapse_credit_ledger`:
   - `transaction_id` (TEXT, UNIQUE) — idempotency key
   - `transaction_type` (idia_transaction_type) — defaults to `'DEPOSIT'`
   - `amount_idia_usd` (DECIMAL(10,4)) — the IDIA-USD amount (4 decimal precision)
   - `balance_idia_usd` (DECIMAL(10,4)) — running balance after this tx
   - `status` (idia_transaction_status) — defaults to `'SETTLED'`
   - `destination_wallet` (TEXT, nullable) — for withdrawals
   - `circle_transfer_id` (TEXT, nullable) — Circle API reference
   - `flare_tx_hash` (TEXT, nullable) — Flare Network receipt hash

3. Backfill existing rows: map `entry_type` values to new enums, copy `amount` -> `amount_idia_usd`, `balance_after` -> `balance_idia_usd`, set `status` = `'SETTLED'`, generate `transaction_id` from `reference_id` or `id`.

4. Add index on `(user_id, created_at DESC)` for fast balance lookups.

5. RLS: Users can only `SELECT` their own rows (`auth.uid() = user_id`). Service role handles inserts.

---

## Part 2: Formatting Utilities & Context Updates

### `src/lib/utils.ts`
- Add `formatIdiaUsd(amount: number): string` — formats to exactly 4 decimal places with `$` prefix (e.g., `$5.0000`).

### `src/contexts/SynapseCreditsContext.tsx`
- Rename internal references from CRD to IDIA-USD.
- Fetch latest `balance_idia_usd` from ledger (fall back to `balance_after` for compatibility).
- Update Realtime subscription to read `balance_idia_usd` from new INSERT payloads.
- On Realtime INSERT, trigger a toast: `"Ledger Updated: +$X.XXXX"` (or negative for withdrawals).
- Expose `currency: 'IDIA-USD'` instead of `'SYNAPSE_GAS'`.

---

## Part 3: Wallet UI Updates

### `src/components/billing/SynapseGasGauge.tsx`
- Change header from "Synapse Gas" to "IDIA-USD Balance".
- Replace "CRD" suffix with "IDIA-USD".
- Use `formatIdiaUsd()` for all displayed amounts.
- Add subtitle beneath balance: `"Backed 1:1 by USDC · Powered by Circle"` in muted text.

### `src/components/settings/SettingsBilling.tsx`
- Update BusinessBilling card labels from "CRD" to "IDIA-USD".
- Apply 4-decimal formatting to all balance displays.
- Add "Powered by Circle USDC" descriptor to the Synapse Credit Ledger card.

### `src/components/billing/SynapsePurchaseModal.tsx` & `SynapseTopUp.tsx`
- Update all "CRD" labels to "IDIA-USD".
- Apply `formatIdiaUsd()` formatting throughout.

---

## Part 4: Withdrawal Off-Ramp

### Edge Function: `supabase/functions/withdraw-to-crypto/index.ts`
- Accepts `{ user_id, amount, destination_address }`.
- Validates balance >= amount from latest ledger row.
- Inserts a `WITHDRAWAL` row with negative `amount_idia_usd`, status `PENDING`.
- Makes POST to Circle `/v1/transfers` API using `CIRCLE_API_KEY` and `CIRCLE_MASTER_WALLET_ID` secrets.
- On success: updates ledger row status to `SETTLED`, stores `circle_transfer_id`.
- On failure: inserts compensatory `DEPOSIT` row to refund, returns error.
- **Secrets needed**: `CIRCLE_API_KEY`, `CIRCLE_MASTER_WALLET_ID` (must be added).

### Withdrawal UI: New modal component `src/components/billing/WithdrawCryptoModal.tsx`
- Amount input (validated against balance, min $1.0000).
- Web3 wallet address input (validated for 0x format, 42 chars).
- Summary showing amount, network fee estimate, net amount.
- Submit button triggers `withdraw-to-crypto` edge function.
- Accessible from the Wallet/Billing UI via a "Withdraw to Crypto" button.

---

## Part 5: Data Sale Ingestion Engine

### Edge Function: `supabase/functions/process-data-sale/index.ts`
- Triggered by Worldpay webhook (payment success).
- **Revenue Split** (100% accounted):
  - 30% → User Liquidity Pool (distributed to data contributors)
  - 60% → IDIA Revenue (platform)
  - 5% → Burn (deflationary mechanism)
  - 5% → Community Pool
- For each contributing user in the bundle, calculate their weighted share of the 30% pool.
- Insert `DATA_SALE` transaction into each user's `synapse_credit_ledger` with their IDIA-USD amount.
- **Flare Network Receipt**: Convert the user's earned fiat to 18-decimal BigInt for Flare Coston2 Testnet (`amount * 10^18`). Prepare transaction payload for AWS KMS signing, transferring from Master Treasury. Respect the 1 Billion token hardcap.
- Store the `flare_tx_hash` on the ledger row.
- **Secrets needed**: `FLARE_RPC_URL`, `AWS_KMS_KEY_ID`, `IDIA_TREASURY_ADDRESS` (must be added).

---

## Files Modified
1. **New migration** — schema evolution for synapse_credit_ledger
2. `src/lib/utils.ts` — add `formatIdiaUsd()`
3. `src/contexts/SynapseCreditsContext.tsx` — IDIA-USD context + toast on realtime
4. `src/components/billing/SynapseGasGauge.tsx` — rebrand to IDIA-USD
5. `src/components/settings/SettingsBilling.tsx` — IDIA-USD labels
6. `src/components/billing/SynapsePurchaseModal.tsx` — IDIA-USD labels
7. `src/components/billing/SynapseTopUp.tsx` — IDIA-USD labels
8. **New**: `src/components/billing/WithdrawCryptoModal.tsx` — withdrawal UI
9. **New**: `supabase/functions/withdraw-to-crypto/index.ts` — Circle off-ramp
10. **New**: `supabase/functions/process-data-sale/index.ts` — revenue split + Flare receipt
11. `supabase/functions/top-up-credits/index.ts` — update to use new columns

## Secrets Required (to be added before implementation)
- `CIRCLE_API_KEY` — Circle API authentication
- `CIRCLE_MASTER_WALLET_ID` — Source wallet for USDC transfers
- `FLARE_RPC_URL` — Flare Coston2 Testnet RPC endpoint
- `AWS_KMS_KEY_ID` — KMS key for signing Flare transactions
- `IDIA_TREASURY_ADDRESS` — Master treasury contract address on Flare

