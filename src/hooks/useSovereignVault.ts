/**
 * useSovereignVault — Supabase-backed hook for the Sovereign Vault.
 *
 * Vault entries live in `public.vault_notes` under per-user RLS
 * (`auth.uid() = user_id`). Every operation routes through the
 * `execute-vault-query` edge function so we can swap the orchestration
 * layer without touching components.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createHookLogger } from "@/lib/hook-logger";

const LOG = createHookLogger("useSovereignVault");

export interface VaultNoteSummary {
  id: string;
  title: string;
  tags: string[];
  updated_at: string;
  created_at: string;
}

export interface VaultNote extends VaultNoteSummary {
  content: string;
}

async function invokeVault<T>(
  tool: string,
  args: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const span = LOG.begin("invokeVault", { tool });
  try {
    const { data, error } = await supabase.functions.invoke("execute-vault-query", {
      body: { tool, arguments: args },
    });
    if (error) {
      LOG.error("invokeVault", error.message, { tool });
      return { ok: false, error: error.message };
    }
    if (data && data.ok === false) {
      return { ok: false, error: String(data.error ?? "vault_error") };
    }
    LOG.end("invokeVault", { span, tool });
    return { ok: true, data: (data?.data ?? data) as T };
  } catch (e: any) {
    LOG.error("invokeVault:throw", e?.message, { tool });
    return { ok: false, error: e?.message ?? "invoke_failed" };
  }
}

export function useSovereignVault() {
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [notes, setNotes] = useState<VaultNoteSummary[]>([]);

  const listNotes = useCallback(async (limit = 200): Promise<VaultNoteSummary[]> => {
    setBusy(true);
    setLastError(null);
    const r = await invokeVault<{ notes: VaultNoteSummary[] }>("vault.note.list", { limit });
    setBusy(false);
    if (r.ok === true) {
      setNotes(r.data.notes ?? []);
      return r.data.notes ?? [];
    }
    setLastError(r.error);
    return [];
  }, []);

  const search = useCallback(async (query: string, limit = 50): Promise<VaultNoteSummary[]> => {
    setBusy(true);
    setLastError(null);
    const r = await invokeVault<{ hits: VaultNoteSummary[] }>("vault.search", { query, limit });
    setBusy(false);
    if (r.ok === true) return r.data.hits ?? [];
    setLastError(r.error);
    return [];
  }, []);

  const readNote = useCallback(async (id: string): Promise<VaultNote | null> => {
    setBusy(true);
    setLastError(null);
    const r = await invokeVault<{ note: VaultNote }>("vault.note.read", { id });
    setBusy(false);
    if (r.ok === true) return r.data.note;
    setLastError(r.error);
    return null;
  }, []);

  const createNote = useCallback(
    async (title: string, content = "", tags: string[] = []): Promise<VaultNoteSummary | null> => {
      setBusy(true);
      setLastError(null);
      const r = await invokeVault<{ note: VaultNoteSummary }>("vault.note.create", {
        title,
        content,
        tags,
      });
      setBusy(false);
      if (r.ok === true) {
        setNotes((prev) => [r.data.note, ...prev]);
        return r.data.note;
      }
      setLastError(r.error);
      return null;
    },
    [],
  );

  const appendNote = useCallback(async (id: string, content: string): Promise<boolean> => {
    setBusy(true);
    setLastError(null);
    const r = await invokeVault<{ appended: boolean }>("vault.note.append", { id, content });
    setBusy(false);
    if (r.ok === true) return r.data.appended === true;
    setLastError(r.error);
    return false;
  }, []);

  useEffect(() => {
    void listNotes();
  }, [listNotes]);

  return {
    busy,
    lastError,
    notes,
    listNotes,
    search,
    readNote,
    createNote,
    appendNote,
  };
}