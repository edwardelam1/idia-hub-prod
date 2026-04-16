

## Plan: Compact IndividualDashboard

**File:** `src/components/dashboards/IndividualDashboard.tsx` (+ small tweaks to `SynapseGasGauge.tsx`)

### Changes

**1. `SynapseGasGauge.tsx` — shrink to fit the tag-sized card**
- Reduce padding `p-5` → `p-3`, drop `shadow-lg`, remove `max-w-sm`.
- Header text `text-sm` → `text-xs`; icon `w-5 h-5` → `w-4 h-4`.
- Big number `text-4xl` → `text-2xl`.
- FBO subtitle, burn-rate row, and footer (wallet + status pill) — keep but reduce to `text-[10px]` and tighten margins (`mt-1` / `pt-2`).
- Result: matches the height/feel of the 3 sibling stat cards.

**2. `IndividualDashboard.tsx` — condense overview & make tabs fit without scroll**
- **Stat row (lines 91–130):** Convert Data Sources / Synapse Score / Data Assets from full Card panels to compact "tag" cards: single-line `CardContent p-3`, small label + inline bold value (e.g. `text-lg font-bold`). Synapse balance card gets matching padding.
- **Remove Quick Actions card (lines 184–200)** entirely (Connect Source / View Insights / Synapse Impact / Best Friend AI).
- **Usage Stats tab (lines 204–273):** 
  - Stat card values `text-2xl` → `text-xl`, headers `pb-2` → `pb-1`, content padding tightened.
  - Current Plan card: reduce padding, render features as inline chips instead of 2-col grid.
- **Ledger Audit tab:** Reduce empty-state `py-12` → `py-6`, icon `h-12 w-12` → `h-8 w-8`.
- **Outer layout:** Remove the outer `ScrollArea` wrapping TabsContent (lines 87, 294) so each tab sits naturally inside the parent flex container; trim Visualizer card padding (`pb-2` header stays, content gets tighter height) so the 4-card row + merged performance card fit in one viewport.

### Outcome
- Synapse Credit Balance card visually aligns with sibling stat cards (no oversized number).
- Overview, Usage Stats, and Ledger Audit tabs each fit in the visible viewport without internal scroll.
- Bottom action bar removed; stat cards become tag-style condensed.

