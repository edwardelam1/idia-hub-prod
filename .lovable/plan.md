# Fix: `top-up-credits` 400 — "Buyer wallet address is missing"

## Root cause

The error string `"VALIDATION_FAILED: Buyer wallet address is missing or 'undefined'. Received: undefined"` does **not** exist in the current repo source for `supabase/functions/top-up-credits/index.ts`. That means the **deployed** Edge Function is a stale/older revision than the file in the repo, and it is rejecting the request before any of the current logic runs.

In addition there is a real **payload contract mismatch** that will break the current repo version too as soon as it deploys:

- Frontend (`src/components/billing/SynapseTopUp.tsx`) sends:
  ```
  { user_id, credit_amount, usd_amount, user_wallet, payment_method: "usdc" | "worldpay" }
  ```
- Function (`supabase/functions/top-up-credits/index.ts`) reads:
  ```
  body.recipient_address    // never sent
  body.routing              // never sent → defaults to "fiat", on-chain branch skipped
  body.amount / body.credit_amount
  ```

So even after a fresh deploy, the on-chain path would never execute, and any future re-introduction of a wallet check would 400 again.

## Plan

Align both sides on a single, explicit contract and force a redeploy so the stale revision is replaced.

### 1. `supabase/functions/top-up-credits/index.ts`

- Accept the frontend's actual field names (`user_wallet`, `payment_method`, `credit_amount`, `usd_amount`).
- Derive `routing` from `payment_method` (`"usdc"` → `"on-chain"`, `"worldpay"` → `"fiat"`).
- Validate inputs with granular `[BEGIN: VALIDATION] / [END: VALIDATION]` logs and a clear error per missing field (so the next 400 tells us exactly which field is undefined).
- For the on-chain branch, require `user_wallet` (not `recipient_address`) and validate with viem `isAddress`.
- Keep the ledger + `wallets.corporate_revenue` hydration logic unchanged.
- Keep CORS headers identical so preflight stays green.

### 2. `src/components/billing/SynapseTopUp.tsx`

- Add `routing: paymentRail === "usdc" ? "on-chain" : "fiat"` to the payload (belt-and-braces; function will also derive it).
- Also send `recipient_address: activeAddress` alongside `user_wallet` for backward compatibility with any in-flight stale deploy.
- No UI changes.

### 3. Force redeploy

After the edits, explicitly redeploy `top-up-credits` so the current source replaces whatever stale revision is throwing the "Buyer wallet address" message. Then tail logs once with the test invocation to confirm the new `[BEGIN: VALIDATION]` lines appear.

### 4. Out of scope

- No changes to `idia-circular-settlement` (Viem logic).
- No changes to `synapse-controller` or `src/lib/api.ts` (already hardened in the previous turn).
- No DB migrations.

## Files touched

- `supabase/functions/top-up-credits/index.ts` — rewrite payload parsing + validation + logging.
- `src/components/billing/SynapseTopUp.tsx` — add `routing` and `recipient_address` to payload.
- Redeploy: `top-up-credits`.
