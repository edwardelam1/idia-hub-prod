

# Worldpay SDK Port & Standard Individual Tier Default

Three surgical changes to downgrade the default tier, purge local PII capture, and create the Worldpay SDK mount point.

## Changes

### 1. `src/hooks/useBillingData.tsx`
- Add `base` tier to `PLAN_PRICING`: "Standard Individual", $10/query, 0 CRD, 100 API calls
- Change default fallback from `'analyst'` to `'base'` (line 111-112)
- Update `addPaymentMethod` mutation signature to accept `paymentToken` instead of raw card fields; store as `method_type: 'worldpay_token'`

### 2. `src/components/billing/UniversalPurchaseScreen.tsx`
- Remove `cardNumber`, `cardExpiry`, `cardCvv` state variables (lines 30-32)
- Remove the entire manual card input section (lines 177-189) — replaced with a Worldpay SDK container div (`id="worldpay-sdk-container"`)
- Update `handlePurchase` validation: remove CC field checks, gate on `selectedPM` or future Worldpay token
- Add `handleWorldpayResponse(token)` stub for SDK integration
- Remove unused `Input` and `Label` imports
- Update purchase button text to "Authorize & Enroll"
- Add PCI-DSS Level 1 badge below the SDK container

### 3. No database changes needed
Payment method rows will use `method_type: 'worldpay_token'` going forward — the existing `user_payment_methods` table already supports arbitrary `method_type` strings.

