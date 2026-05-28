# Plan

## Goal
Stop `idia-circular-settlement` from failing at `PHASE_2_REGIONAL_ROUTING` and make the settlement path strictly mainnet-safe and consistent with the live Synapse flow.

## What I’ll change

1. **Harden network enforcement in settlement code**
   - Keep `idia-circular-settlement` strict on `BASE_RPC_URL`.
   - Add explicit runtime validation that the RPC is actually Base Mainnet, not just “set”.
   - Fail loudly before any contract read/write if the resolved chain ID is wrong.

2. **Fix the settlement handoff from `synapse-controller`**
   - Pass the routing location into `idia-circular-settlement` instead of always falling back to `"global"`.
   - Ensure the payload shape matches what settlement expects for regional routing.

3. **Remove remaining fallback/testnet drift around the same flow**
   - Update adjacent Base-related settlement/transfer helpers that still contain Sepolia or silent mainnet fallback behavior.
   - Align them with the live-system rule so this issue cannot recur through a sibling path.

4. **Add minimal operational diagnostics for production safety**
   - Log the resolved chain ID and routing location in a concise, non-temp way.
   - Avoid the earlier bytecode debug block, but preserve enough signal to distinguish “wrong chain” from “missing pool entry”.

5. **Validate the edge-function path**
   - Verify the settlement function code path and the `synapse-controller` invocation path are consistent after the edit.
   - Confirm the failure mode becomes deterministic: wrong RPC => immediate explicit error; missing pool => clean fallback to `GLOBAL_WAR_CHEST` only when the contract call itself succeeds.

## Expected outcome
- No silent/testnet execution.
- No implicit `global` routing caused by missing handoff data.
- If the RPC is wrong, the function will fail with a precise mainnet enforcement error before `getPoolByLocation`.
- If the RPC is correct, `getPoolByLocation` will execute against the real contract and either return a pool or fall back to the timelock as intended.

## Technical details
- Files likely involved:
  - `supabase/functions/idia-circular-settlement/index.ts`
  - `supabase/functions/synapse-controller/index.ts`
  - `supabase/functions/process-delt-transfer/index.ts`
  - possibly `supabase/functions/_shared/charge-usdc.ts` for consistency hardening
- Specific issue already confirmed during inspection:
  - `synapse-controller` currently invokes settlement **without** `location_string`, so settlement defaults to `"global"` every time.
- Specific risk also found:
  - `process-delt-transfer` still contains `BASE_RPC_URL || "https://sepolia.base.org"`, which violates the hard-mainnet rule and should be aligned.