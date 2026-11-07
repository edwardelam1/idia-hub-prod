// Durable feeds: source changes publish packets; delivery always requires a paid, unexpired session.
export const FEED_TOPICS = ["vault_health_sync", "vault_financial_ledger", "vault_identity_stream"] as const;
export const STREAM_DURATION_MS = 45_000;
export function validFeedTopic(topic: string) { return (FEED_TOPICS as readonly string[]).includes(topic); }
export function validCursor(cursor: string) { return /^(0|[1-9][0-9]{0,17})$/.test(cursor); }
export function sessionIsLive(session: { expires_at: string } | null, now = Date.now()) {
  return !!session && new Date(session.expires_at).getTime() > now;
}
export function encodeFeatureEvent(packet: { id: string | number; payload: unknown }) {
  return `id: ${packet.id}\nevent: feature.batch_ready\ndata: ${JSON.stringify(packet.payload)}\n\n`;
}
// deno-lint-ignore no-explicit-any
type Db = any;
type ErrorResponse = (status: number, code: string, message: string, trace: string, details?: unknown) => Response;

async function phase<T>(tag: string, fn: () => Promise<T>): Promise<T> {
  console.log(`[PHASE_START: ${tag}]`);
  try { return await fn(); }
  catch (e) { console.error(`[PHASE_ERROR: ${tag}] ${e instanceof Error ? `${e.message}\n${e.stack}` : String(e)}`); throw e; }
  finally { console.log(`[PHASE_END: ${tag}]`); }
}

export async function featureRoute(req: Request, db: Db, owner: string, path: string, trace: string,
  cors: Record<string, string>, error: ErrorResponse, stillAuthorized: () => Promise<boolean>) {
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic") ?? "";
  if (!validFeedTopic(topic)) return error(400, "invalid_topic", `topic must be one of ${FEED_TOPICS.join(", ")}.`, trace);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if ((req.headers.get("x-idia-environment") ?? "").toLowerCase() === "sandbox") {
    return json({ environment: "sandbox", sandbox_mode: true, topic, packets: [], billing: { synapse_credits_deducted: 0 }, note: "Sandbox never starts a paid session or returns production feed packets." });
  }
  const findSession = () => phase(`${trace}.FeedSessionLookup`, async () => {
    const { data, error: fault } = await db.from("feature_feed_sessions").select("id, expires_at, credits_charged")
      .eq("owner_id", owner).eq("topic", topic).gt("expires_at", new Date().toISOString()).order("expires_at", { ascending: false }).limit(1).maybeSingle();
    if (fault) throw new Error(fault.message);
    return data;
  });
  if (req.method === "POST" && path === "/v1/features/sessions") {
    const result = await phase(`${trace}.FeedSessionStart`, async () => {
      const { data, error: fault } = await db.rpc("start_feature_feed_session", { _owner: owner, _topic: topic });
      if (fault) throw new Error(fault.message);
      return data;
    });
    if (result.status === "tier_required") return error(403, "tier_required", "An active Analyst, Professional or Enterprise subscription is required.", trace);
    if (result.status === "insufficient_credits") return error(402, "insufficient_funds", "Not enough Synapse Credits to start this hourly feed session.", trace, result);
    if (result.status !== "active") return error(404, "unknown_topic", "This feed is not available.", trace);
    await phase(`${trace}.FeedInitialPublish`, async () => {
      const { error: fault } = await db.rpc("publish_feature_feeds");
      if (fault) throw new Error(fault.message);
    });
    return json({ ...result, topic, currency: "CRD", billing_unit: "topic_hour", auto_renew: false });
  }
  const session = await findSession();
  if (!sessionIsLive(session)) return error(403, "feed_session_required", "Start a paid session with POST /v1/features/sessions?topic=... before reading this feed.", trace);
  const packets = (cursor?: string, latest = false) => phase(`${trace}.FeedPacketRead`, async () => {
    let query = db.from("feature_feed_packets").select("id, payload, created_at")
      .eq("topic", topic);
    query = topic === "vault_health_sync" ? query.is("owner_id", null) : query.eq("owner_id", owner);
    if (cursor) query = query.gt("id", cursor);
    const { data, error: fault } = await query.order("id", { ascending: !latest }).limit(latest ? 1 : 100);
    if (fault) throw new Error(fault.message);
    return data ?? [];
  });
  if (path === "/v1/features/latest") {
    return json({ topic, session_id: session.id, expires_at: session.expires_at, packets: await packets(undefined, true) });
  }
  const rawCursor = req.headers.get("last-event-id") ?? url.searchParams.get("cursor");
  if (rawCursor !== null && !validCursor(rawCursor)) return error(400, "invalid_cursor", "Last-Event-ID / cursor must be a non-negative integer packet id.", trace);
  let cursor = rawCursor ?? "0";
  let cancelled = false;
  const encoder = new TextEncoder();
  let wake: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { cancelled = true; if (timer) clearTimeout(timer); wake?.(); };
  req.signal.addEventListener("abort", stop, { once: true });
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => { if (!cancelled) controller.enqueue(encoder.encode(text)); };
      const started = Date.now();
      console.log(`[PHASE_START: ${trace}.FeedStream]`);
      try {
        send("retry: 3000\n: connected\n\n");
        if (rawCursor === null) {
          const initial = await packets(undefined, true);
          for (const packet of initial) { cursor = String(packet.id); send(encodeFeatureEvent(packet)); }
        }
        let lastAuthCheck = 0;
        while (!cancelled && Date.now() - started < STREAM_DURATION_MS) {
          if (Date.now() - lastAuthCheck >= 10_000) {
            if (!(await stillAuthorized()) || !sessionIsLive(await findSession())) {
              send('event: session.expired\ndata: {"code":"session_expired_or_revoked"}\n\n'); break;
            }
            lastAuthCheck = Date.now();
          }
          const rows = await packets(cursor);
          console.log(`[PHASE_START: ${trace}.FeedDelivery] packets=${rows.length}`);
          for (const packet of rows) { cursor = String(packet.id); send(encodeFeatureEvent(packet)); }
          console.log(`[PHASE_END: ${trace}.FeedDelivery]`);
          send(": heartbeat\n\n");
          if (rows.length < 100) await new Promise<void>((resolve) => { wake = resolve; timer = setTimeout(resolve, 2000); });
        }
      } catch (e) {
        console.error(`[PHASE_ERROR: ${trace}.FeedStream] ${e instanceof Error ? `${e.message}\n${e.stack}` : String(e)}`);
        send('event: stream.error\ndata: {"code":"stream_interrupted"}\n\n');
      } finally {
        if (timer) clearTimeout(timer);
        req.signal.removeEventListener("abort", stop);
        if (!cancelled) controller.close();
        console.log(`[PHASE_END: ${trace}.FeedStream]`);
      }
    },
    cancel: stop,
  });
  return new Response(stream, { headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", "X-IDIA-Session-Expires": session.expires_at } });
}