/**
 * hook-logger — absolute lowest-level granularity logger for React hooks
 * and bridge transport code. Every meaningful state transition MUST emit
 * START → EXEC* → END (or ERROR) so that silent stalls are mechanically
 * impossible.
 *
 * The logger is intentionally synchronous + console-only — it must not
 * itself stall, retry, or buffer. All entries are prefixed with the hook
 * name + a span id so traces can be correlated across files.
 */

let __SPAN_COUNTER = 0;
const newSpanId = () => {
  __SPAN_COUNTER = (__SPAN_COUNTER + 1) & 0xffffff;
  return `s${__SPAN_COUNTER.toString(16).padStart(6, "0")}`;
};

export interface HookLogger {
  scope: string;
  begin(stage: string, detail?: unknown): string;
  exec(stage: string, detail?: unknown): void;
  end(stage: string, detail?: unknown): void;
  error(stage: string, err: unknown, detail?: unknown): void;
  child(subScope: string): HookLogger;
}

function fmt(detail: unknown): string {
  if (detail === undefined) return "";
  if (typeof detail === "string") return ` :: ${detail}`;
  try {
    return ` :: ${JSON.stringify(detail)}`;
  } catch {
    return " :: [unserializable]";
  }
}

export function createHookLogger(scope: string): HookLogger {
  const tag = `[${scope}]`;
  return {
    scope,
    begin(stage, detail) {
      const span = newSpanId();
      // eslint-disable-next-line no-console
      console.log(`${tag} START ${stage} (${span})${fmt(detail)}`);
      return span;
    },
    exec(stage, detail) {
      // eslint-disable-next-line no-console
      console.log(`${tag} EXEC ${stage}${fmt(detail)}`);
    },
    end(stage, detail) {
      // eslint-disable-next-line no-console
      console.log(`${tag} END ${stage}${fmt(detail)}`);
    },
    error(stage, err, detail) {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(`${tag} ERROR ${stage} :: ${msg}${fmt(detail)}`);
    },
    child(sub) {
      return createHookLogger(`${scope}:${sub}`);
    },
  };
}