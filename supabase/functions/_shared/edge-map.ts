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
 * Canonical MCP tool name -> edge function name.
 * Tool names match ENDPOINT_CONTRACTS in src/hooks/useMcpToolSchemas.ts.
 */
export const TOOL_TO_EDGE: Record<string, string> = {
  "synapse.controller.execute": "synapse-controller",
  "settlement.circular.post": "idia-circular-settlement",
  "billing.withdraw.crypto": "withdraw-to-crypto",
  "best_friend.chat": "best-friend-ai",
};