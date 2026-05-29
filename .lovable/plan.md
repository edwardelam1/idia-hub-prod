## Objective
Fix the Wix bridge hydration stall by appending missing `uid`, `amount`, and `credits` query parameters to the checkout redirect URLs in all three Hub payment dispatch components.

## Root Cause
The Wix `/idia-checkout` endpoint expects `uid`, `amount`, and `credits` in the query string to instantiate the payment session. All three Hub components currently only pass `paymentId` and `returnUrl`, causing the Wix bridge to receive a blank payload and stall.

## Files to Change

### 1. `src/components/billing/UniversalPurchaseScreen.tsx`
- **Location:** `handlePurchase` function, `window.location.href` redirect block (line ~122).
- **Change:** Append `&uid=${userId}&amount=${plan.price}&credits=${plan.credits}` to the Wix checkout URL.

### 2. `src/components/billing/SynapsePurchaseModal.tsx`
- **Location:** `handlePurchase` function, inside the `RAIL 1: WIX DIRECT PORT HANDSHAKE` block (line ~166).
- **Change:** Append `&uid=${session.user.id}&amount=${usdAmount}&credits=${Math.floor(displayCredits)}` to the `target` URL before redirect.

### 3. `src/components/billing/SynapseTopUp.tsx`
- **Location:** `handlePurchase` function, inside the `RAIL 1: WIX DIRECT PORT HANDSHAKE` block (line ~136).
- **Change:** Append `&uid=${session.user.id}&amount=${usdAmount}&credits=${Math.floor(displayCredits)}` to the `target` URL before redirect.

## Validation
- Verify all three `window.location.href` assignments now include `uid`, `amount`, and `credits`.
- Confirm the return URL structure remains intact (Wix must still receive `paymentId` and `returnUrl`).
- No other logic changes; USDC rail, ledger dispatch, and UI remain untouched.

## Expected Outcome
The Wix worker bridge receives a fully hydrated state payload on checkout initiation, eliminating the blank-slate stall and removing dependency on emergency fallbacks.