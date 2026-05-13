## Goal
Finish the dual-rail Synapse billing flow: ensure the modal performs the USDC approval gate via the existing relayer-based shared module, and confirm the edge function matches the spec.

## Scope assessment

Most of what you described is already in place:
- `SynapsePurchaseModal.tsx` no longer imports `captureHardwareTag`, already pulls `availableUSDC` from `protocolState?.usdc_balance ?? 0`, already does the `profiles.wallet_address` fallback lookup, sends `resolvedWalletAddress` as `user_wallet`, and keeps `aca_metadata` free of `hardware_tag`.
- `top-up-credits/index.ts` already imports and delegates to `chargeBuyerUsdc`, has no hardware_tag validation, and routes `fiat` straight to the `corporate_revenue` column.

The remaining functional gap is the **client-side approval gate**, which was explicitly removed in a prior pass and now needs to be reinstated per your instructions.

## Changes

### 1. `src/components/billing/SynapsePurchaseModal.tsx`
- Add import: `import { ensureUsdcApproval } from "@/lib/usdc-approval";`
- In `handlePurchase`, after the `availableUSDC < usdAmount` check (still inside the `paymentRail === "usdc"` branch), insert:
  ```ts
  console.log("[SynapsePurchaseModal][APPROVAL_GATE] BEGIN: ensureUsdcApproval");
  const approval = await ensureUsdcApproval({ owner: resolvedWalletAddress });
  console.log("[SynapsePurchaseModal][APPROVAL_GATE] END:", approval);
  if (!approval.ok) {
    throw new Error(`APPROVAL_REQUIRED: ${approval.reason}. Relayer cannot pull funds without allowance.`);
  }
  ```
- Add a defense-in-depth wallet derivation line right above the profile fetch (used only as a logging/telemetry hint; the profile value remains the source of truth):
  ```ts
  const userWalletAddress =
    walletBalance?.wallet_address ||
    balanceData?.wallet_address ||
    (user as any)?.wallet_address ||
    (user as any)?.user_metadata?.wallet_address;
  ```
  (Requires pulling `user` from `useAuth()` and `walletBalance` from `useWalletBalance()` — both hooks are already used in the file; only the destructured fields need expanding.)
- Keep all existing `[BEGIN]`/`[END]` console logs; add the two new ones above.
- Worldpay path stays untouched — no on-chain calls in that branch.

### 2. `supabase/functions/top-up-credits/index.ts`
No code change required — already conforms:
- No `aca_metadata.hardware_tag` validation present.
- `chargeBuyerUsdc` imported from `../_shared/charge-usdc.ts` and invoked exactly per the spec snippet.
- `fiat` routing skips the on-chain branch and updates `wallets.corporate_revenue`.

I'll re-verify on implementation and only patch if drift is found.

## Out of scope
- No UI/style/layout changes to the modal.
- No DB migrations.
- No changes to `_shared/charge-usdc.ts` or `usdc-approval.ts`.

## Verification
- Read both files post-edit to confirm imports compile and the approval gate sits inside the `usdc` branch.
- Confirm the build remains green (handled automatically by the harness).
