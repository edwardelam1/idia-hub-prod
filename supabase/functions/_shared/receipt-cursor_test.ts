import { assertEquals } from "jsr:@std/assert@1";
import { decodeCursor, encodeCursor, keysetFilter, parseLimit } from "./receipt-cursor.ts";

const ID = "8f2e4b10-1a2b-4c3d-8e5f-123456789abc";

Deno.test("cursor round-trips", () => {
  assertEquals(decodeCursor(encodeCursor("2026-11-07T18:32:00.123+00:00", ID)), { c: "2026-11-07T18:32:00.123+00:00", i: ID });
});

Deno.test("tampered cursor rejected", () => {
  assertEquals(decodeCursor("not-a-cursor"), null);
  assertEquals(decodeCursor(btoa(JSON.stringify({ c: "x", i: ID }))), null);
});

Deno.test("limit defaults to 50 and caps at 100", () => {
  assertEquals(parseLimit(null), 50);
  assertEquals(parseLimit("100"), 100);
  assertEquals(parseLimit("101"), null);
  assertEquals(parseLimit("0"), null);
});

Deno.test("keyset filter breaks timestamp ties by id", () => {
  assertEquals(keysetFilter({ c: "2026-11-07T00:00:00Z", i: ID }, "older"),
    `created_at.lt."2026-11-07T00:00:00Z",and(created_at.eq."2026-11-07T00:00:00Z",id.lt.${ID})`);
});
