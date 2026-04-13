

# Finalize Ledger Tethering & Purge Remaining PII

## Changes

### 1. `src/components/dashboards/IndividualDashboard.tsx` — Tab-based layout with live gauge
- Wrap content in `Tabs` with three tabs: **Overview**, **Usage Stats**, **Ledger Audit**
- Import `useSynapseCredits` and `useBillingData`; derive `liveBalance` from context
- Add `SynapseGasGauge` at top of Overview tab showing real ledger balance
- Move existing stat cards, performance, contributions, and quick actions into the Overview tab
- Usage Stats tab: display `currentUsage` metrics from `useBillingData` (used/limit credits, API calls, data export)
- Ledger Audit tab: placeholder card for future ledger transaction log
- Apply sticky header + scrollable content pattern (matching Hub Enrollment)

### 2. `src/components/onboarding/EcosystemOnboarding.tsx` — Connect progress to ledger
- Import `useBillingData` to get `currentUsage`
- Add a credit usage progress bar below the "Included With Verification" section showing `currentUsage.used / currentUsage.limit * 100`
- Display formatted used/limit values (e.g., "0 / 5,000 CR used")

### 3. `src/components/billing/SynapsePurchaseModal.tsx` — Purge PII inputs, add Worldpay SDK container
- Delete `cardNumber`, `cardExpiry`, `cardCvv` state variables and the `formatCardNumber` helper
- Remove the Card Number / Expiry / CVV input fields from the payment step
- Insert a `#worldpay-sdk-container` div with placeholder styling and "PCI-DSS Secure Port Initializing..." message
- Update `handlePurchase` to remove the card field validation check (the Worldpay SDK handles tokenization externally)
- Clear the `setCardNumber`/`setCardExpiry`/`setCardCvv` calls in `handleOpenChange`
- Update the "Pay" button label to "Authorize via Worldpay"
- Update FBO custody label from "Airwallex" to "Unit Banking"

## Result
- Individual Dashboard gains tabbed navigation with live Synapse Gauge
- Onboarding shows real credit usage progress
- Purchase modal is PCI-compliant with no raw card data in the DOM

