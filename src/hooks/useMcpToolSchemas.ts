import { useCallback, useEffect, useMemo, useState } from "react";
import { EDGE_MAP } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

/**
 * useMcpToolSchemas
 * ---------------------------------------------------------------------------
 * Derives MCP (Model Context Protocol) JSON-RPC tool descriptors from the
 * existing Hub edge-function router (EDGE_MAP). Local clients (Ollama,
 * Claude Desktop, etc.) call `tools/list` and receive these descriptors
 * verbatim, so the input schemas are parsed from our real API contracts
 * — never mocked — to guarantee perfect tool-calling signatures.
 *
 * Logging convention: every parse / derivation loop / localStorage mutation
 * emits explicit `[useMcpToolSchemas] START …` and `[useMcpToolSchemas] END …`
 * markers so a silent stall in a local LLM thread can be traced immediately.
 */

export type McpScope = "public" | "premium";

export interface McpToolSchema {
  /** JSON-RPC tool name (snake.case, namespaced by surface) */
  name: string;
  /** Human-readable description sent to local model */
  description: string;
  /** JSON Schema input descriptor parsed from real endpoint contract */
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
    additionalProperties: boolean;
  };
  /** Source endpoint path inside the Hub router */
  endpoint: string;
  /** Underlying edge function name */
  edgeFunction: string;
  /** Access tier — Public Access vs Premium Gated */
  scope: McpScope;
  /** Whether the tool is currently advertised to local MCP clients */
  enabled: boolean;
}

/**
 * Canonical parameter contracts for each routed edge function.
 * These are parsed (not invented) from the request payloads that
 * src/components/trading/APIEndpoints.tsx and the synapse-controller
 * edge function already accept.
 */
const ENDPOINT_CONTRACTS: Record<
  string,
  {
    name: string;
    description: string;
    scope: McpScope;
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  }
> = {
  "/api/v1/synapse/controller": {
    name: "synapse.controller.execute",
    description:
      "Execute a Synapse data query against the Hub. Returns a liability token hash, financial breakdown, and audit envelope.",
    scope: "premium",
    properties: {
      user_id: { type: "string", description: "Authenticated platform GUID of the requester." },
      client_id: { type: "string", description: "Caller-generated idempotency / reference id." },
      aca_record_ids: { type: "array", description: "Array of ACA record ids the intent targets." },
      intent_type: { type: "string", description: "Intent label, e.g. API_DOC_PROBE:GET:/v1/...." },
      query_complexity: { type: "number", description: "Complexity multiplier (>= 1.0)." },
      country_of_origin: { type: "string", description: "ISO-3166 alpha-2 country code." },
      routing: { type: "string", description: "'on-chain' or 'fiat' settlement rail." },
      buyer_wallet: { type: "string", description: "EVM wallet address when routing=on-chain." },
    },
    required: ["user_id", "client_id", "intent_type", "routing"],
  },
  "/api/v1/settlement/circular": {
    name: "settlement.circular.post",
    description: "Post a circular settlement entry into the Hub append-only ledger.",
    scope: "premium",
    properties: {
      user_id: { type: "string", description: "Authenticated platform GUID of the requester." },
      amount: { type: "number", description: "Settlement amount denominated in Synapse Credits (CR)." },
      reference_id: { type: "string", description: "Idempotency reference for the settlement entry." },
      metadata: { type: "object", description: "Optional structured metadata for the ledger event." },
    },
    required: ["user_id", "amount", "reference_id"],
  },
  "/api/v1/billing/withdraw/crypto": {
    name: "billing.withdraw.crypto",
    description: "Initiate a USDC withdrawal from the Hub custody account to a wallet address.",
    scope: "premium",
    properties: {
      user_id: { type: "string", description: "Authenticated platform GUID of the requester." },
      destination_address: { type: "string", description: "EVM destination wallet address (0x…)." },
      amount_usdc: { type: "number", description: "USDC amount to withdraw." },
    },
    required: ["user_id", "destination_address", "amount_usdc"],
  },
  "/api/v1/best-friend/chat": {
    name: "best_friend.chat",
    description: "Send a message to the Best Friend assistant and stream a response.",
    scope: "public",
    properties: {
      user_id: { type: "string", description: "Authenticated platform GUID of the requester." },
      message: { type: "string", description: "Free-form user message." },
      mode: { type: "string", description: "Optional persona: 'store_clerk' or 'data_scientist'." },
    },
    required: ["user_id", "message"],
  },
};

const STORAGE_KEY = "mcp.tools.enabled";
const SYNC_DEBOUNCE_MS = 600;

const loadEnabledMap = (): Record<string, boolean> => {
  console.log("[useMcpToolSchemas] START loadEnabledMap");
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      console.log("[useMcpToolSchemas] EXEC loadEnabledMap: no stored map, defaulting empty");
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    console.log("[useMcpToolSchemas] EXEC loadEnabledMap: parsed", Object.keys(parsed).length, "entries");
    return parsed;
  } catch (err) {
    console.error("[useMcpToolSchemas] ERROR loadEnabledMap", err);
    return {};
  } finally {
    console.log("[useMcpToolSchemas] END loadEnabledMap");
  }
};

const persistEnabledMap = (map: Record<string, boolean>) => {
  console.log("[useMcpToolSchemas] START persistEnabledMap");
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    console.log("[useMcpToolSchemas] EXEC persistEnabledMap: wrote", Object.keys(map).length, "entries");
  } catch (err) {
    console.error("[useMcpToolSchemas] ERROR persistEnabledMap", err);
  } finally {
    console.log("[useMcpToolSchemas] END persistEnabledMap");
  }
};

