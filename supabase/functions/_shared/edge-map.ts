// ============================================================================
// _shared/edge-map.ts
// Mirror of src/lib/api.ts EDGE_MAP. Server-side single source of truth for
// which MCP tool names are allowed to relay into edge functions.
// Keep IN SYNC with src/lib/api.ts manually.
// ============================================================================

export const EDGE_MAP: Record<string, string> = {
  "/api/v1/synapse/controller": "synapse-controller",
  "/api/v1/settlement/circular": "idia-circular-settlement",
  "/api/v1/billing/withdraw/crypto": "withdraw-to-crypto",
  "/api/v1/best-friend/chat": "best-friend-ai",
};

/**
 * Canonical MCP tool name -> edge function name + premium-gate flag.
 * Tool names match ENDPOINT_CONTRACTS in src/hooks/useMcpToolSchemas.ts.
 * Premium tools require an Ed25519 signed-challenge handshake.
 */
export interface ToolRoute {
  fn: string;
  premium: boolean;
}

export const TOOL_ROUTES: Record<string, ToolRoute> = {
  "synapse.controller.execute": { fn: "synapse-controller", premium: true },
  "settlement.circular.post": { fn: "idia-circular-settlement", premium: true },
  "billing.withdraw.crypto": { fn: "withdraw-to-crypto", premium: true },
  "best_friend.chat": { fn: "best-friend-ai", premium: false },
};

/** Back-compat flat map. Existing callers depend on this name. */
export const TOOL_TO_EDGE: Record<string, string> = Object.fromEntries(
  Object.entries(TOOL_ROUTES).map(([k, v]) => [k, v.fn]),
);