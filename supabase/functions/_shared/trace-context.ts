// ============================================================================
// W3C trace context helpers for MCP relay. Extracts and mints traceparent /
// tracestate / baggage propagation strings from MCP `_meta` envelopes.
// Spec: https://www.w3.org/TR/trace-context/
// ============================================================================

export interface TraceContext {
  traceparent: string;
  tracestate?: string;
  baggage?: string;
  traceId: string;
  parentSpanId: string;
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateTraceparent(): TraceContext {
  const traceId = randomHex(16);
  const parentSpanId = randomHex(8);
  return {
    traceparent: `00-${traceId}-${parentSpanId}-01`,
    traceId,
    parentSpanId,
  };
}

export function extractTraceContext(meta: Record<string, unknown> | undefined): TraceContext {
  const tp = typeof meta?.traceparent === "string" ? (meta!.traceparent as string) : null;
  if (tp) {
    const parts = tp.split("-");
    if (parts.length === 4) {
      return {
        traceparent: tp,
        tracestate: typeof meta?.tracestate === "string" ? (meta!.tracestate as string) : undefined,
        baggage: typeof meta?.baggage === "string" ? (meta!.baggage as string) : undefined,
        traceId: parts[1],
        parentSpanId: parts[2],
      };
    }
  }
  return generateTraceparent();
}

export function injectTraceHeaders(ctx: TraceContext): Record<string, string> {
  const h: Record<string, string> = { "x-trace-parent": ctx.traceparent };
  if (ctx.tracestate) h["x-trace-state"] = ctx.tracestate;
  if (ctx.baggage) h["x-baggage"] = ctx.baggage;
  return h;
}