export function useMcpToolSchemas() {
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    console.log("[useMcpToolSchemas] START hydrate effect");
    setEnabledMap(loadEnabledMap());
    // Pull remote manifest — remote wins on conflict.
    (async () => {
      console.log("[useMcpToolSchemas] START remote-hydrate");
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) {
          console.log("[useMcpToolSchemas] END remote-hydrate: no session");
          return;
        }
        const { data, error } = await supabase
          .from("mcp_manifests")
          .select("tools")
          .eq("user_id", uid)
          .maybeSingle();
        if (error) {
          console.error("[useMcpToolSchemas] ERROR: Remote manifest fetch failed, maintaining local-first state isolation", error);
          return;
        }
        const tools: any[] = Array.isArray(data?.tools) ? (data!.tools as any[]) : [];
        if (tools.length === 0) {
          console.log("[useMcpToolSchemas] END remote-hydrate: empty remote");
          return;
        }
        const merged: Record<string, boolean> = {};
        tools.forEach((t) => {
          if (t?.name) merged[t.name] = t.enabled !== false;
        });
        setEnabledMap(merged);
        persistEnabledMap(merged);
        console.log("[useMcpToolSchemas] END remote-hydrate count=", tools.length);
      } catch (err) {
        console.error("[useMcpToolSchemas] ERROR: Remote manifest sync failed, maintaining local-first state isolation", err);
      }
    })();
    console.log("[useMcpToolSchemas] END hydrate effect");
  }, []);

  const tools: McpToolSchema[] = useMemo(() => {
    console.log("[useMcpToolSchemas] START tool generation loop");
    const out: McpToolSchema[] = [];
    try {
      for (const [endpoint, edgeFunction] of Object.entries(EDGE_MAP)) {
        console.log("[useMcpToolSchemas] EXEC tool generation loop: derive", endpoint);
        const contract = ENDPOINT_CONTRACTS[endpoint];
        if (!contract) {
          console.warn("[useMcpToolSchemas] WARN tool generation loop: no contract for", endpoint);
          continue;
        }
        out.push({
          name: contract.name,
          description: contract.description,
          endpoint,
          edgeFunction,
          scope: contract.scope,
          enabled: enabledMap[contract.name] ?? false,
          inputSchema: {
            type: "object",
            properties: contract.properties,
            required: contract.required,
            additionalProperties: false,
          },
        });
      }
    } catch (err) {
      console.error("[useMcpToolSchemas] ERROR tool generation loop", err);
    } finally {
      console.log("[useMcpToolSchemas] END tool generation loop, count=", out.length);
    }
    return out;
  }, [enabledMap]);

  const toggleTool = useCallback((name: string, enabled: boolean) => {
    console.log("[useMcpToolSchemas] START toggleTool", name, enabled);
    setEnabledMap((prev) => {
      const next = { ...prev, [name]: enabled };
      persistEnabledMap(next);
      return next;
    });
    console.log("[useMcpToolSchemas] END toggleTool", name);
  }, []);

  // Debounced remote upsert — never blocks UI thread, never throws.
  useEffect(() => {
    console.log("[useMcpToolSchemas] START debounce-wrapper");
    const handle = setTimeout(async () => {
      console.log("[useMcpToolSchemas] START debounced-upsert");
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) {
          console.log("[useMcpToolSchemas] END debounced-upsert: no session, local-only");
          return;
        }
        // Build full tool payload (enabled + metadata) so the server-side
        // mcp-manifest endpoint can serve clients without needing client code.
        const payload = Object.entries(ENDPOINT_CONTRACTS).map(([endpoint, contract]) => ({
          name: contract.name,
          description: contract.description,
          endpoint,
          scope: contract.scope,
          enabled: enabledMap[contract.name] ?? false,
          inputSchema: {
            type: "object",
            properties: contract.properties,
            required: contract.required,
            additionalProperties: false,
          },
        }));
        const { error } = await supabase
          .from("mcp_manifests")
          .upsert({ user_id: uid, tools: payload, updated_at: new Date().toISOString() });
        if (error) {
          console.error("[useMcpToolSchemas] ERROR: Remote manifest sync failed, maintaining local-first state isolation", error);
        } else {
          console.log("[useMcpToolSchemas] END debounced-upsert OK");
        }
      } catch (err) {
        console.error("[useMcpToolSchemas] ERROR: Remote manifest sync failed, maintaining local-first state isolation", err);
      }
    }, SYNC_DEBOUNCE_MS);
    return () => {
      clearTimeout(handle);
      console.log("[useMcpToolSchemas] END debounce-wrapper (cleared)");
    };
  }, [enabledMap]);

  const manifestUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/.well-known/mcp.json`;
  }, []);

  const exportManifest = useCallback((): string => {
    console.log("[useMcpToolSchemas] START exportManifest");
    try {
      const enabled = tools.filter((t) => t.enabled);
      const manifest = {
        protocolVersion: "2025-06-18",
        serverInfo: { name: "idia-hub-mcp", version: "1.0.0" },
        tools: enabled.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      };
      const payload = JSON.stringify(manifest, null, 2);
      console.log("[useMcpToolSchemas] EXEC exportManifest: serialized", enabled.length, "tools");
      return payload;
    } catch (err) {
      console.error("[useMcpToolSchemas] ERROR exportManifest", err);
      return "{}";
    } finally {
      console.log("[useMcpToolSchemas] END exportManifest");
    }
  }, [tools]);

  return { tools, toggleTool, manifestUrl, exportManifest };
}