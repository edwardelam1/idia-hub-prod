# Add hover legend to Live MCP Telemetry status

## Problem

The **Live MCP Telemetry** card (Trading desk) shows a `Radio` icon + an `Idle` / `Streaming` badge, but nothing explains what those states mean or why the stream is disconnected. When idle (no API key stored, or SSE reconnecting), the UI just sits there with no cue.

## Fix (presentation-only, `src/components/trading/MCPLiveTelemetry.tsx`)

Wrap the status badge + `Radio` icon in a shadcn `Tooltip` (already available via `@/components/ui/tooltip`) whose content renders a small legend:

- **Streaming (green)** — SSE channel open to `mcp-telemetry-stream`; relay events appear below in real time.
- **Idle (grey)** — no live channel. Common causes:
  - No trading-desk API key entered below.
  - Key rejected by the relay (rotate or re-issue in API Key Management).
  - Transient network/backoff — reconnect retries automatically.

Also swap the raw `title=""` on the trace-ID span for the same tooltip primitive so trace IDs get a consistent hover treatment.

## Out of scope

- No changes to `useMcpTelemetryStream`, the edge function, or reconnection logic.
- No new state exposed from the hook (the legend is static; it doesn't try to diagnose *which* cause is active).
