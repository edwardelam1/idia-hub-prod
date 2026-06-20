import { useEffect, useState } from "react";

/**
 * useMcpTelemetryStream
 * ---------------------------------------------------------------------------
 * Opens an SSE channel against `mcp-telemetry-stream` and exposes a rolling
 * window of the most recent relay events. Reconnects with exponential backoff
 * on transport errors. All lifecycle phases emit the standard tracing markers.
 */
export interface RelayEvent {
  id: number;
  user_id: string;
  tool_name: string;
  trace_id: string | null;
  parent_span_id: string | null;
  duration_ms: number | null;
  status: string;
  sanitized_args: unknown;
  error_code: number | null;
  error_message: string | null;
  created_at: string;
}

const SUPABASE_PROJECT_REF = "zxyngqciipcvveigrzqt";
const STREAM_URL = `https://${SUPABASE_PROJECT_REF}.functions.supabase.co/mcp-telemetry-stream`;
const MAX_EVENTS = 50;

export function useMcpTelemetryStream(apiKey: string | null) {
  const [events, setEvents] = useState<RelayEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    console.log("[useMcpTelemetryStream] START open");
    let cancelled = false;
    let es: EventSource | null = null;
    let backoff = 1000;
    let retryTimer: number | undefined;

    const open = () => {
      if (cancelled) return;
      es = new EventSource(`${STREAM_URL}?key=${encodeURIComponent(apiKey)}`);
      es.onopen = () => {
        console.log("[useMcpTelemetryStream] EXEC open");
        setConnected(true);
        backoff = 1000;
      };
      es.addEventListener("relay", (ev) => {
        try {
          const row = JSON.parse((ev as MessageEvent).data) as RelayEvent;
          setEvents((prev) => {
            const next = [row, ...prev.filter((p) => p.id !== row.id)];
            return next.slice(0, MAX_EVENTS);
          });
        } catch (err) {
          console.error("[useMcpTelemetryStream] ERROR parse", err);
        }
      });
      es.onerror = () => {
        console.log(`[useMcpTelemetryStream] ERROR transport; backoff=${backoff}ms`);
        setConnected(false);
        es?.close();
        if (cancelled) return;
        retryTimer = window.setTimeout(open, backoff);
        backoff = Math.min(backoff * 2, 30000);
      };
    };
    open();

    return () => {
      cancelled = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
      console.log("[useMcpTelemetryStream] END close");
    };
  }, [apiKey]);

  return { events, connected };
}