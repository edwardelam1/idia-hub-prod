## Scope

App Builder ONLY (`src/components/trading/PayAppBlueprint.tsx` + `src/taxonomy/*` + `src/hooks/useBusinessTaxonomy.ts`). No marketplace, no ledger, no edge functions touched.

## Current State (audited)

The taxonomy engine already exists and largely matches your spec, but with naming differences that we will preserve to avoid breaking existing consumers:

| Your spec | Existing in repo | Action |
|---|---|---|
| `'Job Shop' \| 'Batch' \| ...` | `'job_shop' \| 'batch' \| ...` (snake_case) | Keep snake_case (already wired into `production.ts`, `selectors.ts`) |
| `'Boutique' \| 'Mass Market' \| 'Platform'` | `'boutique' \| 'mid_market' \| 'mass_market'` | Keep existing — `Platform` is already covered by `NetworkModel='platform'` |
| `'hr' \| 'tech_dev'` | `'human_resources' \| 'technology'` | Keep existing |
| `quaternary.saas` (single node) | Already split into `saas.growth`, `saas.midmarket`, `saas.enterprise` | Keep — richer than spec |
| `hospitality` industry | `tertiary.hospitality` exists | Enrich with spatial telemetry meta + nano-bites |
| Telemetry constants | Not present | NEW |
| Spatial validator | Not present | NEW |
| App Builder consuming taxonomy | `PayAppBlueprint.tsx` uses its own hardcoded `verticalCategories` array | NEW: bridge to taxonomy engine |

The "meat" gap is mostly: (1) hospitality spatial telemetry, (2) the App Builder isn't yet reading from `src/taxonomy/`.

## Changes

### 1. Enrich Hospitality vertical — `src/taxonomy/industries/tertiary.ts`
Extend the existing `tertiary.hospitality` node's `meta` with the benchmarks, tech stack, and telemetry focus from your spec. Non-breaking (additive `meta` fields).

### 2. Add spatial nano-bites — `src/taxonomy/nanoBites/hospitality.ts`
Append 4 new bites to the existing array (keep the 2 already there):
- `hosp.ops.guest_flow_tracking` — AMCL guest-floor traversal (enterprise tier)
- `hosp.service.proximity_greeting` — UWB tag greeting trigger
- `hosp.ops.kitchen_telemetry` — Speed-of-Service via Elo Android
- `hosp.infra.spatial_audit` — LiDAR PMS update

Adds an optional `requiresTier?: 'basic' | 'pro' | 'enterprise'` field to `NanoBite` in `types.ts` (additive, non-breaking).

### 3. New telemetry module — `src/taxonomy/telemetry.ts` (NEW)
Holds `TELEMETRY_CONSTANTS` (LIGHT_SPEED, UWB_FREQUENCY_RANGE, IMU_SAMPLING_RATE_MIN) and `validateSpatialEvent()` with `[IDIA_PAY_VALIDATOR]` granular logs (STARTING/ENDING per your trace requirement). Exported from `src/taxonomy/index.ts`. Not placed in `production.ts` because that file already handles fixed/variable cost economics — keeping concerns separate.

### 4. Master assembly trace — `src/taxonomy/index.ts`
Add `initializeTaxonomy()` that logs `[IDIA_TAXONOMY_CORE]: STARTING / SUCCESS` and returns a hydrated registry `{ sectors, industries, nanoBites, archetypes }` — useful for App Builder bootstrap and debug panels.

### 5. Wire taxonomy into App Builder — `src/components/trading/PayAppBlueprint.tsx`
The App Builder currently has a 1186-line file with hardcoded `verticalCategories`. We will NOT delete that (it carries icons/colors used in the UI). Instead:
- Import `getIndustriesBySector`, `getNanoBitesFor`, `initializeTaxonomy` from `@/taxonomy`.
- When the user selects a vertical (e.g. `hospitality`), look up the matching `IndustryNode` by tag/id, then call `getNanoBitesFor({ industryId })` to render a new "Nano-Bite Tasks" panel below the sub-modules.
- For `hospitality`, surface a "Spatial Telemetry" badge populated from `industry.meta.telemetry_focus`.
- Each bite shows: `microElement`, `task`, `cadence`, `automatable` indicator, optional tier badge.

### 6. App Builder hook usage — `src/hooks/useBusinessTaxonomy.ts`
Already exists and does the right thing. Add one method: `getSpatialMetaFor(industryId)` returning `meta.telemetry_focus / benchmarks / tech_stack` for the hospitality panel. Keep its existing `[IDIA_CORE_OP]` logging style.

## Technical notes

- All log statements use the `[IDIA_TAXONOMY_CORE]` / `[IDIA_PAY_VALIDATOR]` / `[IDIA_CORE_OP]` STARTING-SUCCESS-ENDING pattern already established in `useBusinessTaxonomy.ts`.
- Type changes are strictly additive (new optional fields, new exports). No existing import will break.
- Snake_case enums (`job_shop`, `mid_market`, `human_resources`, `technology`) are retained — they're already used by `selectors.ts`, `positioning.ts`, `production.ts`, and the `merchant_blueprint.json` serializer. Switching to your PascalCase spec would break the serializer used by IDIA Pay.
- No DB migrations, no edge function changes, no marketplace changes.

## Files touched

- `src/taxonomy/types.ts` — add optional `requiresTier` to `NanoBite`
- `src/taxonomy/industries/tertiary.ts` — enrich hospitality `meta`
- `src/taxonomy/nanoBites/hospitality.ts` — add 4 spatial bites
- `src/taxonomy/telemetry.ts` — NEW
- `src/taxonomy/index.ts` — export telemetry + add `initializeTaxonomy`
- `src/hooks/useBusinessTaxonomy.ts` — add `getSpatialMetaFor`
- `src/components/trading/PayAppBlueprint.tsx` — render Nano-Bite + Spatial Telemetry panels for selected vertical
