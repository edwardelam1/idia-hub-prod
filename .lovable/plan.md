

# Rename Synapse Ledger to Hub Enrollment & Consolidate Overview (Revised)

## Changes

### 1. `src/components/layout/AppSidebar.tsx` — Navigation updates
- Remove the "Hub Enrollment" sidebar item (the one pointing to `/onboarding` under Compliance)
- Rename "Synapse Ledger" to "Hub Enrollment" (keeps `/billing` route)

### 2. `src/components/billing/BillingCredits.tsx` — Consolidate layout
- Change page title from "Billing & Credits" to "Hub Enrollment"
- Move the four stat cards (Current Usage, Plan, Projected Usage, Next Billing) into a new "Overview" tab
- Update `Tabs defaultValue` to `"overview"`
- Tab order: **Overview** | **Invoices** | **Subscription** | **Payment Methods**

### 3. `src/components/billing/SynapseGasGauge.tsx` — Minor text
- Update loading text from "Querying Synapse Ledger..." to "Querying Hub Enrollment..."

### NOT changed
- `/onboarding` route and `EcosystemOnboarding` remain intact in `Index.tsx`

