## Wix → Hub settlement: Option 2 now, Option 1 as backstop

### Goal
Make every Wix payment land in `synapse_credit_ledger` so the Historical Settlement Ledger always reflects reality. Ship the return-URL path first (no Wix-side work), then add the webhook as a durable backstop. Backfill the missing $2.00 charge from today.

### Phase 0 — Backfill the missing receipt (one-time)

Insert the row for the May 16, 2026 charge so the ledger shows it immediately after Phase 1 lights up the UI query:

- `transaction_id`: `f438ad12-23c9-478d-842c-aa321a1d6580`
- `user_id`: `217c6224-...` (current user)
- `entry_type`: `deposit`
- `transaction_type`: `wix_purchase`
- `amount` (CR): `2.6666666666666665` (2.00 / 0.75)
- `amount_usdc`: `2.00`
- `funding_source`: `wix`
- `status`: `completed`
- `description`: `Wix à la carte purchase ($2.00)`

Done via a single `INSERT` migration, idempotent on `transaction_id`.

### Phase 1 — Option 2: Return-URL settlement (ship first)

**New edge function `confirm-wix-payment`** (`verify_jwt = true`, default):

Inputs (JSON body):
```
{ paymentId: string }
```

Steps:
1. Authenticate caller via JWT; resolve `user_id`.
2. Call Wix Orders/Payments status API for `paymentId` using `WIX_API_KEY` + `WIX_SITE_ID` secrets.
3. Reject unless Wix reports `status === "paid"` / `approved`.
4. Read returned `amount` (USD) and compute `credits = amount / 0.75`.
5. `INSERT ... ON CONFLICT (transaction_id) DO NOTHING` into `synapse_credit_ledger` keyed by `paymentId`.
6. Return `{ ok: true, alreadyRecorded: boolean, credits, amount }`.

**Frontend wiring** (`src/components/billing/UniversalPurchaseScreen.tsx` + `SynapsePurchaseModal.tsx`):

- On mount, if `searchParams.get("success") === "true"` and `paymentId` is present in the URL, call `supabase.functions.invoke("confirm-wix-payment", { body: { paymentId } })`.
- While the call is in flight, keep the existing success screen but show "Verifying payment with Wix…".
- On success, toast the credited amount and invalidate the `synapse_credit_ledger` query so `BillingCredits` re-renders.
- On failure (Wix says not paid, network error), show a non-blocking warning with a "Retry verification" button — do NOT credit speculatively.

**Wix-side change (one-line):** update the `returnUrl` builder so it includes the `paymentId`:
```
/billing?success=true&paymentId={paymentId}
```
`UniversalPurchaseScreen` already passes the encoded returnUrl when redirecting; just include the placeholder Wix will expand.

### Phase 2 — Option 1: Wix webhook backstop

**New edge function `wix-payment-webhook`** (`verify_jwt = false`, signature-checked):

1. Read raw body + `x-wix-signature` header.
2. HMAC-SHA256 verify against `WIX_WEBHOOK_SECRET`. Reject mismatches with 401.
3. Parse `{ paymentId, userId, amount, status, metadata }`.
4. Only act when `status === "paid"`.
5. Same `INSERT ... ON CONFLICT (transaction_id) DO NOTHING` as Phase 1, same column shape.
6. Return 200 quickly; log all rejections.

Because both code paths use the same idempotency key (`paymentId`), they cannot double-credit. Whichever arrives first wins; the other is a no-op.

**Wix configuration** (user does this once in Wix Automations):
- Trigger: Payment received
- Action: HTTPS POST to `https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/wix-payment-webhook`
- Add `x-wix-signature` header signed with the shared secret

### Phase 3 — Verify

- Reload `/billing`, confirm Historical Settlement Ledger shows the backfilled $2.00 row plus prior entries.
- Run a fresh $1 Wix test charge end-to-end: confirm Phase 1 inserts the row on return, then confirm Phase 2 logs an `alreadyRecorded` no-op when the webhook fires.

### Secrets needed

- Phase 1: `WIX_API_KEY`, `WIX_SITE_ID` (read from Wix dashboard → Settings → Headless / API Keys)
- Phase 2: `WIX_WEBHOOK_SECRET` (any strong random string; user pastes the same value into Wix Automation header signing config)

I will request these via the secrets tool only after you approve this plan.

### Out of scope

- Refunds / chargebacks reversal entries (Wix doesn't emit those today on this account).
- Periodic reconciler that scans Wix orders older than N minutes — easy to add later as a third backstop if either path ever drifts.

### Files touched

- New: `supabase/functions/confirm-wix-payment/index.ts`
- New: `supabase/functions/wix-payment-webhook/index.ts`
- Edit: `src/components/billing/UniversalPurchaseScreen.tsx` (verification call on success-return)
- Edit: `src/components/billing/SynapsePurchaseModal.tsx` (same verification hook for à la carte path)
- Migration: one-time backfill `INSERT` for `f438ad12-…`
- `supabase/config.toml`: add `[functions.wix-payment-webhook] verify_jwt = false`
