
# Sovereign Vault via MCP Bridge — Implementation Plan (v2)

Adds a compounding, local-first knowledge vault. All vault I/O happens on the user's hardware via the local `idia-mcp-bridge.js`. The cloud Supabase relay is intentionally bypassed for vault tools.

## Phase 1 — Tool schemas (`src/hooks/useMcpToolSchemas.ts`)

Add three tools:

- `vault.note.read` — `{ filePath: string }`
- `vault.search` — `{ query: string, limit?: number }`
- `vault.note.append` — `{ filePath: string, content: string }`

Each gets `inputSchema` JSON + a lightweight runtime validator. Every validator and transform wrapped with the project's existing `logBegin / logExec / logEnd / logError` helpers from `src/lib/hook-logger.ts` for absolute lowest-level granularity matching the project's `[BEGIN]/[EXEC]/[END]/[ERROR] [scope]` convention.

## Phase 2 — Local bridge (`public/downloads/idia-mcp-bridge.js`)

- New env var `IDIA_VAULT_ROOT` (absolute path). Refuse vault tools if unset.
- `resolveInsideVault(filePath)` helper — joins, normalizes, rejects `..`/symlink/absolute escapes; single chokepoint.
- Handlers using `fs/promises` + `path`:
  - `vault.note.read` → `fs.readFile(safePath, "utf8")`
  - `vault.search` → recursive walk for `.md`/`.txt`, substring/regex match per line, capped by `limit` (default 50)
  - `vault.note.append` → require file exists, then `fs.appendFile`
- Routed inside `handleIncomingMessageFrame` **before** `executeLiveEdgeRelay`. Vault tools never touch the cloud.
- Every fs op wrapped with the bridge's existing `logTrace("[START] …")` / `[END]` / `[ERROR]` lines.

## Phase 3 — Edge relay (`supabase/functions/mcp-edge-relay/index.ts`)

The relay advertises vault tools but refuses to execute them.

- Extend `_shared/edge-map.ts` with the three vault entries flagged `{ local: true, fn: null, premium: false }`.
- In `tools/call`: if `route.local === true`, return JSON-RPC error `code: -32004, message: "Local-only tool; execute via local MCP bridge"`. Telemetry written via `deferTelemetry` with `status: "local_only"`.
- All new branches use the relay's existing `[mcp-edge-relay][${reqId}] START/END/ERROR` log format.

## Phase 4 — Frontend (CORRECTED ROUTING)

**Routing correction acknowledged:** vault tools are local-only. `useSovereignVault.ts` will NOT call `supabase.functions.invoke("mcp-edge-relay", …)` for vault commands. The Supabase relay is bypassed entirely for `vault.note.read`, `vault.search`, and `vault.note.append`.

### New shared bridge transport — `src/lib/mcpBridgeSocket.ts`

- Singleton `getBridgeSocket()` that manages a single `WebSocket` to the local bridge endpoint configured in `MCPConfigurator` (default `ws://127.0.0.1:<port>/mcp`, persisted in `localStorage` as `idia.bridge.ws`).
- Exposes `sendRpc(method, params): Promise<result>` that:
  - Generates a JSON-RPC id, registers a pending-promise map, writes the frame, resolves on matching id, rejects on `error` field, `ws.onerror`, or 10s timeout.
- Auto-reconnect with backoff. Connection state exposed via a tiny event emitter.
- Every state transition (`opening`, `open`, `send`, `recv`, `close`, `error`, `timeout`) wrapped with `logBegin/logExec/logEnd/logError`. This is the lowest-level transport — granular logs live here so every consumer inherits traceability.

### New hook — `src/hooks/useSovereignVault.ts`

- Uses `getBridgeSocket().sendRpc(...)` directly. No Supabase invoke.
- Exposes `readNote(filePath)`, `searchVault(query, limit?)`, `appendNote(filePath, content)`, plus `connectionState`.
- Every public method and every `useEffect`/state transition wrapped with `logBegin/logExec/logEnd/logError` (scope strings like `useSovereignVault:readNote`).
- Surfaces bridge-down errors as typed results so the UI can show a "Bridge offline — start `idia-mcp-bridge`" state instead of stalling.

### New component — `src/components/knowledge/SovereignVault.tsx`

Split-pane:
- **Left (Vault Index)** — file tree from `vault.search` with empty query (returns root listing). Click → load via `vault.note.read`.
- **Right (Active Intelligence)** — chat. On submit: `vault.search` → `vault.note.read` top hit → send assembled context + question to existing `best-friend-ai` edge function (cloud call is fine for the LLM completion; only vault I/O is local).
- Every state setter, effect, and async call wrapped with `logBegin/logExec/logEnd/logError`.

### Edit — `src/components/trading/MCPConfigurator.tsx`

- Add inputs: "Sovereign Vault Directory Path" → `localStorage["idia.vault.root"]`, "Local Bridge WebSocket URL" → `localStorage["idia.bridge.ws"]`.
- Surface both in the generated env-var snippet (`IDIA_VAULT_ROOT=…`, advertised WS URL).
- Logging on each save/change handler.

### Edit — `src/components/trading/TradingDeskDashboard.tsx`

- Mount `SovereignVault` behind a new tab so it ships without disturbing current screens.

## Granularity guarantee for `hook-logger.ts`

`src/lib/hook-logger.ts` already emits `[BEGIN]/[EXEC]/[ERROR]/[END] [scope]` with optional metadata. We will use it at every layer (schemas, hook, socket transport, components) so a single `console` filter on a scope prefix traces a vault op from UI click → socket frame → ack → render. No silent stalls: every awaited operation has matched BEGIN/END or BEGIN/ERROR.

## Security boundaries (unchanged)

- Vault contents never traverse Supabase. Bridge reads/writes locally; responses ride the local WebSocket only.
- `resolveInsideVault` blocks path traversal.
- `vault.note.append` cannot create new files.
- No new tables, secrets, or migrations.

## Files touched

- Edit: `src/hooks/useMcpToolSchemas.ts`
- Edit: `public/downloads/idia-mcp-bridge.js`
- Edit: `supabase/functions/mcp-edge-relay/index.ts`
- Edit: `supabase/functions/_shared/edge-map.ts`
- Edit: `src/components/trading/MCPConfigurator.tsx`
- Edit: `src/components/trading/TradingDeskDashboard.tsx`
- Add: `src/lib/mcpBridgeSocket.ts`
- Add: `src/hooks/useSovereignVault.ts`
- Add: `src/components/knowledge/SovereignVault.tsx`
