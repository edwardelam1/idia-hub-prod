

# Fix Worldpay SDK Integration & Purge Remaining PII Inputs

## Problem
1. **SynapseTopUp** (`/top-up`): "Continue to Worldpay" calls `fetchApi('/api/v1/billing/worldpay/initiate')` which has no mock handler, causing the error "No mock handler for endpoint"
2. **BillingCredits** "Add Payment Method" dialog still collects card identifiers directly (Card Last 4, Bank Account Last 4) — residual PII input that should use the Worldpay SDK model

## Changes

### 1. `src/lib/api.ts` — Add Worldpay initiate mock handler
Add a mock handler for `/api/v1/billing/worldpay/initiate` that returns a simulated session with `payment_url: '#worldpay-mock'` and a `session_id`. This unblocks the top-up flow in dev mode while awaiting real Worldpay integration.

### 2. `src/components/billing/SynapseTopUp.tsx` — Replace checkout with Worldpay SDK container
- Replace the "Continue to Worldpay" button flow with the same Worldpay SDK container pattern used in `UniversalPurchaseScreen`
- Add a `#worldpay-sdk-container` mount point div with the dashed-border placeholder
- Keep the Volume Tranche / A La Carte selection and Transaction Summary intact
- Update the CTA button text to "Authorize via Worldpay"

### 3. `src/components/billing/BillingCredits.tsx` — Replace "Add Payment Method" dialog with Worldpay SDK port
- Remove the direct input fields for Card Brand / Card Last 4 / Bank Name / Account Last 4
- Replace with a Worldpay SDK container div inside the dialog (same pattern)
- Keep the Payment Type selector (credit card, debit card, bank ACH, wire, DEX wallet, IDIA Life wallet) for non-card methods
- For card/bank types: show the Worldpay SDK container instead of manual inputs
- For wallet types: keep the wallet address input (not PCI-scoped)

### 4. `src/hooks/useBillingData.tsx` — Verify base tier default
Confirm the `base` tier is present and set as default fallback (already done in previous update — verify no regression).

## Result
- No more "No mock handler" error on `/top-up`
- All card/bank PII capture delegated to Worldpay SDK containers
- Wallet address inputs preserved (not PCI-scoped)
- Consistent Worldpay SDK pattern across all three payment surfaces

