# Compact Marketplace Controls and Collapsible Bundles

## Changes

- Arrange the marketplace tool buttons in a compact **2 × 2 grid on mobile**. Keep the current permission rules, so users only see tools available to their role.
- Make every marketplace bundle **collapsed by default on all screen sizes**.
- In the collapsed state, show only the complete bundle title and a clear expand control.
- Expanding a bundle reveals its existing freshness, description, insights, data points, statistics, features, and purchase actions without changing their behavior.
- Add **Expand All** and **Collapse All** controls above the bundle list.
- Keep individual bundles independently expandable after either bulk action.
- Ensure filtering or changing the time window keeps the visible bundle list in a consistent collapsed/expanded state.

## Technical details

- Manage bundle expansion by bundle ID in the marketplace parent so individual and bulk controls stay synchronized.
- Convert each bundle card to a controlled collapsed/expanded view and use accessible expanded-state labels.
- Preserve the existing one-column bundle list on smaller screens and two-column list on large screens.
- Verify the result at the current mobile viewport and on desktop, including long titles and all bundle actions.
