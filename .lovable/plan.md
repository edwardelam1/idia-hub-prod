# Fix incorrect MCP manifest URL

## Problem

The Trading → **MCP Server Configurator** card advertises the server's manifest URL as:

```
https://<host>/.well-known/mcp.json
```

That path is a **404** on every environment (preview, `idia-hub-prod.lovable.app`, and `hub.thebigidia.com`) — nothing serves it. It's a fabricated URL baked into `src/hooks/useMcpToolSchemas.ts` (line 415) and re-used by the Claude Desktop and Ollama config snippets in `src/components/trading/MCPConfigurator.tsx`. Any user copy-pasting those snippets ends up with a broken MCP client.

The real, deployed MCP server for this app is the SDK-generated Supabase edge function:

```
https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/mcp
```

(OAuth-protected, per `supabase/functions/mcp/index.ts` and `README.md`.) Per-user tool manifests are additionally served at `.../functions/v1/mcp-manifest?user_id=…` for the local bridge.

## Fix (UI/presentation only)

1. **`src/hooks/useMcpToolSchemas.ts`** — replace the `manifestUrl` memo:
   - Remove the `${window.location.origin}/.well-known/mcp.json` string.
   - Return the canonical MCP endpoint `https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/mcp` (mirror the `SUPABASE_PROJECT_REF` constant already used in `MCPConfigurator.tsx`).
2. **`src/components/trading/MCPConfigurator.tsx`** — no logic changes; the Claude/Ollama snippets (`claudeSnippet`, `ollamaSnippet`) already interpolate `manifestUrl`, so they'll auto-correct. The "Download mcp.json" button still exports a local file from `exportManifest()` — leave as-is.

## Out of scope

- No changes to `defineMcp`, tool files, or the edge function itself.
- No new route/redirect for `/.well-known/mcp.json` — that path is not part of the MCP spec for this SDK and isn't needed.
- No changes to the `mcp-manifest` endpoint or the bridge config snippet (those already use the correct `functions.supabase.co/mcp-manifest?user_id=…` URL).
