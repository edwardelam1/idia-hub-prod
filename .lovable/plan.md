## Wire Activity Ledger to real data + close Wix → Hub credit gap

### What I found

Two independent problems, both contributing to the missing receipt:

**1. UI is hardcoded to empty.** `src/components/billing/BillingCredits.tsx` line 35:
```ts
const ledgerTransactions: any[] = [];
```
The "Historical Settlement Ledger" tab never queries `synapse_credit_ledger`, so even existing entries (your USDC top-ups, marketplace burns) never show. That's why the page reads "No financial activity detected".

**2. The Wix payment did not produce a ledger row.** Querying `synapse_credit_ledger` for your user (`217c6224-...`), the most recent entry is from 2026-05-15 (an internal_deposit of 5000). Nothing from today's Wix charge.

The old flow minted credits inside the `create-wix-payment` edge function. The new direct-to-Wix handoff (`SynapsePurchaseModal` POSTs `/_functions/checkout`, then redirects to `/idia-checkout?paymentId=...&returnUrl=/purchase?success=true`) hands off correctly but **nothing on the Hub side records the settlement** once Wix completes. Wix has your money; the Hub ledger doesn't know.

### Changes

**A. Fix the UI (immediate, makes existing entries visible):**

`src/components/billing/BillingCredits.tsx`
- Replace the hardcoded empty array with a TanStack Query against `synapse_credit_ledger` filtered by the current user, ordered by `created_at desc`, limit ~100.
- Map columns to the existing render shape:
  - `tx.reference` ← `description || transaction_type`
  - `tx.amount` ← `amount_usdc ?? amount` (deposit USD), or absolute USD-equivalent for fees
  - `tx.credits` ← `amount` (CR delta, sign preserved)
  - `tx.payment_method` ← `funding_source || transaction_type`
  - `tx.created_at` ← `created_at`
  - `tx.transaction_hash` ← `blockchain_tx_hash || circle_transfer_id || transaction_id`
- Show debits (negative `amount`) with a red icon and a `-` sign, credits with the existing emerald check.
- Keep the empty-state copy for true zero-rows.

No schema change. No write paths. Pure read.

**B. Close the Wix settlement loop (records future Wix purchases):**

Reintroduce a thin server-side credit step so that money received at Wix becomes a ledger row in `synapse_credit_ledger`. Two viable patterns — I need your call:

```text
Option 1 (recommended): Wix webhook → Supabase edge function
  Wix `paymentReceived` webhook POSTs to a new edge function
  `wix-payment-webhook` with { paymentId, userId, credits, amount }.
  Function verifies the signature/secret, then inserts an
  `entry_type='deposit'`, `transaction_type='wix_purchase'`,
  `status='completed'` row keyed by `transaction_id = paymentId`
  (idempotent on paymentId).

Option 2: Return-URL settlement
  When the user lands on `/purchase?success=true&paymentId=...`,
  the SPA calls a new `confirm-wix-payment` edge function which
  hits Wix's order-status API to verify, then inserts the same
  ledger row. Works without configuring webhooks but depends on
  the user actually returning to the Hub.
```

I will not implement (B) in this plan until you pick an option, because each path needs different secrets (Wix webhook signing secret vs. Wix API key) and different edge-function code.

### Files

- `src/components/billing/BillingCredits.tsx` — replace `ledgerTransactions` with a live query + small row adapter. UI-only.
- (Deferred until you choose) `supabase/functions/wix-payment-webhook/index.ts` **or** `supabase/functions/confirm-wix-payment/index.ts`.

### Out of scope

- Backfilling today's Wix charge into the ledger. Once you confirm the paymentId and choose an option above, I can insert that single row via the data tool as a one-time reconciliation.
