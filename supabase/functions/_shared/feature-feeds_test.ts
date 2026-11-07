import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validCursor, validFeedTopic, sessionIsLive, encodeFeatureEvent, STREAM_DURATION_MS } from "./feature-feeds.ts";
Deno.test("feeds accept only the three registered topics", () => {
  for (const topic of ["vault_health_sync", "vault_financial_ledger", "vault_identity_stream"]) assertEquals(validFeedTopic(topic), true);
  assertEquals(validFeedTopic("vulture_ledger"), false);
});
Deno.test("expired sessions stop access exactly at expiry", () => {
  assertEquals(sessionIsLive({ expires_at: "2026-11-07T18:00:00Z" }, Date.parse("2026-11-07T18:00:00Z")), false);
  assertEquals(sessionIsLive({ expires_at: "2026-11-07T18:00:00Z" }, Date.parse("2026-11-07T17:59:59Z")), true);
  assertEquals(sessionIsLive(null), false);
});
Deno.test("resumption cursor rejects unsafe and malformed values", () => {
  assertEquals(validCursor("123"), true);
  for (const cursor of ["-1", "1.5", "1\nevent: forged", "", "999999999999999999999"]) assertEquals(validCursor(cursor), false);
});
Deno.test("SSE preserves durable packet id and exact payload", () => {
  assertEquals(encodeFeatureEvent({ id: 52, payload: { metrics: { settled_entries: 3 } } }), 'id: 52\nevent: feature.batch_ready\ndata: {"metrics":{"settled_entries":3}}\n\n');
  assertEquals(STREAM_DURATION_MS, 45_000);
});