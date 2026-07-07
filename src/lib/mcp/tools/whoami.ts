import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Reference protected tool. Confirms OAuth 2.1 identity chain end-to-end:
// - Supabase-issued JWT verified by mcp-js resource-server auth
// - ToolContext exposes the verified user's sub/email
// - Any tool that reads DB should build a per-request Supabase client with
//   `Authorization: Bearer ${ctx.getToken()}` so RLS runs as auth.uid().
export default defineTool({
  name: "whoami",
  title: "Who am I",
  description:
    "Return the signed-in Supabase user's id, email, and client_id. Requires OAuth authentication.",
  inputSchema: {
    _noop: z.string().optional().describe("Ignored. Reserved for future use."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return {
        isError: true,
        content: [{ type: "text", text: "Authentication required. Please sign in via OAuth." }],
        _meta: {
          "mcp/www_authenticate": {
            realm: "hub.thebigidia.com",
          },
        },
      };
    }
    const user_id = ctx.getUserId();
    const email = ctx.getUserEmail() ?? null;
    const client_id = ctx.getClientId?.() ?? null;
    return {
      content: [
        {
          type: "text",
          text: `user_id=${user_id}${email ? ` email=${email}` : ""}${client_id ? ` client_id=${client_id}` : ""}`,
        },
      ],
      structuredContent: { user_id, email, client_id },
    };
  },
});