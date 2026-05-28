# Fix: `deployedPools` ABI mismatch crashing Phase 2 settlement

## Root cause

In `supabase/functions/idia-circular-settlement/index.ts`:
- `REGISTRY_ABI` declares `getPoolByLocation(string) → address`
- The call site uses `functionName: "deployedPools"`

viem aborts encoding before the RPC fires, throwing the `FATAL STALL: PHASE_2_REGIONAL_ROUTING` error. The deployed `IDIAPoolFactory.sol` exposes `deployedPools` as a public mapping auto-getter — the call site is correct; the ABI is wrong.

## Changes

**File:** `supabase/functions/idia-circular-settlement/index.ts`

1. Replace the `REGISTRY_ABI` fragment with the public-mapping getter:

   ```ts
   const REGISTRY_ABI = [
     {
       inputs: [{ name: "", type: "string" }],
       name: "deployedPools",
       outputs: [{ type: "address" }],
       stateMutability: "view",
       type: "function",
     },
   ] as const;
   ```

2. Leave the existing `readContract({ functionName: "deployedPools", args: [executionLocation] })` call untouched — it now matches the ABI.

3. Tighten error semantics so this class of server-side fault stops masquerading as a client error:
   - In the `catch` block, return **HTTP 500** (instead of 400) when `currentStep` indicates a protocol/contract fault (anything other than `VALIDATING_INPUTS`).
   - Keep `failed_at` in the payload so the existing frontend telemetry breadcrumb is preserved.

4. Add one explicit telemetry line right before the `readContract` call and one right after, so any future ABI/RPC stall here is visible without re-deriving it from a stack trace:
   - `[BEGIN: Registry.deployedPools] location=<executionLocation>`
   - `[END: Registry.deployedPools] resolved=<poolTarget>`

## Out of scope

- No changes to the on-chain factory contract.
- No changes to revenue split, nonce handling, or any other phase.
- No frontend changes — the fix is entirely inside the edge function.

## Verification

1. Re-trigger a settlement that previously hit `PHASE_2_REGIONAL_ROUTING`.
2. Confirm in Edge Function logs:
   - `[BEGIN: Registry.deployedPools]` followed by `[END: Registry.deployedPools] resolved=0x…`
   - Phase 2 emits a real `regionalHash` transaction (either to the resolved pool or, on `0x0`, to `GLOBAL_WAR_CHEST` via the existing fallback).
3. Confirm Phase 3 contributor distribution proceeds and the response is `200` with `corporateHash`, `regionalHash`, `payouts[]`.
