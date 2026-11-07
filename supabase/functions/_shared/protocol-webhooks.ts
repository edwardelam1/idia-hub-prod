// Shared webhook signing + delivery for the IDIA Protocol API.
// Signature format (matches thebigidia.com/hub/developers/webhooks):
//   X-IDIA-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, `${t}.${rawBody}`)>
// Deliveries are idempotent per (webhook_id, event_key); failed sends retry up to 5 times.

export const WEBHOOK_EVENTS = ["receipt.anchored_l2", "wallet.credit_depleted", "telemetry.spatial_event"] as const;
export type WebhookEvent = typeof WEBHOOK_EVENTS[number];
export const MAX_ATTEMPTS = 5;
// Gaps after each failed attempt (minutes): spread across ~24 hours.
export const RETRY_GAPS_MIN = [5, 30, 120, 360, 900];

const enc = new TextEncoder();
const toHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export async function signPayload(secret: string, rawBody: string, unix: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${unix}.${rawBody}`));
  return `t=${unix},v1=${toHex(sig)}`;
}

export function newWebhookSecret() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return `whsec_${[...b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function buildEvent(type: string, data: unknown) {
  return { id: crypto.randomUUID(), type, created_at: new Date().toISOString(), data };
}

/** Sends one HTTP delivery. Returns status code (0 on network failure). 10 s timeout. */
export async function sendSigned(url: string, secret: string, event: unknown, tag: string) {
  console.log(`[PHASE_START: ${tag}.WebhookSend] url=${url}`);
  const raw = JSON.stringify(event);
  const sig = await signPayload(secret, raw, Math.floor(Date.now() / 1000));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-IDIA-Signature": sig, "User-Agent": "IDIA-Webhooks/1" },
      body: raw,
      signal: AbortSignal.timeout(10_000),
    });
    await res.body?.cancel();
    console.log(`[PHASE_END: ${tag}.WebhookSend] HTTP ${res.status}`);
    return res.status;
  } catch (e) {
    console.error(`[${tag}.WebhookSend.Fault] ${e instanceof Error ? e.stack : String(e)}`);
    console.log(`[PHASE_END: ${tag}.WebhookSend] network_error`);
    return 0;
  }
}

// deno-lint-ignore no-explicit-any
type Db = any;

/** Queues (idempotently) and immediately attempts delivery of an event to every matching webhook of `owner`. */
export async function emitEvent(db: Db, owner: string, type: WebhookEvent, eventKey: string, data: unknown, tag: string) {
  console.log(`[PHASE_START: ${tag}.EmitEvent] type=${type} key=${eventKey}`);
  const { data: hooks, error } = await db.from("api_webhooks").select("id, url, secret, events")
    .eq("owner_id", owner).eq("status", "active").contains("events", [type]);
  if (error) { console.error(`[${tag}.EmitEvent] lookup: ${error.message}`); return; }
  for (const h of hooks ?? []) {
    const event = buildEvent(type, data);
    const { data: row, error: insErr } = await db.from("api_webhook_deliveries")
      .insert({ webhook_id: h.id, event_type: type, event_key: eventKey, payload: event })
      .select("id").maybeSingle();
    if (insErr) { if (!String(insErr.code).startsWith("23505")) console.error(`[${tag}.EmitEvent] queue: ${insErr.message}`); continue; }
    await attemptDelivery(db, { id: row.id, attempts: 0, payload: event }, h, tag);
  }
  console.log(`[PHASE_END: ${tag}.EmitEvent] hooks=${hooks?.length ?? 0}`);
}

export async function attemptDelivery(db: Db, d: { id: string; attempts: number; payload: unknown }, h: { url: string; secret: string }, tag: string) {
  const code = await sendSigned(h.url, h.secret, d.payload, tag);
  const attempts = d.attempts + 1;
  const ok = code >= 200 && code < 300;
  const patch = ok
    ? { status: "delivered", attempts, last_status_code: code, delivered_at: new Date().toISOString() }
    : attempts >= MAX_ATTEMPTS
      ? { status: "failed", attempts, last_status_code: code }
      : { status: "pending", attempts, last_status_code: code, next_attempt_at: new Date(Date.now() + RETRY_GAPS_MIN[attempts - 1] * 60_000).toISOString() };
  const { error } = await db.from("api_webhook_deliveries").update(patch).eq("id", d.id);
  if (error) console.error(`[${tag}.AttemptDelivery] update: ${error.message}`);
  return code;
}
