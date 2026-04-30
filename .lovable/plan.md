# Pay App Blueprint — Wire Existing Modules + Fill Sub-Module Gaps

## What I missed (correcting course)

You already have a substantial module library. The real work isn't building from scratch — it's **wiring sub-modules to existing components** and only authoring new code where actual gaps exist.

**Existing reusable modules (already built):**
- `POSModule`, `LiveCheckout`, `MenuManagement`, `RecipeManagement`, `InventoryManagement` (with tabs: Products, Locations, Lots, Vendors, History, Ledger), `LocalInventory`, `ReportsModule` (with tabs: Sales, P&L, Labor, Inventory, Menu, Location), `LocalReports`, `TeamManagement`, `TimesheetModule`, `TaxCenter`, `MarketIntelligence`, `AffiliateManagement`, `XRManagement`
- `warehouse/`: Receiving, PutAway, Picking, Shipping, Counting, Trucking, Communications

The `ComponentRegistry` in `src/lib/module-registry.tsx` already exposes all of these under `default-*` keys. **Almost no new chassis components are needed.** What's missing is the **routing table** from sub-module IDs → composed module bundles.

## Current Gaps (verified)

1. **No sub-module → module bundle map.** `hosp-fine-dining` doesn't tell the loader to mount `POSModule + MenuManagement + RecipeManagement + InventoryManagement + ReportsModule + TeamManagement`.
2. **No sub-module → industryId map.** Nano-bites can't be hydrated per sub-module.
3. **Most nano-bite files are stubs** (5–10 lines). Hospitality is the only operational one.
4. **Blueprint JSON doesn't emit module bundles or per-sub-module bites** — downstream chassis has nothing to read.
5. **Industry tree is sparse.** Only ~10 of the 32 verticals have industry nodes.

## Revised Phase Plan

### Phase 1 — Routing infrastructure (the core of the work)

Single new file `src/taxonomy/payAppRouting.ts` exporting:

```text
SubModuleSpec {
  subModuleId: string;            // 'hosp-fine-dining'
  industryId: string;             // 'tertiary.hospitality.fine_dining'
  modules: string[];              // ['default-pos','default-menu','default-recipes',
                                  //  'default-inventory','default-reports','default-team']
  defaultBites: string[];         // optional curated starter set
}

PAY_APP_ROUTING: Record<string, SubModuleSpec>  // one entry per ~180 sub-modules
```

Each of the ~180 sub-modules gets one row mapping it to:
- The matching `industryId` (most reuse existing parents, e.g. all 8 hospitality sub-modules → existing `tertiary.hospitality.*` nodes; new child nodes only added where genuinely needed).
- A list of existing `ComponentRegistry` keys to mount.

Then update:
- `generateBlueprintJSON()` → emit `modules.bundles[]` per sub-module with `{ subModuleId, industryId, components: [...], nanoBites: NanoBite[] }`.
- `DynamicModuleLoader` (already exists) → already accepts a registry key; the chassis just iterates `bundle.components` and renders each in tabs/sections.
- `PayAppBlueprint.tsx` → after a sub-module is selected, show a small "Includes" badge list (POS · Inventory · Reports · …) so operators see what they're getting, plus a collapsible bite checklist.

### Phase 2 — Industry node fill-in

Split `tertiary.ts` and add per-vertical files only where missing nodes exist. Add ~120 child industry nodes (one per sub-module that lacks one). Lightweight — each node is ~5 lines.

### Phase 3 — Nano-bite operationalization (batched 6–10 verticals per turn)

Rewrite each stub bite file with 4–8 operational, brand-free bites per sub-module, tier-gated `basic | pro | enterprise`. Already-done verticals (Hospitality lodging + bar) are skipped. Order:

- **3a:** Logistics (6), Grocer (6), Retail (6), E-Commerce (4) — leans on warehouse modules already built.
- **3b:** Healthcare (8), Professional (5), Personal (5), Pet (5), Funeral (4), Fitness (6) — appointment + service bites.
- **3c:** Automotive (6), Manufacturing (5), Construction (6), Energy (5), Mining (4), Agriculture (5) — work-order + asset bites.
- **3d:** Travel (5), Marine (5), Aviation (5), Real Estate (5), Financial (6), Government (5), Telecom (5), Media (5), Non-Profit (5), Entertainment (6), Events (5), Security (4), Cannabis (4), Education (6), F&B Production (5).

Each bite gets `industryId`, `valueChainStage`, `microElement`, `task`, `cadence`, `automatable`, `requiresTier`. No third-party brand names.

### Phase 4 — QA + Coverage panel

- Add `getNanoBitesForSubModule(subModuleId)` selector.
- Add a small dev coverage panel in the Builder showing every sub-module with `bite count · module count` so any gap is visible.
- Smoke assertion at boot: every entry in `verticalCategories` has a matching `PAY_APP_ROUTING` row.

## What is NOT being rebuilt

- POS, Inventory, Menu, Recipes, Reports, Team, Timesheets, Tax, Warehouse modules — all reused as-is via `ComponentRegistry`.
- No new database tables. Bundle definitions are static config; selections persist in `device_provisioning_blueprints.payload` (existing jsonb column).
- No edits to the `auth`/`storage` schemas.

## Files Touched

**New**
- `src/taxonomy/payAppRouting.ts` — the master sub-module routing table.
- `src/taxonomy/industries/{logistics,grocer,healthcare,...}.ts` — per-vertical splits (Phase 2).

**Modified**
- `src/components/trading/PayAppBlueprint.tsx` — emit bundles + bites in JSON, render "Includes" + bite picker.
- `src/taxonomy/industries/index.ts` + `tertiary.ts` — re-export new files; trim parents that move out.
- `src/taxonomy/nanoBites/*.ts` — rewrite stubs with real operational bites (Phase 3).
- `src/taxonomy/nanoBites/index.ts` — re-export any new files.
- `src/taxonomy/selectors.ts` — add `getNanoBitesForSubModule`.

## Approval Asks

1. **Confirm reuse-first approach** — sub-modules compose existing `ComponentRegistry` modules; we don't build new top-level modules unless a vertical genuinely needs one (e.g., Cannabis age-gate, Cold Chain temperature log) which I'll flag inline as I hit them.
2. **Phase order OK?** Phase 1 (routing) → Phase 2 (industry nodes) → Phase 3a–3d (bite fill-in) → Phase 4 (QA panel). Each is one approved tool call.
3. **Bite depth** — default 4–8 per sub-module. Say "deeper" for 10–15.
