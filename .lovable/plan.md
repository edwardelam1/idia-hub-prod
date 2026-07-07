
# Wire Supabase OAuth 2.1 into the IDIA Hub MCP Server

Turn the current open MCP endpoint (`/functions/v1/mcp`, built via `@lovable.dev/mcp-js`) into an authenticated, RLS-scoped agent surface. Public tools (health checks) stay reachable anonymously; protected tools require a Supabase-issued user JWT and execute under `auth.uid()`.

## What changes

### 1. Activate Supabase as OAuth 2.1 authorization server
- Call the platform action to enable OAuth 2.1 + Dynamic Client Registration on this Supabase project (so ChatGPT/Claude/Cursor can self-register as clients).
- No new secrets required — Supabase Auth issues the tokens; the MCP function verifies them.

### 2. Add the OAuth consent route to the SPA
- New page `src/pages/OAuthConsent.tsx`, routed at `/.lovable/oauth/consent` in `src/App.tsx`.
- Flow: read `authorization_id` → require session (redirect to login preserving the full consent URL as `next`) → call `supabase.auth.oauth.getAuthorizationDetails` → render Approve / Deny → call `approveAuthorization` / `denyAuthorization` → redirect to returned URL.
- Update `LoginScreen.tsx` (and any signup / social sign-in paths) to honor a same-origin `?next=` param on every success path (password, signup `emailRedirectTo`, Google `signInWithOAuth` `redirect_uri`). Validate `next` is a relative same-origin path.

### 3. Declare the MCP resource server + auth
Edit `src/lib/mcp/index.ts` to attach OAuth verification:
- Import `auth` from `@lovable.dev/mcp-js`.
- Build issuer from `import.meta.env.VITE_SUPABASE_PROJECT_ID` → `https://<ref>.supabase.co/auth/v1` (must be the direct supabase.co host per SDK discovery rules; not the lovable.cloud proxy).
- Set `acceptedAudiences: "authenticated"`.
- Keep the entry import-safe: no top-level env reads that throw; fallback sentinel for the build-time extract pass.

### 4. Tool tiers
- **Public**: keep `echo` as-is (no auth check) so connectivity probes work pre-login.
- **Protected**: new tool `src/lib/mcp/tools/whoami.ts` demonstrating the pattern — uses `ToolContext`: `isAuthenticated()`, `getUserId()`, `getUserEmail()`. Returns a structured MCP error with `_meta["mcp/www_authenticate"]` when unauthenticated (client-driven login challenge).
- **RLS-scoped Supabase access pattern**: a small helper (inline in each protected tool file) builds a per-request Supabase client using the anon key + `Authorization: Bearer ${ctx.getToken()}` header, so every DB query runs under the caller's `auth.uid()` and existing RLS policies fire natively. No service role in tool code.
- Register `whoami` in `defineMcp({ tools: [...] })`.
- Note: this plan does NOT add `vault_search` or other business tools — it establishes the auth pattern and one reference protected tool. Additional protected tools can be added in follow-ups by copying the `whoami` shape.

### 5. Manifest + deploy
- Regenerate `.lovable/mcp/manifest.json` via `app_mcp_server--extract_mcp_manifest` after the entry changes.
- Deploy the `mcp` edge function via `supabase--deploy_edge_functions`. `supabase/config.toml` already has `verify_jwt = false` for `mcp` (correct — the SDK verifies the token in code so public tools like `echo` remain reachable).

### 6. Docs / recap
- Short section in `README.md` under an "Agent integrations (MCP)" heading: endpoint URL, connect-with-OAuth instructions, list of public vs protected tools.

## What does NOT change

- No changes to `mcp-edge-relay`, `mcp-manifest`, `mcp-telemetry-stream`, or any downstream business edge function.
- No changes to existing RLS policies, ledgers, credits, settlement, `pending_nft_mints`, or the visualizer.
- No changes to Vault, Best Friend, or Synapse controller logic.
- No new secrets. No DB migrations (existing RLS is what secures per-user data).

## Technical details

**Files touched**
- `src/lib/mcp/index.ts` — add `auth: auth.oauth.issuer({...})`, register `whoami`.
- `src/lib/mcp/tools/whoami.ts` — NEW; reference protected tool + RLS-scoped Supabase client helper pattern.
- `src/pages/OAuthConsent.tsx` — NEW; consent screen.
- `src/App.tsx` — add route `/.lovable/oauth/consent`.
- `src/components/LoginScreen.tsx` — honor `?next=` on all sign-in paths.
- `README.md` — brief MCP section.

**Files auto-regenerated**
- `supabase/functions/mcp/index.ts` (owned by the Vite plugin).
- `.lovable/mcp/manifest.json` (via extractor).

**Platform actions**
- Enable Supabase OAuth server + DCR.
- Deploy `mcp` function.

**Client tool authoring shape (illustrative)**

```ts
// src/lib/mcp/tools/whoami.ts
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function userScoped(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in Supabase user's id and email.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        isError: true,
        content: [{ type: "text", text: "Authentication required." }],
        _meta: { "mcp/www_authenticate": { realm: "hub.thebigidia.com" } },
      };
    }
    return {
      content: [{ type: "text", text: `user=${ctx.getUserId()} email=${ctx.getUserEmail() ?? ""}` }],
      structuredContent: { user_id: ctx.getUserId(), email: ctx.getUserEmail() },
    };
  },
});
```

## Acceptance checks

- ChatGPT / Claude / Cursor can add the MCP endpoint, be redirected through Supabase OAuth + the `/.lovable/oauth/consent` screen, approve, and land back on the client.
- `echo` works without a token; `whoami` returns the correct `auth.uid()` with a token and a structured auth challenge without one.
- Any subsequent protected tool added following this pattern executes DB queries under the caller's RLS.
- `.lovable/mcp/manifest.json` regenerates cleanly; `mcp` function redeploys successfully.
