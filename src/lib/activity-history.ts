import { supabase } from "@/integrations/supabase/client";

export type ActivitySource = "trading_desk" | "best_friend" | "marketplace";

interface ActivityWrite {
  source: ActivitySource;
  action: string;
  title: string;
  input: unknown;
  result: unknown;
  status?: string;
  recordsConsumed?: number;
  synapseCreditCost?: number;
  egressLogId?: string | null;
  synapseLedgerEntryId?: string | null;
  referenceId?: string | null;
  idempotencyKey: string;
}

const SECRET_KEY = /(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|bearer|secret|password|credential)/i;
const MAX_PAYLOAD_BYTES = 512_000;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        SECRET_KEY.test(key) ? "[REDACTED]" : redact(child),
      ]),
    );
  }
  return value;
}

function boundedPayload(value: unknown): unknown {
  const safe = redact(value ?? {});
  const encoded = JSON.stringify(safe);
  if (new TextEncoder().encode(encoded).length > MAX_PAYLOAD_BYTES) {
    throw new Error("Activity input or result exceeds the 512 KB history limit.");
  }
  return safe;
}

export async function recordActivity(write: ActivityWrite): Promise<boolean> {
  console.info(`[PHASE_START: ActivityHistory.Record] source=${write.source} action=${write.action}`);
  try {
    console.info("[PHASE_START: ActivityHistory.Identity] Resolving authenticated owner.");
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user?.id) throw authError ?? new Error("Authentication required.");
    console.info("[PHASE_END: ActivityHistory.Identity] Owner resolved.");

    console.info("[PHASE_START: ActivityHistory.Upsert] Persisting retry-safe history row.");
    const { error } = await supabase.from("activity_history").upsert(
      {
        user_id: data.user.id,
        source: write.source,
        action: write.action,
        title: write.title.slice(0, 240),
        input_payload: boundedPayload(write.input) as any,
        result_payload: boundedPayload(write.result) as any,
        status: write.status ?? "completed",
        records_consumed: Math.max(0, Math.floor(write.recordsConsumed ?? 0)),
        synapse_credit_cost: Math.max(0, Number(write.synapseCreditCost ?? 0)),
        egress_log_id: write.egressLogId ?? null,
        synapse_ledger_entry_id: write.synapseLedgerEntryId ?? null,
        reference_id: write.referenceId ?? null,
        idempotency_key: write.idempotencyKey,
      },
      { onConflict: "user_id,idempotency_key" },
    );
    if (error) throw error;
    console.info("[PHASE_END: ActivityHistory.Upsert] History row persisted.");
  } catch (error) {
    console.error(
      "[PHASE_END: ActivityHistory.Record] Failed:",
      error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error),
    );
    return false;
  }
  console.info("[PHASE_END: ActivityHistory.Record] Complete.");
  return true;
}