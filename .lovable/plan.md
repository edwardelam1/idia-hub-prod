

# Align Synapse Ledger with Egress Logs + Add Identity Pills & Earnings Settlement

## Overview

Three additions: (1) create the IdentityStatusPills component for the TopBar, (2) create the EarningsSettlement page with routing/nav, and (3) align all mock data so the provenance egress logs and settlement ledger tell a coherent financial story.

---

## 1. Align Mock Data in `src/lib/api.ts`

The current `/api/v1/delt/logs` mock returns 4 provenance records. The new settlement mock must derive from those same records so totals are consistent.

**Approach**: Each provenance log represents a Liability Shield transfer. Assign a revenue value per record based on `record_count * rate` (e.g., $0.75/record). The settlement balance will be the sum of completed transfers minus any already-settled amounts.

Add two new mock handlers:

- **`/api/v1/settlement/balance`** -- returns `available_balance`, `pending_balance`, `lifetime_earnings`, and `bank_last4` derived from the 4 egress log entries
- **`/api/v1/settlement/egress`** -- returns a success confirmation for ACH/RTP initiation

Example coherent numbers (based on 4 provenance logs totalling ~6,224 records at $0.75/record = ~$4,668 lifetime earnings, with some already settled):
- `lifetime_earnings`: 4,668.00
- `available_balance`: 2,134.50
- `pending_balance`: 313.50

---

## 2. Create IdentityStatusPills Component

**New file: `src/components/layout/IdentityStatusPills.tsx`**

Adapt the provided component to TypeScript with proper type annotations for `bioKeyStatus` and `kycTier` props. Place it in the TopBar between the welcome text and the action buttons, giving logged-in users a persistent view of their Bio-Key and KYC status.

**Edit: `src/components/layout/TopBar.tsx`**

Import and render `<IdentityStatusPills />` with defaults (`bioKeyStatus="STABLE"`, `kycTier={1}`) in the header bar, positioned after the welcome greeting.

---

## 3. Create EarningsSettlement Page

**New file: `src/components/billing/EarningsSettlement.tsx`**

Adapt the provided component to TypeScript:
- Props: `businessId` (string, defaults to a mock ID)
- Fetches from `/api/v1/settlement/balance` on mount
- "Settle to Bank Account" button POSTs to `/api/v1/settlement/egress`
- Displays available balance, pending clearing, lifetime earnings, and bank destination card
- Includes the FBO compliance disclaimer

**Edit: `src/pages/Index.tsx`**

Add route: `<Route path="/earnings" element={<EarningsSettlement />} />`

**Edit: `src/components/layout/AppSidebar.tsx`**

Add "Earnings & Settlement" nav entry (icon: `Landmark`) in the billing/finance nav group.

---

## Technical Notes

- The 4 provenance log entries in `/api/v1/delt/logs` remain unchanged. The settlement mock references the same record counts (1,243 + 672 + 418 + estimated from the other entries) to produce matching lifetime earnings.
- `IdentityStatusPills` defaults to `STABLE` / `kycTier=1` since all logged-in mock users pass the splash gate. These props can later be driven by a real identity context.
- The EarningsSettlement component uses the same `fetchApi` pattern and Worldpay egress branding as the rest of the billing system.

