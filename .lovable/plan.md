## Problem

Clicking "Authorize Relayer (one-time)" shows the amber bridge card but MetaMask never opens. Two root causes:

1. **`ensureUsdcApproval` bypasses the initialized MetaMask SDK.** The rest of the app connects through `getMetaMaskSDK().getProvider()` / `connectEmbeddedWallet()` (`src/lib/metamask-sdk.ts`), which handles desktop extension, mobile deep-link, and QR fallback. The approval helper instead reads raw `window.ethereum`, which is often undefined (mobile browser, fresh tab, extension not yet injected) — so it throws `WALLET_NOT_FOUND` immediately and the popup never gets a chance to render.

2. **The click handler swallows thrown errors.** The hardened helper now `throw`s tagged errors (`WALLET_NOT_FOUND`, `APPROVAL_USER_REJECTED`, `APPROVAL_POPUP_BLOCKED`, `APPROVAL_CSP_BLOCKED`). The `onClick` only handles the `{ ok: false }` return branch — thrown errors bubble past `finally`, the spinner stops, and the user sees nothing. Result: "total failure" with no feedback.

## Fix

### 1. Route approval through the SDK provider — `src/lib/usdc-approval.ts`

- Import `getMetaMaskSDK`, `connectEmbeddedWallet` from `@/lib/metamask-sdk`.
- Resolve the provider in this order:
  1. `getMetaMaskSDK()?.getProvider()` (SDK-injected, supports desktop + mobile)
  2. `window.ethereum` (legacy fallback)
- Use `connectEmbeddedWallet()` to request accounts so the SDK opens the extension/mobile bridge instead of relying on a possibly-missing global.
- Pass that provider into `createWalletClient({ transport: custom(provider) })` so `writeContract` broadcasts via the same channel.
- Keep the existing tagged-error throws and CSP/user-reject detection.

### 2. Surface thrown errors at the click site — `src/components/billing/SynapsePurchaseModal.tsx` and `src/components/billing/SynapseTopUp.tsx`

In both "Authorize Relayer" onClick handlers, wrap the call:

```ts
try {
  const r = await ensureUsdcApproval({ owner: buyerWalletForRecovery });
  if (!r.ok) { toast.error("Authorization Failed", { description: r.reason }); return; }
  ...
} catch (err: any) {
  console.error("[AuthorizeRelayer] threw:", err);
  toast.error("Authorization Failed", { description: err?.message ?? String(err) });
} finally {
  setIsAuthorizingRelayer(false);
}
```

This makes every failure mode (no wallet, CSP, user reject, popup blocked) visible as a toast instead of a silent stall.

### 3. No other files change

- `index.html` CSP stays as-is (already permits `'unsafe-eval'` and MetaMask origins).
- Edge functions, relayer address, purchase flow — untouched.

## Validation

1. Click "Authorize Relayer" with the MetaMask extension installed → MetaMask popup opens, approve, tx hash logged, purchase auto-retries and succeeds.
2. Click without MetaMask installed → toast reads `WALLET_NOT_FOUND: No browser wallet detected…`.
3. Click and reject in MetaMask → toast reads `APPROVAL_USER_REJECTED: …`.
4. Verify console shows `[IDIA_WEB3_SDK][Connect]` logs from the SDK path on every click (proves we're no longer using bare `window.ethereum`).
