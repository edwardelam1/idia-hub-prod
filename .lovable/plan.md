

# Implement Provenance Audit Log and Synapse Top-Up Pages

## Overview
Replace the placeholder Egress Logs page with a full Provenance Audit Log component, and add a dedicated Synapse Wallet Top-Up page -- both using the user-provided component designs adapted to the existing codebase patterns (TypeScript, shadcn/ui, fetchApi wrapper).

---

## 1. Add Mock API Endpoints

**File: `src/lib/api.ts`**

Add two new mock handlers to the existing `mockHandlers` map:

- **`/api/v1/delt/logs`** -- Returns an array of mock provenance log entries, each with: `provenance_id`, `egress_timestamp`, `liability_token_hash` (64-char hex), `aca_record_reference` (64-char hex), `hri_score_at_egress`, and `country_of_origin`. Include 4-5 sample entries with realistic data.

- **`/api/v1/billing/worldpay/initiate`** -- Returns a mock response with `payment_url: "#worldpay-mock"` and a `session_id`. Instead of redirecting to Worldpay in mock mode, the UI will show a success toast.

Also update the mock handler lookup to support query-string endpoints (currently `getMockResponse` does exact match; `/api/v1/delt/logs?client_id=X` won't match `/api/v1/delt/logs`). Fix by stripping query params before lookup.

---

## 2. Create Provenance Audit Log Component

**New file: `src/components/trading/ProvenanceAuditLog.tsx`**

Adapt the user-provided `ProvenanceAuditLog` component to TypeScript with proper typing:
- Accept `clientId` prop (default to `"ENT-MOCK"` for the mock context).
- Fetch logs from `fetchApi('/api/v1/delt/logs?client_id=...')` on mount.
- Display a table with columns: Egress Timestamp, Liability Token Hash (truncated, with copy-to-clipboard), ACA Reference (truncated, with copy), HRI Score (color-coded), Country of Origin.
- Loading state: spinner with "Synchronizing with DigiRAMP Ledger..." message.
- Error state: red alert banner.
- Empty state: "No DELT transfers recorded" message.
- Use shadcn `Table` components for consistency with the rest of the app, styled with the dark slate theme from the user's design.

---

## 3. Create Synapse Top-Up Component

**New file: `src/components/billing/SynapseTopUp.tsx`**

Adapt the user-provided `TopUp` component to TypeScript:
- Read current balance from `useSynapseCredits()` context.
- Display 4 pricing tiers: Scout Pack (1,000 CRD), Standard Acquisition (5,000 CRD), Enterprise Reserve (15,000 CRD, "Most Popular"), Volume Tranche (50,000 CRD).
- Exchange rate: $0.75/CRD.
- Right-side checkout summary card showing: current balance, selected credits, exchange rate, and total due in USD.
- "Continue to Worldpay" button calls `fetchApi('/api/v1/billing/worldpay/initiate')`. In mock mode (no real URL returned), show a success toast instead of redirecting.
- Security badges: "Encrypted & Secured by Worldpay" and "Corporate Cards & ACH Accepted".

---

## 4. Update Routes and Navigation

**File: `src/pages/Index.tsx`**
- Import `ProvenanceAuditLog` and `SynapseTopUp`.
- Replace the placeholder `/egress-logs` route with `<ProvenanceAuditLog clientId="ENT-MOCK" />`.
- Add a new route `/top-up` rendering `<SynapseTopUp />`.

**File: `src/components/layout/AppSidebar.tsx`**
- Add a "Top Up Wallet" menu item (icon: `Zap`, url: `/top-up`) in the base navigation items, positioned after "Synapse Ledger".

---

## Technical Notes

- The `fetchApi` mock handler lookup needs to strip query parameters before matching, so endpoint URLs like `/api/v1/delt/logs?client_id=X` resolve correctly.
- The Worldpay integration is mock-only for now; when the real AWS endpoint is configured via `VITE_API_BASE_URL`, the `payment_url` from the response will trigger a real redirect.
- The `ProvenanceAuditLog` uses the `useAuth()` context's `user_id` as fallback `clientId` if none is passed.

