import { assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { signPayload, newWebhookSecret } from "./protocol-webhooks.ts";

Deno.test("signature matches documented t=<unix>,v1=<hmac(t.body)> format", async () => {
  const sig = await signPayload("secret", '{"a":1}', 1700000000);
  // HMAC-SHA256("secret", '1700000000.{"a":1}')
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const raw = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode('1700000000.{"a":1}'));
  const hex = [...new Uint8Array(raw)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assertEquals(sig, `t=1700000000,v1=${hex}`);
});

Deno.test("webhook secrets are whsec_ + 64 hex", () => {
  assertMatch(newWebhookSecret(), /^whsec_[a-f0-9]{64}$/);
});
