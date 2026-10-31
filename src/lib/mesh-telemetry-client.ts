// Mesh telemetry client: all node ingestion goes through the FIPS 140-3
// AWS API Gateway proxy, which forwards to the Supabase mesh-telemetry-intake function.
import { supabase } from "@/integrations/supabase/client";

export const MESH_INTAKE_URL = "https://mesh.thebigidia.com/intake";
const DEFAULT_TIMEOUT_MS = 20_000;

export interface MeshTelemetryResult {
  ok: boolean;
  status: number;
  latencyMs: number;
  data: unknown;
  traceId: string | null;
  error?: string;
}

const tag = (phase: string) => `[Mesh.Telemetry.${phase}]`;

export async function sendMeshTelemetry(
  meshNodeApiKey: string,
  payload: Record<string, unknown>,
  opts: { timeoutMs?: number; useSession?: boolean } = {},
): Promise<MeshTelemetryResult> {
  const runId = crypto.randomUUID().slice(0, 8);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const body = JSON.stringify(payload);
  const events = Array.isArray((payload as any).events) ? (payload as any).events.length : 0;
  console.info(`[BEGIN: Mesh.TelemetryTransmission] run=${runId} target=${MESH_INTAKE_URL} bytes=${body.length} events=${events} node=${(payload as any).node_id ?? "n/a"}`);
  const started = performance.now();

  // Header resolution
  console.info(`[PHASE_START] ${tag("HeaderResolution")} run=${runId}`);
  if (!meshNodeApiKey?.trim()) {
    console.error(`[ERROR: Mesh.TelemetryTransmission.MissingKey] run=${runId} x-api-key is empty`);
    console.info(`[END: Mesh.TelemetryTransmission] run=${runId} aborted=missing_key`);
    return { ok: false, status: 0, latencyMs: 0, data: null, traceId: null, error: "Mesh node API key is required." };
  }
  let bearer = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  let bearerSource = "anon";
  if (opts.useSession !== false) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) { bearer = data.session.access_token; bearerSource = "session"; }
    } catch (err) {
      console.warn(`${tag("HeaderResolution")} run=${runId} session lookup failed, falling back to anon: ${err instanceof Error ? err.stack : String(err)}`);
    }
  }
  if (!bearer) console.error(`${tag("HeaderResolution")} run=${runId} no bearer token available`);
  console.info(`[PHASE_END] ${tag("HeaderResolution")} run=${runId} bearer=${bearerSource} keyPrefix=${meshNodeApiKey.slice(0, 8)}…`);

  // Dispatch
  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.warn(`${tag("Dispatch")} run=${runId} no response after ${timeoutMs}ms — aborting (client ↔ FIPS proxy stall)`);
    controller.abort();
  }, timeoutMs);

  console.info(`[PHASE_START] ${tag("DispatchToFipsProxy")} run=${runId}`);
  let res: Response;
  try {
    res = await fetch(MESH_INTAKE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer ?? ""}`,
        "x-api-key": meshNodeApiKey.trim(),
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - started);
    const timedOut = (err as any)?.name === "AbortError";
    const msg = timedOut
      ? `Timed out after ${timeoutMs}ms reaching the FIPS proxy.`
      : `Network failure reaching the FIPS proxy (DNS, TLS, CORS or offline): ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[ERROR: Mesh.TelemetryTransmission.${timedOut ? "Timeout" : "Stall"}] run=${runId} latency=${latencyMs}ms ${msg}\n${err instanceof Error ? err.stack : ""}`);
    console.info(`[PHASE_END] ${tag("DispatchToFipsProxy")} run=${runId} failed`);
    console.info(`[END: Mesh.TelemetryTransmission] run=${runId} ok=false`);
    return { ok: false, status: 0, latencyMs, data: null, traceId: null, error: msg };
  }
  clearTimeout(timer);
  const latencyMs = Math.round(performance.now() - started);
  console.info(`[PHASE_END] ${tag("DispatchToFipsProxy")} run=${runId} status=${res.status} latency=${latencyMs}ms`);

  // Response
  console.info(`[PHASE_START] ${tag("ProxyResponseReceived")} run=${runId}`);
  const gatewayId = res.headers.get("x-amzn-requestid") ?? res.headers.get("apigw-requestid");
  const sbId = res.headers.get("sb-request-id") ?? res.headers.get("x-sb-request-id");
  let data: any = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    console.error(`[ERROR: Mesh.TelemetryTransmission.BadBody] run=${runId} non-JSON response: ${err instanceof Error ? err.stack : String(err)}`);
  }
  const traceId = data?.trace_id ?? null;
  console.info(`[PHASE_END] ${tag("ProxyResponseReceived")} run=${runId} awsRequestId=${gatewayId ?? "none"} supabaseRequestId=${sbId ?? "none"} trace=${traceId ?? "none"}`);

  if (!res.ok) {
    const hop = [502, 503, 504].includes(res.status) ? "FIPS proxy ↔ Supabase backend" : res.status === 403 && !sbId ? "FIPS proxy (gateway rejected)" : "Supabase intake";
    const error = data?.error ?? `HTTP ${res.status}`;
    console.error(`[ERROR: Mesh.TelemetryTransmission.HttpFailure] run=${runId} status=${res.status} hop=${hop} error=${error}`);
    console.info(`[END: Mesh.TelemetryTransmission] run=${runId} ok=false`);
    return { ok: false, status: res.status, latencyMs, data, traceId, error: `${error} (${hop})` };
  }
  console.info(`[END: Mesh.TelemetryTransmission] run=${runId} ok=true ledger=${data?.ledger_id ?? "n/a"} committed=${data?.events_committed ?? "n/a"} latency=${latencyMs}ms`);
  return { ok: true, status: res.status, latencyMs, data, traceId };
}
