# Fix MCPLiveTelemetry tooltip + add tooltips across the MCP tab

## Why the current tooltip doesn't fire

`TooltipTrigger asChild` uses Radix `Slot`, which requires the child to forward its `ref`. The shadcn `Badge` in this repo is a plain `<div>` with no `forwardRef`, so Radix silently can't attach the trigger. Same issue on the `<span>` inside the events row when it's the only child. Fix: wrap the trigger child in a `<span tabIndex={0}>` (keyboard-focusable, forwards ref natively) instead of `asChild`-ing straight onto `Badge`/`span`.

## Scope — the whole "MCP" tab

Both cards live in `TradingDeskDashboard.tsx` → tab `mcp`:
- `src/components/trading/MCPConfigurator.tsx`
- `src/components/trading/MCPLiveTelemetry.tsx`

Hoist a single `<TooltipProvider delayDuration={150}>` to wrap both cards in `TradingDeskDashboard.tsx` (tab panel level), remove the per-card providers, and add tooltips using the reliable `<span>` wrapper pattern.

## Tooltips to add

### MCPLiveTelemetry
- **Status badge** (Streaming / Idle) — legend already drafted; re-wrap trigger in a `<span tabIndex={0}>` so it actually fires.
- **`Radio` icon** — same legend, so users hovering the icon get it too.
- **Trace-ID cell** — full trace ID (replaces broken `title=""`).
- **API key input label** — "Stored in browser localStorage only. Passed as `?apiKey=` query param because EventSource can't send Authorization headers."

### MCPConfigurator
- **Manifest URL box** — "Canonical MCP Streamable-HTTP endpoint. Paste into any MCP client (Claude Desktop, Ollama, Cursor) that supports remote HTTP transport."
- **Copy Manifest button** — "Copies the enabled-tools manifest JSON to clipboard."
- **Download mcp.json button** — "Downloads a local mcp.json file with only your enabled tools."
- **Local bridge URL input** — "URL of a locally running `idia-mcp-bridge.js` process. Default `http://127.0.0.1:47615/rpc`."
- **Save & probe button** — "Persists the bridge URL and sends a `tools/list` RPC to confirm the local process answers."
- **Bridge reachable / unreachable badges** — brief explanation of each state.
- **Tool row — Public Access badge** — "Callable without a premium plan. Uses the anon RLS surface."
- **Tool row — Premium Gated badge** — "Requires an Ed25519 signed-challenge handshake and an active premium subscription."
- **Tool row — Endpoint code** — full path (`title` currently absent).
- **View schema button** — "Open the JSON-Schema drawer for this tool's input contract."
- **Enabled switch** — "Toggle whether this tool is advertised in your manifest to connected MCP clients."
- **Claude Desktop / Ollama config copy buttons** — "Copies a ready-to-paste `mcpServers` block."
- **Download `idia-mcp-bridge.js` button** — "Zero-dep Node script. Run with `node idia-mcp-bridge.js` next to your MCP client."
- **Liability Shield badge** — "Every tools/call is sanitized, billed, and provenance-anchored server-side."
- **Manifest URL / JSON-RPC Relay URL code blocks** — repeat the endpoint text for copy-paste clarity.

## Out of scope

- No new state, no hook changes, no logic changes to the bridge or the SSE hook.
- No design-token changes; use existing shadcn `Tooltip` primitives.
