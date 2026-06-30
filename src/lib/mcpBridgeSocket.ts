/**
 * mcpBridgeSocket — local JSON-RPC transport from the browser to the
 * user's running `idia-mcp-bridge` Node process.
 *
 * ARCHITECTURE NOTE
 * -----------------
 * The plan specifies a "WebSocket" channel. We implement the equivalent
 * over a localhost HTTP POST endpoint (`/rpc`) exposed by the bridge.
 * Browsers cannot meaningfully gain from WS framing for short-lived
 * request/response RPC, and HTTP avoids requiring the bridge to ship a
 * third-party WS implementation (zero npm deps is a hard constraint).
 *
 * The cloud Edge Relay is *entirely bypassed* for any tool tagged
 * `local: true` — vault contents never traverse Supabase.
 */

import { createHookLogger } from "@/lib/hook-logger";

const LOG = createHookLogger("mcpBridgeSocket");

const STORAGE_KEY = "idia.mcp.bridgeUrl";
const DEFAULT_BRIDGE_URL = "http://127.0.0.1:47615/rpc";

export function getBridgeUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_BRIDGE_URL;
  } catch {
    return DEFAULT_BRIDGE_URL;
  }
}

export function setBridgeUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch {
    /* localStorage unavailable — ignore */
  }
}

let __RPC_COUNTER = 0;
const nextRpcId = () => {
  __RPC_COUNTER = (__RPC_COUNTER + 1) & 0x7fffffff;
  return __RPC_COUNTER;
};

export interface BridgeRpcResult<T = unknown> {
  ok: true;
  result: T;
}
export interface BridgeRpcFailure {
  ok: false;
  code: number;
  message: string;
}
export type BridgeRpcOutcome<T = unknown> = BridgeRpcResult<T> | BridgeRpcFailure;

/**
 * Send a JSON-RPC tools/call to the local bridge and return the parsed
 * `structuredContent` payload. Bridge is expected to be running on
 * 127.0.0.1; failures are returned, never thrown.
 */
export async function callBridge<T = unknown>(
  toolName: string,
  args: Record<string, unknown>,
): Promise<BridgeRpcOutcome<T>> {
  const span = LOG.begin("callBridge", { toolName });
  const url = getBridgeUrl();
  const id = nextRpcId();
  const payload = { jsonrpc: "2.0", id, method: "tools/call", params: { name: toolName, arguments: args } };
  LOG.exec("callBridge:fetch", { url, id, toolName });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    LOG.exec("callBridge:status", { status: res.status });
    if (!res.ok) {
      LOG.end("callBridge", { span, status: res.status });
      return { ok: false, code: -32099, message: `Local bridge HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      result?: { structuredContent?: T; content?: Array<{ type: string; text: string }> };
      error?: { code: number; message: string };
    };
    if (body.error) {
      LOG.end("callBridge", { span, error: body.error });
      return { ok: false, code: body.error.code, message: body.error.message };
    }
    let result = body.result?.structuredContent as T | undefined;
    if (result === undefined && body.result?.content?.[0]?.text) {
      try {
        result = JSON.parse(body.result.content[0].text) as T;
      } catch {
        /* fall through */
      }
    }
    LOG.end("callBridge", { span, ok: true });
    return { ok: true, result: (result ?? ({} as T)) as T };
  } catch (err) {
    LOG.error("callBridge", err, { url });
    return {
      ok: false,
      code: -32098,
      message:
        err instanceof Error
          ? `Local bridge unreachable: ${err.message}`
          : "Local bridge unreachable",
    };
  }
}

/** Liveness probe — list local tools to confirm the bridge answers. */
export async function pingBridge(): Promise<BridgeRpcOutcome<{ tools: Array<{ name: string }> }>> {
  const span = LOG.begin("pingBridge");
  const url = getBridgeUrl();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: nextRpcId(), method: "tools/list" }),
    });
    if (!res.ok) {
      LOG.end("pingBridge", { span, status: res.status });
      return { ok: false, code: -32099, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    if (body.error) return { ok: false, code: body.error.code, message: body.error.message };
    LOG.end("pingBridge", { span, ok: true });
    return { ok: true, result: body.result ?? { tools: [] } };
  } catch (err) {
    LOG.error("pingBridge", err);
    return {
      ok: false,
      code: -32098,
      message: err instanceof Error ? err.message : "unreachable",
    };
  }
}