## Goal
Surface the real backend error (`USDC_CHARGE_REJECTED: APPROVAL_REQUIRED`) so the amber "Authorize Relayer" recovery UI triggers, instead of being swallowed by Supabase's generic `FunctionsHttpError`.

## Root cause
`supabase.functions.invoke()` wraps non-2xx responses into a `FunctionsHttpError` whose `.message` is the generic `"Edge Function returned a non-2xx status code"`. The real JSON payload (containing `error: "USDC_CHARGE_REJECTED: APPROVAL_REQUIRED"`) lives on `error.context` (a `Response`). Current regex `/APPROVAL_REQUIRED/i` runs against the generic wrapper string and never matches → `setNeedsApproval(true)` never fires.

## Changes

### 1. `src/components/billing/SynapsePurchaseModal.tsx` (around lines 291–304)
Replace the `if (topUpError)` block with logic that:
- Logs raw error
- If `topUpError.context` is a `Response`, clones and reads it via `.json()` (fallback `.text()`), extracting `errorBody.error || errorBody.message`
- Reassigns `backendErrorString` to the unpacked value
- Runs `/APPROVAL_REQUIRED/i.test(backendErrorString)` → `setNeedsApproval(true)` and `return` (no throw, so the amber recovery card renders without a destructive toast)
- Otherwise `throw new Error(backendErrorString)`

### 2. `src/components/billing/SynapseTopUp.tsx` (around lines 230–239)
Apply the identical unpacking pattern.

### 3. Shared helper (optional, keeps both call sites tidy)
Add `src/lib/unpack-edge-error.ts` exporting `async function unpackEdgeError(error: unknown): Promise<string>` that handles the `error.context.clone().json()` extraction with text/JSON fallback and returns the best available backend error string. Both components import it.

## Out of scope
- No edge function changes
- No changes to `charge-usdc.ts` `[TRIAD]` logging
- No changes to `RELAYER_ADDRESS` or approval flow itself

## Validation
1. Trigger a purchase from a wallet with zero relayer allowance
2. Console shows `[Unpacked backend error body]` containing `USDC_CHARGE_REJECTED: APPROVAL_REQUIRED`
3. Amber "Authorize Relayer (One-Time)" button renders in the modal
4. Clicking it runs the existing approval flow; retrying the purchase succeeds
