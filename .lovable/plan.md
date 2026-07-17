## Fix

In `src/components/trading/PayAppBlueprint.tsx`, `generateBlueprintJSON()` currently emits `clientOrganization` and `provisioningCode` but no `businessId`, so downstream consumers can't authoritatively bind the manifest to a business row.

Add `businessId` to the `finalManifest` object (around line 1018–1022), sourced from the already-resolved `business` variable at line 892:

```ts
const finalManifest = {
  version: "2.1.0",
  businessId: business?.id ?? null,
  clientOrganization: businessName,
  provisioningCode: provisioningCode,
  createdAt: new Date().toISOString(),
  // ...unchanged
};
```

No other logic, storage, or edge-function behavior changes. `selectedBusiness` (a stringified id) is already used elsewhere; `business?.id` gives the canonical value in its native type.

### Verification
- Download a blueprint from the App Builder and confirm the top-level JSON now contains `businessId`.
- Confirm unassigned state still emits `businessId: null` cleanly.
