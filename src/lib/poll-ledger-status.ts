/**
 * NANO-BITE ID: hub.billing.ledger-poll
 * ROLE: Asynchronous settlement watcher for Synapse credit purchases.
 *
 * WHY: Android Chrome and Brave are both Chromium. Backgrounding the tab
 * (wallet overlay, screen lock) throttles it, and Brave's Shields terminate
 * long-hanging sockets without firing a JS error — so a single long
 * `supabase.functions.invoke` await can never settle, leaving an infinite
 * spinner. Short, rapid, individually-retried polls survive both.
 */
import { supabase } from "@/integrations/supabase/client";

export type LedgerPollOutcome = "completed" | "failed" | "timeout";

export interface LedgerPollResult {
  outcome: LedgerPollOutcome;
  hash?: string | null;
  reason?: string | null;
}

/** Storage key for a purchase left unresolved when the tab was killed. */
export const PENDING_PURCHASE_KEY = "idia.pending_purchase_key";

export const rememberPendingPurchase = (idempotencyKey: string) => {
  try {
    sessionStorage.setItem(PENDING_PURCHASE_KEY, idempotencyKey);
    console.log(`[POLL_LEDGER_PERSIST] Stored unresolved purchase key: ${idempotencyKey}`);
  } catch (err) {
    console.warn(`[POLL_LEDGER_PERSIST_FAULT] sessionStorage unavailable: ${String(err)}`);
  }
};

export const clearPendingPurchase = () => {
  try {
    sessionStorage.removeItem(PENDING_PURCHASE_KEY);
    console.log("[POLL_LEDGER_PERSIST] Cleared unresolved purchase key.");
  } catch {
    /* storage disabled — nothing to clear */
  }
};

export const readPendingPurchase = (): string | null => {
  try {
    return sessionStorage.getItem(PENDING_PURCHASE_KEY);
  } catch {
    return null;
  }
};

/**
 * Invoke an edge function but never hang: if the socket is silently severed
 * the promise rejects with TIMEOUT so the caller can fall through to polling.
 */
export async function invokeWithTimeout<T = any>(
  fn: string,
  options: { body: unknown; headers?: Record<string, string> },
  timeoutMs = 20_000,
): Promise<{ data: T | null; error: any | null; timedOut: boolean }> {
  console.log(`[INVOKE_TIMEBOX_START] fn=${fn} budget=${timeoutMs}ms`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<"__TIMEOUT__">((resolve) => {
      timer = setTimeout(() => resolve("__TIMEOUT__"), timeoutMs);
    });
    const race = await Promise.race([
      supabase.functions.invoke(fn, options as any),
      timeoutPromise,
    ]);
    if (race === "__TIMEOUT__") {
      console.warn(`[INVOKE_TIMEBOX_EXPIRED] fn=${fn} exceeded ${timeoutMs}ms — handing off to poller.`);
      return { data: null, error: null, timedOut: true };
    }
    const { data, error } = race as { data: T | null; error: any | null };
    console.log(`[INVOKE_TIMEBOX_END] fn=${fn} error=${error ? error.message : "none"}`);
    return { data, error, timedOut: false };
  } catch (err: any) {
    console.error(`[INVOKE_TIMEBOX_FAULT] fn=${fn} | ${err?.message ?? String(err)}`);
    return { data: null, error: null, timedOut: true };
  } finally {
    if (timer) clearTimeout(timer);
    console.log(`[INVOKE_TIMEBOX_EXIT] fn=${fn}`);
  }
}

/**
 * Poll the Synapse credit ledger until the settlement row for this
 * idempotency key reaches a terminal state. Network faults are logged and
 * retried — never fatal — because Brave may sever an individual request.
 */
export async function pollLedgerStatus(
  idempotencyKey: string,
  maxAttempts = 15,
): Promise<LedgerPollResult> {
  console.log(`[POLL_LEDGER_START] Initiating polling sequence for key: ${idempotencyKey}`);

  let attempt = 1;
  let result: LedgerPollResult | null = null;

  while (attempt <= maxAttempts && !result) {
    console.log(`[POLL_LEDGER_ITERATION_START] Attempt ${attempt} of ${maxAttempts} for key: ${idempotencyKey}`);

    try {
      const { data, error } = await supabase
        .from("synapse_credit_ledger")
        .select("status, blockchain_tx_hash, metadata")
        .filter("metadata->>idempotency_key", "eq", idempotencyKey)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          `[POLL_LEDGER_QUERY_ERROR] Database read failed for key: ${idempotencyKey} | Error: ${error.message} | Hint: ${(error as any)?.hint ?? "none"}`,
        );
        throw error;
      }

      if (!data) {
        console.warn(`[POLL_LEDGER_NO_DATA] No ledger entry found yet for key: ${idempotencyKey}.`);
      } else {
        const status = String((data as any).status ?? "");
        const meta = ((data as any).metadata ?? {}) as Record<string, unknown>;
        console.log(`[POLL_LEDGER_STATUS_CHECK] Current status: ${status} for key: ${idempotencyKey}`);

        if (status === "completed" || status === "settled") {
          console.log(`[POLL_LEDGER_SUCCESS] Transaction confirmed. Dispatching UI update for key: ${idempotencyKey}`);
          result = { outcome: "completed", hash: (data as any).blockchain_tx_hash ?? null };
        } else if (status === "failed") {
          console.error(`[POLL_LEDGER_TX_FAILED] Backend marked transaction as failed for key: ${idempotencyKey}`);
          result = {
            outcome: "failed",
            hash: (data as any).blockchain_tx_hash ?? null,
            reason: (meta.failure_reason as string) ?? null,
          };
        }
      }
    } catch (err) {
      console.error(
        `[POLL_LEDGER_NETWORK_FAULT] Network or execution error on attempt ${attempt} for key: ${idempotencyKey} | Stack: ${err instanceof Error ? err.stack : String(err)}`,
      );
      // Do not break the loop on network drops (Brave severing a connection) — back off and retry.
    } finally {
      console.log(`[POLL_LEDGER_ITERATION_END] Concluding attempt ${attempt} for key: ${idempotencyKey}`);
    }

    if (!result) {
      const delay = Math.min(2000 * Math.pow(1.5, attempt - 1), 10_000);
      console.log(`[POLL_LEDGER_DELAY_START] Sleeping for ${delay}ms before next poll.`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      console.log("[POLL_LEDGER_DELAY_END] Sleep completed.");
      attempt++;
    }
  }

  if (!result) {
    console.warn(
      `[POLL_LEDGER_TIMEOUT] Max attempts (${maxAttempts}) reached without resolution for key: ${idempotencyKey}. Transitioning to manual check state.`,
    );
    result = { outcome: "timeout" };
  }

  console.log(`[POLL_LEDGER_END] Polling sequence fully terminated for key: ${idempotencyKey}`);
  return result;
}
