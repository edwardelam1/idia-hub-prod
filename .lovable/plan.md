# Business Taxonomy Engine — App Builder Only

The taxonomy module will be built as a self-contained data layer, but **the only consumer in v1 is `PayAppBlueprint.tsx`**. No other Hub module (Settings, Onboarding, Marketplace, Best Friend, MyReports, Compliance) will be touched.

---

## 1. New module: `src/taxonomy/`

Pure data + types + selectors. No UI, no Supabase, no side effects.

```text
src/taxonomy/
├── types.ts           Sector, Industry, Archetype, NanoBite, ValueChainStage,
│                       RevenueModel, ProductionMethod, TaxonomyNode, Classification
├── sectors.ts         Primary, Secondary, Tertiary, Quaternary, Quinary
├── industries/
│   ├── primary.ts     Extractive, Agricultural, Genetic, Harvesting
│   ├── secondary.ts   Manufacturing (Industrial + Consumer), Processing, Construction
│   ├── tertiary.ts    Retail (Boutique + Mass), Hospitality, QSR, Banking, Transport
│   ├── quaternary.ts  SaaS, Consulting, R&D, Creator (6 sub-models)
│   └── quinary.ts     Executive / Policy
├── archetypes.ts      8 HBS models + Pipe vs Platform flag
├── positioning.ts     Boutique ↔ Mass spectrum (variety, volume, lead time, pricing)
├── production.ts      JobShop | Batch | AssemblyLine | ContinuousFlow + breakEven()
├── valueChain.ts      Porter primary + support activities
├── nanoBites/         Task atoms keyed by (industryId, valueChainStage)
│   ├── retail.ts
│   ├── saas.ts
│   ├── consulting.ts
│   ├── creator.ts
│   ├── manufacturing.ts
│   └── ... one per seeded industry
├── codes/
│   ├── naics.ts       Curated ~200 codes covering seeded industries
│   └── gics.ts        Curated subset
├── selectors.ts       getNanoBitesFor(...), recommendArchetype(...), breakEven(...)
└── index.ts           Public surface
```

Isotropic shape — every node and bite shares one record type so any component
consuming `TaxonomyNode[]` or `NanoBite[]` works across every vertical.

```ts
interface NanoBite {
  id: string;
  industryId: string;
  valueChainStage: ValueChainStage;
  microElement: string;     // "Stock Control"
  task: string;             // "SKU labeling"
  cadence: 'daily' | 'weekly' | 'monthly' | 'event';
  automatable: boolean;
}
```

Break-even helper lives here:
```text
QBE = FC / (P − VC)
```

---

## 2. Hook: `src/hooks/useBusinessTaxonomy.ts`

Single seam used **only** by the App Builder. Includes the granular logging
pattern requested.

```ts
useBusinessTaxonomy(businessId: string) → {
  classification,                  // current selections (in-memory for v1)
  setClassification,
  hydrateNanoBites(stage),         // logs START / SUCCESS / FATAL / END
  recommendedArchetype(),
  breakEvenFor({ fc, vc, price })
}
```

No Supabase persistence in v1 — classification is held in App Builder local
state and serialized into the generated `merchant_blueprint.json`. Persistence
to a `business_classification` column is explicitly deferred.

---

## 3. Reusable components (App Builder only)

Dropped into `src/components/trading/blueprint/`:

- `<TaxonomyPicker depth="industry" />` — cascading Sector → Industry → Sub
- `<ArchetypeSlider />` — Boutique ↔ Mass slider; recomputes recommended
  production method + break-even live
- `<ValueChainStrip />` — horizontal Porter-chain selector
- `<NanoBitePanel stage cadence />` — renders filtered bites for a stage

All four are generic over `TaxonomyNode[]` / `NanoBite[]`.

---

## 4. Integration into `PayAppBlueprint.tsx` (the only touchpoint)

Add a new "Business Classification" step at the top of the blueprint flow,
before vertical/sub-module selection:

1. **Classification step** — `TaxonomyPicker` + `ArchetypeSlider` produce a
   `Classification { sector, industry, archetype, productionMethod }`.
2. **Value-chain step** — `ValueChainStrip` lets the merchant pick which
   stages their app covers (Inbound Logistics, Operations, Outbound, etc.).
3. **Nano-bite injection** — for each selected stage, `NanoBitePanel`
   surfaces industry-specific tasks. Selected bites become the app's
   data-capture / payment-trigger rails:
   - Boutique / Job Shop → milestone-based IDIA Pay triggers
     ("Consultation Complete", "Material Sourced")
   - Mass Market / Continuous Flow → high-velocity micro-transactions tied
     to sensor data or SKU scans
4. **Break-even widget** — inline `QBE = FC / (P − VC)` calculator showing
   real-time "Survival Velocity" once the merchant enters FC, VC, P.
5. **Blueprint output** — the existing `merchant_blueprint.json` gains a
   `taxonomy` block:
   ```json
   {
     "taxonomy": {
       "sector": "tertiary",
       "industry": "retail.boutique",
       "archetype": "job_shop",
       "productionMethod": "make_to_order",
       "valueChainStages": ["operations", "service"],
       "nanoBites": ["retail.ops.sku_labeling", "retail.svc.return_handling"],
       "breakEven": { "fc": 12000, "vc": 8, "price": 45, "qbe": 324 }
     }
   }
   ```

The existing vertical/sub-module UI in `PayAppBlueprint` stays — the new
classification flow runs **before** it and pre-filters the vertical list to
match the chosen sector/industry.

---

## 5. Coverage shipped in v1

- **Sectors:** all 5
- **Industries seeded with full nano-bite sets:** Extractive, Agricultural,
  Genetic, Harvesting, Manufacturing (Industrial + Consumer), Processing,
  Construction, Retail (Boutique + Mass), Hospitality, QSR, Banking,
  Transport, SaaS (Growth/Mid/Enterprise), Consulting, R&D, Creator
  (6 sub-models), Executive/Policy
- **Archetypes:** all 8 HBS models + Pipe/Platform flag
- **Production methods:** Job Shop, Batch, Assembly Line, Continuous Flow
  + break-even helper
- **Codes:** ~200 curated NAICS + GICS, structured to load full tables later

---

## 6. Explicitly out of scope (kept inside App Builder boundary)

- Settings → Business Profile classification card — **not touched**
- Ecosystem Onboarding vertical step — **not touched**
- Marketplace filters / bundle metadata — **not touched**
- Best Friend Store Clerk Mode — **not touched**
- MyReports / Compliance Dashboard — **not touched**
- Supabase `business_classification` column — **not added**
- Edge function bundle metadata changes — **not made**
- Per-bite SOP authoring UI

These remain available as future follow-ups but are not built now.

---

## Deliverables

1. `src/taxonomy/` module — types, seeded data, selectors, pure helpers
2. `useBusinessTaxonomy` hook with the granular `[IDIA_CORE_OP]` logging
3. Four reusable components under `src/components/trading/blueprint/`:
   `TaxonomyPicker`, `ArchetypeSlider`, `ValueChainStrip`, `NanoBitePanel`
4. `PayAppBlueprint.tsx` updated to host the classification step, value-chain
   step, nano-bite injection, break-even widget, and extended JSON output
5. No changes to any other Hub module, no DB migration, no edge function edits
