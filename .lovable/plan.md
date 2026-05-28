## Goal
Align `supabase/functions/idia-circular-settlement/index.ts` with the actual deployed Base contract topology so Phase 2 stops stalling on a bad ABI, and so the fallback address points at a real treasury — not the governance Timelock.

## Address audit (from the deployed contract list)

| Code constant (current) | Address | Actually is |
|---|---|---|
| `REGISTRY_ADDRESS` | `0x463ce6d5B2E2c9D4bBE930f0CEBeF08b6Eb274F7` | ✅ IDIARegistry (`getPoolByLocation(string) → address`) |
| `GLOBAL_WAR_CHEST` | `0xd052C6F3846b4Fe56E579880Ec9ea2764ABDe708` | ❌ This is the **TimelockController**, not a war chest / treasury |
| `ESCROW_ECOSYSTEM` | `0xDc93eca954fD2625001b2fb9E9A098914365ADe9` | ✅ IDIAEscrow (Ecosystem / Treasury, 30%) |

The settlement function's Phase 2 fallback currently routes the 10% regional share to the Timelock when no regional pool is registered. That sends operational USDC into a governance contract that has no business custodying revenue.

## Changes

**File:** `supabase/functions/idia-circular-settlement/index.ts`

1. **Registry ABI** — replace the `deployedPools` mapping fragment with the explicit getter:
   ```ts
   const REGISTRY_ABI = [
     {
       name: "getPoolByLocation",
       type: "function",
       stateMutability: "view",
       inputs: [{ name: "location", type: "string" }],
       outputs: [{ name: "", type: "address" }],
     },
   ] as const;
   ```

2. **Phase 2 call site** — change `functionName: "deployedPools"` → `functionName: "getPoolByLocation"`.

3. **Telemetry** — replace the existing log lines with:
   - `[BEGIN: Registry.getPoolByLocation] location=${executionLocation}`
   - `[END: Registry.getPoolByLocation] resolved=${poolTarget}`

4. **Fallback address correctness** — rename and repoint the regional fallback so the 10% share lands in the Ecosystem treasury escrow instead of the Timelock:
   - Remove `GLOBAL_WAR_CHEST = 0xd052…` (Timelock).
   - Use `ESCROW_ECOSYSTEM = 0xDc93eca954fD2625001b2fb9E9A098914365ADe9` as the fallback target for `finalRegionalAddress` when `getPoolByLocation` returns `0x0`.
   - Update the ledger `description` for that branch from `"10% Regional/War Chest"` to `"10% Regional → Ecosystem Treasury (fallback)"` when the fallback path triggers, so the ledger reflects where money actually went.

5. **Error semantics (preserve)** — keep the catch block returning:
   - `400` only when `currentStep === "VALIDATING_INPUTS"`
   - `500` for every other step (contract / RPC / protocol fault)

## Out of scope
- `IDIAPoolFactory` (`0x60EA…`) is not called from this function and is not added.
- No changes to revenue split percentages, nonce sequencing, contributor distribution, or `proposeDistribution` against `ESCROW_ECOSYSTEM`.
- No frontend changes.
- No on-chain changes.

## Verification
1. Re-trigger a settlement that previously failed in `PHASE_2_REGIONAL_ROUTING`.
2. Confirm logs show `[BEGIN: Registry.getPoolByLocation] …` followed by `[END: Registry.getPoolByLocation] resolved=0x…` and no viem ABI error.
3. With an unregistered `executionLocation`, confirm the regional `transfer` goes to `0xDc93eca9…` (Ecosystem escrow), not `0xd052…` (Timelock).
4. Confirm Phase 3 contributor distribution still completes and the response is `200` with `corporateHash`, `regionalHash`, `payouts[]`.
5. Confirm invalid input still returns `400`; an induced contract fault returns `500`.