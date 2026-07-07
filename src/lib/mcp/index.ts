import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import whoamiTool from "./tools/whoami";

// OAuth issuer must be the direct Supabase host (RFC 8414 §3.3). VITE_ vars
// are inlined by Vite at build time, so this stays import-safe (no runtime env
// read at module scope). The sentinel keeps the URL well-formed during the
// build-time manifest-extract pass, where token verification never runs.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "idia-hub-mcp",
  title: "IDIA Hub MCP",
  version: "0.2.0",
  instructions:
    "Agent integration surface for the IDIA Hub. Public tools: `echo` (connectivity). Protected tools (require OAuth): `whoami`. Protected tool calls run under the signed-in Supabase user's Row Level Security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, whoamiTool],
});