## Goal
Revert the fallback routing to `GLOBAL_WAR_CHEST` (Timelock = DAO War Chest) and keep only the ABI + telemetry + error-semantics fixes in `supabase/functions/idia-circular-settlement/index.ts`.

## Architectural correction (acknowledged)
- `TimelockController` at `0xd052C6F3846b4Fe56E579880Ec9ea2764ABDe708` **IS** the Global War Chest — the DAO Governor controls and executes spending from it.
- `ESCROW_ECOSYSTEM` (`0xDc93eca9…`) is for contributor/royalty `proposeDistribution` only, NOT the regional fallback.
- Previous plan's repoint of the fallback to the Ecosystem escrow was wrong and is being reverted.

## Changes to `supabase/functions/idia-circular-settlement/index.ts`

1. **Restore constant**
   ```ts
   const GLOBAL_WAR_CHEST = "0xd052C6F3846b4Fe56E579880Ec9ea2764ABDe708";
   ```
   Keep `ESCROW_ECOSYSTEM` as-is (still used by Phase 3 `proposeDistribution`).

2. **Registry ABI** — keep the explicit getter:
   ```ts
   const REGISTRY_ABI = [{
     name: "getPoolByLocation",
     type: "function",
     stateMutability: "view",
     inputs: [{ name: "location", type: "string" }],
     outputs: [{ name: "", type: "address" }],
   }] as const;
   ```

3. **Phase 2 call site** — `functionName: "getPoolByLocation"` (already in place, retained).

4. **Telemetry** — retain:
   - `[BEGIN: Registry.getPoolByLocation] location=${executionLocation}`
   - `[END: Registry.getPoolByLocation] resolved=${poolTarget}`

5. **Fallback routing (revert)**
   ```ts
   const finalRegionalAddress = (!poolTarget || poolTarget === ZERO_ADDRESS)
     ? GLOBAL_WAR_CHEST
     : poolTarget;
   ```
   Ledger `description` reverts to:
   `"10% Regional/War Chest: ${ingestionReference}"` (single description, no fallback branch).

6. **Error semantics (preserve)**
   - `400` only when `currentStep === "VALIDATING_INPUTS"`
   - `500` for every other step.

## Out of scope
- No changes to splits, nonce, Phase 1, Phase 3, `ESCROW_ECOSYSTEM` proposals, frontend, or on-chain contracts.

## Verification
1. Re-trigger the previously failing settlement → no viem ABI error.
2. Logs show `[BEGIN/END: Registry.getPoolByLocation]`.
3. With unregistered `executionLocation`, the regional `transfer` lands at `0xd052…` (Timelock / War Chest).
4. Phase 3 still completes; response `200` with `corporateHash`, `regionalHash`, `payouts[]`.
5. Invalid input → `400`; induced contract fault → `500`.
