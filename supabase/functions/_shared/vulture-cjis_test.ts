import { assert, assertEquals, assertNotEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  anchorCalldata, isCjisUploadPath, isLegacyKeyExpired, isNodeKeyExpired, isPiiKey, merkleRoot, nodeKeyExpiry,
} from "./vulture-cjis.ts";

Deno.test("CJIS law-enforcement identifiers are treated as PII", () => {
  for (const k of ["officer_id", "badge_number", "ori_number", "case_id", "incident_id", "vin", "drivers_license", "dob", "subject_name"]) {
    assert(isPiiKey(k), `${k} must be hashed`);
  }
  assert(isPiiKey("VIN"), "matching is case-insensitive");
  assert(!isPiiKey("battery_voltage"));
});

Deno.test("mesh node keys expire 90 days after issue", () => {
  const issued = new Date("2026-01-01T00:00:00Z");
  assertEquals(nodeKeyExpiry(issued).toISOString(), "2026-04-01T00:00:00.000Z");
  assert(!isNodeKeyExpired("2026-04-01T00:00:00Z", new Date("2026-03-31T23:59:59Z")));
  assert(isNodeKeyExpired("2026-04-01T00:00:00Z", new Date("2026-04-01T00:00:00Z")));
  assert(isNodeKeyExpired(null));
});

Deno.test("legacy mesh keys older than 90 days are refused", () => {
  assert(isLegacyKeyExpired("2026-01-01T00:00:00Z", new Date("2026-04-02T00:00:00Z")));
  assert(!isLegacyKeyExpired("2026-01-01T00:00:00Z", new Date("2026-03-01T00:00:00Z")));
});

Deno.test("uploads under <owner>/cjis/ are CJIS-isolated", () => {
  assert(isCjisUploadPath("217c6224-d839-43b0-98cb-b4d1be267536/cjis/2026-10-29/a.json"));
  assert(!isCjisUploadPath("217c6224-d839-43b0-98cb-b4d1be267536/standard/2026-10-29/a.json"));
});

Deno.test("Merkle root is deterministic, order-sensitive and 32 bytes", async () => {
  const a = "a".repeat(64), b = "b".repeat(64), c = "c".repeat(64);
  const r1 = await merkleRoot([a, b, c]);
  assertEquals(r1, await merkleRoot([a, b, c]));
  assertNotEquals(r1, await merkleRoot([b, a, c]));
  assertEquals(r1.length, 64);
  assertNotEquals(await merkleRoot([a]), a, "single leaf is still domain-separated");
});

Deno.test("anchor calldata carries only the magic prefix and root", () => {
  assertEquals(anchorCalldata("ab".repeat(32)), `0x4944564c${"ab".repeat(32)}`);
  assertThrows(() => anchorCalldata("abcd"));
});
