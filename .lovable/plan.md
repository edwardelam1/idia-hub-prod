

## Plan: Stablecoin panel, dual payment, Hub Enrollment cleanup, A La Carte upgrade flow

### 1. IndividualDashboard panel grid (`src/components/dashboards/IndividualDashboard.tsx`)
The 5-column grid currently is: Synapse Gauge · FBO Reservoir · Data Sources · Audit Logs · Data Assets.

New 5-column grid:
1. Synapse Gauge (unchanged)
2. FBO Reservoir (unchanged)
3. **Stablecoin (NEW)** — placeholder panel for Circle USDC balance. Shows USDC icon, balance `$0.0000 USDC`, "Circle Network" subtitle. Will wire to live data later.
4. Data Sources (moved right one slot)
5. Audit Logs (moved right one slot)

Remove the **Data Assets** card entirely.

Standardize all 5 panels to identical typography:
- Label: `text-[11px] uppercase tracking-wide text-muted-foreground font-medium` (matching the existing Data Sources / Data Assets style — currently the Audit Logs card overrides with bold primary, which we'll normalize)
- Icon: `h-3.5 w-3.5 text-muted-foreground`
- Value: `text-lg font-bold`
- Sub-text: `text-[10px] text-muted-foreground`
- Card padding: `p-3`, `flex flex-col justify-between h-full`
- Remove the colored border/background on Audit Logs (`border-primary/20 bg-primary/[0.01]`) so all 5 cards look uniform.

The "Review Audit Logs" button stays inside the Audit Logs card but with neutral (non-primary) styling.

**New file**: `src/components/billing/StablecoinPanel.tsx` — small presentational component matching `FBOReservoirGauge` shape so the dashboard import stays clean.

### 2. Authorize Payment — split into USDC vs Worldpay (`src/components/billing/SynapsePurchaseModal.tsx`)
On the `step === 'payment'` view, add a 2-tab segmented control above the payment gateway area:
- **Worldpay** (default) — existing Worldpay SDK container + "Authorize via Worldpay — $X" button (unchanged behavior)
- **Stablecoin (Circle USDC)** — shows: USDC amount required (1:1 with USD), destination Circle deposit address (placeholder `0xCirc...IDIA`), copy-to-clipboard button, network selector (Ethereum / Polygon / Base — defaults Base), and an "I've Sent USDC — Confirm" button that runs the same `top-up-credits` invocation with `payment_reference: USDC-${uuid}`.

State: add `paymentRail: 'worldpay' | 'usdc'` local to the modal. Reset on close.

### 3. Hub Enrollment cleanup (`src/components/billing/BillingCredits.tsx`)
- Remove the **"Add Payment Method"** button + its Dialog from the sticky header (lines 89–148).
- Remove the **"Credits Remaining" badge** from the sticky header (lines 86–88).
- Remove the **Payment Methods** `<TabsTrigger>` (line 156) and the entire `<TabsContent value="payment">` block (lines 378–420).
- Drop now-unused imports/state: `showAddPM`, `pmType`, `pmLabel`, `pmIdentifier`, `addPaymentMethod`, `removePaymentMethod`, `setDefaultPaymentMethod`, `paymentMethods`, `PAYMENT_TYPES`, `Plus`, `Wallet`, `Landmark`, `Building`, `Select*`, etc.
- Header right-side becomes empty (or we leave the header div clean with just title/subtitle).

### 4. Remove Audit Logs page entirely
- Remove `<Route path="/audit-logs" ... />` from `src/pages/Index.tsx` (line 111).
- Remove `{ title: 'Audit Logs', url: '/audit-logs', icon: FileText }` from the super-admin block in `src/components/layout/AppSidebar.tsx` (line 72).
- Delete the file `src/components/audit/AuditLogs.tsx`.
- Remove the `<TabsTrigger value="audit-logs">` from `src/components/dashboards/SuperAdminDashboard.tsx` (line 85) and its corresponding `<TabsContent>` if present.
- Note: this is the **/audit-logs** page only. The **Egress Logs** / Provenance Audit Log page (`/egress-logs`) and the dashboard's "Audit Logs" stat card (which links to `/egress-logs`) both stay.

### 5. A La Carte → Available Plans (`src/components/settings/SettingsBilling.tsx`)
The Individual `IndividualBilling` component has an "Upgrade" button that does `window.location.href = '/onboarding'`. Change it to open the Available Plans dialog.

Approach: lift the existing `Available Plans` dialog (from `BillingCredits.tsx` lines 293–375) into a shared component **`src/components/billing/AvailablePlansDialog.tsx`** that accepts `open` / `onOpenChange` / `currentTier` props. Then:
- `BillingCredits.tsx` renders `<AvailablePlansDialog>` controlled by its existing `showPlans` state (no UX change there).
- `IndividualBilling` adds local `showPlans` state; the "Upgrade" button sets it to `true` and renders `<AvailablePlansDialog>`.

Button label stays "Upgrade", icon stays `ArrowRight`.

### Files touched
- `src/components/dashboards/IndividualDashboard.tsx` — panel reshuffle, font standardization, remove Data Assets
- **New** `src/components/billing/StablecoinPanel.tsx`
- `src/components/billing/SynapsePurchaseModal.tsx` — dual payment rail tabs
- `src/components/billing/BillingCredits.tsx` — remove header button/badge, remove Payment tab, use shared plans dialog
- **New** `src/components/billing/AvailablePlansDialog.tsx` — extracted shared dialog
- `src/components/settings/SettingsBilling.tsx` — upgrade opens plans dialog
- `src/pages/Index.tsx` — remove `/audit-logs` route
- `src/components/layout/AppSidebar.tsx` — remove Audit Logs nav item
- `src/components/dashboards/SuperAdminDashboard.tsx` — remove Audit Logs tab
- **Delete** `src/components/audit/AuditLogs.tsx`

### Notes
- Stablecoin panel is presentational only for now — no Circle API integration yet. When ready, we can wire it to a `useStablecoinBalance` hook + Circle SDC. Say the word if you want me to scaffold the live integration in the same pass.
- USDC tab in Authorize Payment is a manual-confirm flow (deposit-then-confirm). For automated detection we'd need a Circle webhook + watcher Edge Function — happy to add as a follow-up.

