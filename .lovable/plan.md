

# Hub Enrollment: Scrollable Content & Enhanced Plans Dialog

## Changes

### 1. `src/components/billing/BillingCredits.tsx` — Sticky header with scrollable tab content
- Restructure the outer layout: make the page title + badge + button header and the `TabsList` bar sticky/fixed at top, with the `TabsContent` area in a scrollable container (`overflow-auto`, `flex-1`)
- Wrap the outer div in a flex column with `h-full` so it fills the available viewport, header stays pinned, content scrolls

### 2. `src/components/billing/BillingCredits.tsx` — Expand "View All Plans" dialog
- Replace the current 3-column grid with a **tabbed layout** inside the dialog (Analyst | Professional | Enterprise tabs)
- Each tab shows the full plan details matching the subscription panel style:
  - Plan name, price, description
  - **Full features list** from `PLAN_PRICING` in `useBillingData.tsx` (currently only shows credits + API calls)
  - **Usage limits** grid: Credits/year, API Calls/month, Data Export GB/month, Team Members
  - Current plan badge if applicable
  - Select/Upgrade button

### 3. `src/hooks/useBillingData.tsx` — Enrich feature lists
- Expand the `features` arrays for each tier to include all benefits:
  - **Analyst**: Foundational Filters, Basic Search, AI-Curated View, 5,000 CRD included, Standard Support, Basic Reporting, Single User Access
  - **Professional**: All Analyst features + Advanced Filters, Merchant Data Integration, Team Management, 20,000 CRD included, Priority Support, Custom Reports, API Access, Compliance Dashboard
  - **Enterprise**: All Professional features + Premier Filters, Developer API & Webhooks, Dedicated Account Manager, Enterprise SSO, 50,000+ CRD included, 24/7 Premium Support, White-Glove Onboarding, Custom SLAs, Unlimited Data Export

### 4. Export `PLAN_PRICING` from `useBillingData.tsx`
- Export the `PLAN_PRICING` constant so `BillingCredits.tsx` can reference full plan data in the dialog instead of the slim `PLANS` array

## Result
- Page title and tab bar stay fixed; tab content scrolls independently
- "View All Plans" dialog shows tabbed, full-detail plan cards matching the subscription panel format

