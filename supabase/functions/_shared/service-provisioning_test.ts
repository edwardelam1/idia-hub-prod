import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { SERVICE_DEFAULT_RATES, toServiceAccess, usageCost } from "./service-provisioning.ts";
import { normalizeVerificationRecords } from "./identity-verification.ts";

Deno.test("default rates: 2.50 CR per verified record, 50.00 CR per Vulture batch", () => {
  assertEquals(SERVICE_DEFAULT_RATES.utility, 2.5);
  assertEquals(SERVICE_DEFAULT_RATES.vulture, 50);
});

Deno.test("staged utility charge uses the organization's rate per match", () => {
  assertEquals(usageCost(3.25, 4), 13);
  assertEquals(usageCost(2.5, 14), 35);
});

Deno.test("a zero rate charges nothing", () => {
  assertEquals(usageCost(0, 10), 0);
});

Deno.test("unprovisioned organizations are not allowed", () => {
  const access = toServiceAccess([{ allowed: false, is_operator: false, business_id: null, rate: null }]);
  assertEquals(access.allowed, false);
  assertEquals(access.rate, 0);
});

Deno.test("provisioned organization rate is carried through", () => {
  const access = toServiceAccess([{ allowed: true, is_operator: false, business_id: "b1", business_name: "Acme", rate: "75.5" }]);
  assertEquals(access.allowed, true);
  assertEquals(access.rate, 75.5);
  assertEquals(access.businessId, "b1");
});

Deno.test("records, identifiers and the original infractions array are all accepted", () => {
  assertEquals(normalizeVerificationRecords({ records: [{ identifier: " A1 ", identifier_type: "credential_id" }] }), [
    { identifier: "A1", identifier_type: "credential_id", timestamp: null },
  ]);
  assertEquals(normalizeVerificationRecords({ identifiers: ["X9"] })?.[0].identifier, "X9");
  assertEquals(normalizeVerificationRecords({ infractions: [{ license_plate: "ABC1234" }] })?.[0].identifier, "ABC1234");
  assertEquals(normalizeVerificationRecords({ nothing: [] }), null);
});
