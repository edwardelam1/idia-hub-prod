# Mobile-first refit: MCP, API Keys, Endpoints, Feature Feeds

Goal: make the Trading Desk sections usable on a phone — no horizontal overflow, no clipped URLs, no cramped tables, and touch-friendly controls. Presentation-only changes; no data or business logic is touched.

## What changes

### Trading Desk shell
- Reduce page padding on small screens and shrink the header type scale.
- Tab bar: keep the 6 tabs readable on mobile as a horizontally scrollable row with icon + short label, instead of a squeezed 2-column grid that wraps oddly.
- Metric cards stack cleanly at one column with tighter spacing; long numbers wrap instead of pushing the card wide.

### MCP tab (MCP Configurator)
- The MCP server URL row is the main overflow offender: it currently sits in a fixed-min-width flex row with the copy/open buttons. On mobile it becomes a full-width block with the URL wrapping (break-all) above the action buttons.
- Tool catalog table: on mobile, render each tool as a stacked card (name, description, access badge, endpoint, schema link, enable switch) instead of a 5-column table. Keep the table on tablet and up.
- Config snippet `<pre>` blocks keep horizontal scroll but get smaller text and full-width containers, so they never widen the page.
- Two-column config grids collapse to one column below the tablet breakpoint.
- Schema sheet already goes full width; verify padding and scroll on small screens.

### MCP Live Telemetry
- Header row (title, status, controls) wraps instead of colliding.
- Telemetry key input goes full width; event rows wrap long tool names and timestamps.

### API Keys
- Newly created key block: URL/key code wraps and the copy/done buttons move below it on mobile.
- Key list rows: name, prefix, created/last-used metadata, and the action buttons stack vertically with full-width tap targets.

### Endpoints
- Method/path headers wrap; long paths use break-all.
- Sample request/response code blocks become scrollable, smaller-text panels contained to the viewport width.
- Filter/badge rows wrap.

### Feature Feeds
- Cards go to one column on mobile (already `lg:grid-cols-2`, verify inner content).
- Feed metadata row wraps rather than overflowing; the live stream console keeps a fixed height with horizontal scroll for long lines.

### Monitoring
- Metric cards stack; chart container gets a mobile-safe height and no forced min-width.

## Technical notes
- Files: `TradingDeskDashboard.tsx`, `MCPConfigurator.tsx`, `MCPLiveTelemetry.tsx`, `APIKeyManagement.tsx`, `APIEndpoints.tsx`, `FeatureFeedAccess.tsx`, `APIMonitoring.tsx`.
- Approach: Tailwind responsive utilities only — mobile base classes with `sm:`/`md:`/`lg:` overrides. No new dependencies.
- Tables get a dual render: `md:hidden` card list + `hidden md:block` table, sharing the same data and handlers (no duplicated logic beyond markup).
- Long identifiers (URLs, endpoints, key prefixes, hashes) use `break-all` / `truncate` with a copy affordance so nothing escapes the viewport.
- Verification: drive the preview with Playwright at a 390px-wide viewport, screenshot each tab, and confirm `document.documentElement.scrollWidth` equals the viewport width (no horizontal scroll).
