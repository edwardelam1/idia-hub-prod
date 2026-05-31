## Move credit math to the backend; ship a lean on-chain payload

The 400 is coming from `credit_amount` being a repeating decimal (`2.6666…`) computed in the UI and rejected downstream. On-chain we only move `usd_amount`; credit issuance is a server-side concern tied to the protocol conversion rate (1 CR = $0.75).

### Behavior

- Frontend dispatch for "Pay from Wallet" sends only what the relayer + ledger need:
  ```ts
  {
    user_id,
    usd_amount: Number(usdAmount),
    payment_reference,
    payment_method: 'internal_usdc',
    routing: 'on-chain',
    idempotency_key,
    user_wallet: profile.wallet_address, // still required for on-chain routing
  }
  ```
  No `credit_amount`, no `amount`, no division in the UI.
- Edge function derives `credit_amount` server-side from `usd_amount` using the canonical rate, rounded to 4 decimals (matches the Hub credit-nomenclature memory).

### Files

- `src/components/billing/SynapseTopUp.tsx`
  - In `handlePurchase`, drop `credit_amount` from the `top-up-credits` invocation body for the on-chain path. Keep `usd_amount`, `user_wallet`, `payment_method: 'internal_usdc'`, `routing: 'on-chain'`, `payment_reference`, `idempotency_key`, `user_id`.
  - Leave fiat/Wix path untouched.

- `src/components/billing/SynapsePurchaseModal.tsx`
  - Same edit in its `handlePurchase` on-chain branch.

- `supabase/functions/top-up-credits/index.ts`
  - In `PARSE_PAYLOAD`, treat `usd_amount` as the source of truth when present. If `credit_amount` is absent/zero, compute `credit_amount = round(usd_amount / 0.75, 4)`.
  - Update `VALIDATION` so `usd_amount > 0` is the required check; `credit_amount` is derived, not required from the client.
  - Ledger insert continues to write both fields; metadata records the server-applied rate (`rate_usd_per_cr: 0.75`).

### Out of scope

- No changes to `chargeBuyerUsdc`, `usdc-approval`, MetaMask SDK, shortfall UI, Wix rail, or `SynapseCreditsContext`.
- No schema changes; the ledger already accepts the computed `amount` (credit_amount).

### Technical notes

- Conversion rate (`$0.75/CR`) lives in the edge function as a single constant so the UI never needs to know it for on-chain purchases. The A-La-Carte purchase memory (custom $10–$1000 @ $0.75/CR) is preserved.
- Idempotency key behavior unchanged — replay still returns the prior ledger row.
