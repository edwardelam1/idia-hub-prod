/**
 * useSovereignVault — local-first hook for the Sovereign Vault.
 *
 * ROUTING CORRECTION (per Phase 4 directive):
 * The cloud Edge Relay rejects any tool flagged `local: true` with
 * JSON-RPC -32004. This hook therefore NEVER calls
 * `supabase.functions.invoke()` for vault.* tools — every operation is
 * transmitted directly to the local `idia-mcp-bridge` over the local
 * HTTP/RPC transport (`callBridge`).
 *
 * Vault contents never traverse Supabase.
 */

import { useCallback, useEffect, useState } from "react";
import { callBridge, pingBridge, type BridgeRpcOutcome } from "@/lib/mcpBridgeSocket";
import { validateVaultArgs } from "@/hooks/useMcpToolSchemas";
import { createHookLogger } from "@/lib/hook-logger";

const LOG = createHookLogger("useSovereignVault");

export interface VaultSearchHit {
  filePath: string;
  line: number;
  snippet: string;
}

export interface VaultReadResult {
  filePath: string;
  content: string;
}

export interface VaultAppendResult {
  filePath: string;
  appended: boolean;
}

export type VaultBridgeStatus = "unknown" | "online" | "offline";

async function invokeLocalVault<T>(
  toolName: "vault.note.read" | "vault.search" | "vault.note.append",
  rawArgs: Record<string, unknown>,
): Promise<BridgeRpcOutcome<T>> {
  const span = LOG.begin("invokeLocalVault", { toolName });
  const validated = validateVaultArgs(toolName, rawArgs);
  if (!validated.ok) {
    LOG.error("invokeLocalVault:validate", validated.error, { toolName });
    return { ok: false, code: -32602, message: validated.error };
  }
  LOG.exec("invokeLocalVault:dispatch", { toolName, keys: Object.keys(validated.value) });
  const outcome = await callBridge<T>(toolName, validated.value);
  LOG.end("invokeLocalVault", { span, ok: outcome.ok });
  return outcome;
}

export function useSovereignVault() {
  const [bridgeStatus, setBridgeStatus] = useState<VaultBridgeStatus>("unknown");
  const [lastError, setLastError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshBridgeStatus = useCallback(async () => {
    const span = LOG.begin("refreshBridgeStatus");
    const r = await pingBridge();
    setBridgeStatus(r.ok ? "online" : "offline");
    if (!r.ok) setLastError(r.message);
    LOG.end("refreshBridgeStatus", { span, status: r.ok ? "online" : "offline" });
  }, []);

  useEffect(() => {
    void refreshBridgeStatus();
  }, [refreshBridgeStatus]);

  const readNote = useCallback(async (filePath: string): Promise<VaultReadResult | null> => {
    setBusy(true);
    setLastError(null);
    const r = await invokeLocalVault<VaultReadResult>("vault.note.read", { filePath });
    setBusy(false);
    if (!r.ok) {
      setLastError(r.message);
      return null;
    }
    return r.result;
  }, []);

  const search = useCallback(
    async (query: string, limit = 50): Promise<VaultSearchHit[]> => {
      setBusy(true);
      setLastError(null);
      const r = await invokeLocalVault<{ hits: VaultSearchHit[] }>("vault.search", { query, limit });
      setBusy(false);
      if (!r.ok) {
        setLastError(r.message);
        return [];
      }
      return r.result.hits ?? [];
    },
    [],
  );

  const appendNote = useCallback(
    async (filePath: string, content: string): Promise<boolean> => {
      setBusy(true);
      setLastError(null);
      const r = await invokeLocalVault<VaultAppendResult>("vault.note.append", { filePath, content });
      setBusy(false);
      if (!r.ok) {
        setLastError(r.message);
        return false;
      }
      return r.result.appended === true;
    },
    [],
  );

  return {
    bridgeStatus,
    busy,
    lastError,
    refreshBridgeStatus,
    readNote,
    search,
    appendNote,
  };
}