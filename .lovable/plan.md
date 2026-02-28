

# Add Synapse Terminal to Data Marketplace

## Overview
Create a new `MarketplaceTerminal` component and embed it at the top of the Data Marketplace page. This terminal lets any user run metadata queries against the Synapse Engine, costing 1 CRD per query. Also add the corresponding mock API handler.

---

## 1. Add Mock API Handler

**File: `src/lib/api.ts`**

Add a new entry to `mockHandlers`:

```text
'/api/v1/synapse/query' -> returns mock query results with sample Iceberg Lakehouse metadata (e.g., a few anonymized records with fields like region, device_os, hri_score, record_count).
```

---

## 2. Create MarketplaceTerminal Component

**New file: `src/components/marketplace/MarketplaceTerminal.tsx`**

Adapt the provided component to TypeScript:
- Props: `synapseBalance` (number, default 0) and `isBioKeyVerified` (boolean, default false)
- Uses `fetchApi` to POST to `/api/v1/synapse/query`
- Dark slate terminal UI with traffic-light header dots, CRD balance display, bio-key warning banner, textarea input, cost indicator (1.00 CRD / $0.75), Run Query button, and JSON results area
- Wire the `useSynapseCredits` context to feed the real balance into the component from the parent

---

## 3. Integrate into DataMarketplace

**File: `src/components/marketplace/DataMarketplace.tsx`**

- Import `MarketplaceTerminal`
- Import `useSynapseCredits` context
- Read `balanceData?.available_credits` for the synapse balance
- Place `<MarketplaceTerminal>` between the header/filters section and the bundle results grid
- Pass `synapseBalance` from context and `isBioKeyVerified={true}` (defaulting to verified since all logged-in users pass the splash/login gate)

---

## Technical Notes
- The mock handler for `/api/v1/synapse/query` will return sample metadata rows so the terminal is functional in dev mode without a real backend.
- The component uses native `textarea` styled with Tailwind (matching the provided design) rather than the shadcn Textarea, to preserve the monospace terminal aesthetic.
- "DELT" will not appear in any user-facing text per the branding rule; the description references "Liability Shield" transfers.

