

# Condense Overview Tab in IndividualDashboard

## Changes

### `src/components/dashboards/IndividualDashboard.tsx`

**Reorganize the Overview tab into a tighter, single-scroll layout:**

1. **Top row**: SynapseGasGauge + 3 stat cards in a single `grid-cols-2 md:grid-cols-4` row (remove the `md:row-span-2` on the gauge — make it the same height as the stat cards)

2. **Middle row**: Merge "Asset Performance" and "Recent Contributions" into a single compact card with two columns side-by-side, reducing vertical space

3. **Quick Actions**: Shrink from 4 separate bordered boxes to a single inline row of icon+label pairs inside one card, using `flex gap-4` instead of a grid of bordered divs

4. **Reduce padding**: Use `space-y-3` instead of `space-y-4`, and `gap-3` instead of `gap-4` on the grids. Use `p-4` instead of `p-6` on card headers/content for the overview cards

**Net effect**: Overview goes from 3 vertical sections with generous spacing to a compact, scannable single-page view without removing any information.

