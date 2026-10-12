# Move Trading Desk API Access into Data Marketplace

## What will change
1. **Add a fifth Marketplace panel:** Add “Trading Desk API Access” beside SQL Terminal, AI Bundles, The Vulture, and Utilities. Selecting it will show the complete Trading Desk content directly underneath the Marketplace panel row, matching the existing panel behavior.
2. **Remove the separate menu item:** Remove “Trading Interface” from the sidebar. Existing `/trading` links will safely open the new Marketplace Trading Desk panel instead of leading to an obsolete separate page.
3. **Condense the Trading Desk summary:** Remove the Records Processed and Transactions cards entirely. Keep only Staged Data and Active Bundles in a compact two-column row on mobile and desktop, with smaller type, spacing, and card height.
4. **Fit the five Marketplace controls cleanly:** Use a compact five-column row where space allows and a tight responsive grid on smaller screens, while preserving the existing active-panel styling and existing role access rules.
5. **Preserve Trading Desk functions:** Keep Overview, API Keys, Endpoints, MCP, Monitoring, and Feature Feeds intact beneath the compact summary.

## Technical details
- Extend the Marketplace panel state with a Trading Desk option and render `TradingDeskDashboard` in the shared content area.
- Allow a Marketplace URL panel selector so legacy `/trading` navigation and internal Trading Desk links land with the correct panel already selected.
- Remove the standalone Trading Desk sidebar entry and replace the standalone route with a redirect to the Marketplace panel.
- Update any internal notification link that still points to `/trading`.
- Simplify `TradingDeskDashboard` imports after removing the two cards, and remove outer page padding that would be duplicated inside the Marketplace content area.
- Verify panel switching, compact two-card layout, legacy-link redirect, and mobile/desktop presentation; confirm the project builds cleanly.
