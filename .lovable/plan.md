# Add USDC / MetaMask payment rail to Complete Your Purchase screen

## Where

`src/components/billing/UniversalPurchaseScreen.tsx` — the `/purchase` route reached after selecting an Analyst / Professional / Enterprise plan. Today it only offers a Wix redirect ("Checkout via Wix Processing" → "Proceed to Wix Checkout").

## What's changing

Mirror the two-rail pattern already used in `SynapsePurchaseModal.tsx`:

1. **Payment rail selector** — a segmented control with two options:
   - **On‑Chain USDC (MetaMask)** — default when the user has enough USDC in their linked wallet
   - **Fiat (Wix Checkout)** — the current flow, kept as fallback
2. **USDC rail panel** (reused pattern from SynapsePurchaseModal):
   - Show USDC balance from `useWalletBalance`
   - If wallet not linked → "Connect MetaMask" button using `connectEmbeddedWallet` + persist `wallet_address` to `profiles`
   - If linked but insufficient balance → show shortfall + inline "Approve USDC" via `ensureUsdcApproval`
   - On submit → `supabase.functions.invoke("top-up-credits", { body: { user_id, usd_amount: plan.price, payment_method: "internal_usdc", plan_id: plan.id } })`, then navigate to `/billing?success=true`
3. **Wix rail panel** — keep existing UI and `handlePurchase` fetch to `/_functions/checkout`; only render when this rail is selected.
4. Auto-select the USDC rail when `availableUSDC >= plan.price`, otherwise default to Wix (same heuristic as the Synapse modal).

## Technical notes (dev only)

- Reuse: `useWalletBalance`, `connectEmbeddedWallet` from `@/lib/metamask-sdk`, `ensureUsdcApproval` from `@/lib/usdc-approval`, `supabase` client.
- `top-up-credits` already supports `internal_usdc` per the Synapse modal — no edge-function changes needed unless we discover it hard-codes the credit-tier amount. If it does, extend it to accept the plan's `usd_amount` and `plan_id` and credit the matching CRD (5000 / 20000 / 50000) accordingly. This will be verified in build mode; if changes are needed I'll flag them before touching the function.
- No schema changes.

## Out of scope

- No changes to `SynapsePurchaseModal`, `confirm-wix-payment`, or the settlement pipeline.
- No new payment provider — this uses the same on-chain USDC rail already live for credit top-ups.

## Question before I build

Should the Wix option stay as a fallback (recommended, matches the Synapse modal), or do you want Wix removed entirely so USDC is the only option on this screen?
