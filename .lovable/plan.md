## Skip MetaMask when IDIA Life wallet already covers the purchase

The "Pay from Wallet" flow currently calls `ensureUsdcApproval(...)` on every USDC purchase, which forces a `window.ethereum` (MetaMask/Rabby) handshake plus an on-chain `approve(RELAYER, MAX_UINT256)` tx. That's redundant: the IDIA Life wallet attached to the account was provisioned with the relayer already authorized as USDC spender (same authority used for royalty payouts), so a gasless `transferFrom` from the relayer is sufficient.

When `availableUSDC >= usdAmount`, we should NOT touch MetaMask at all — just dispatch the edge function and let the relayer execute the gasless pull.

### Behavior

- **Wallet covers purchase** (`availableUSDC >= usdAmount`):
  - No MetaMask popup, no `ensureUsdcApproval` call, no chain switch prompt.
  - Directly invoke `top-up-credits` with `routing: "on-chain"`, `user_wallet: <profile.wallet_address>`. The relayer-side `chargeBuyerUsdc` performs `transferFrom(buyer, treasury, amount)` (gasless for the user — relayer pays gas).
- **Shortfall** (`availableUSDC < usdAmount`):
  - Existing shortfall UI (red panel + "Connect MetaMask" CTA + recovery-phrase guidance) stays exactly as-is for the user to onboard an external funded wallet.
- **Edge-case fallback**: if the edge function returns `APPROVAL_REQUIRED` (relayer authority somehow missing on that specific Life wallet), we surface the existing error toast and offer the user the `ensureUsdcApproval` path as a one-time recovery. Implemented as: on `APPROVAL_REQUIRED`, set an inline error + show a small "Authorize Relayer" button that calls `ensureUsdcApproval` and retries. No change to the happy-path UX.

### Files

- `src/components/billing/SynapseTopUp.tsx`
  - In `handlePurchase`, after the `availableUSDC >= usdAmount` check and the `profiles.wallet_address` lookup, **remove the unconditional `ensureUsdcApproval` call**. Pass the `buyerWallet` straight into the `top-up-credits` invocation.
  - In the `APPROVAL_REQUIRED` catch branch, expose a `setNeedsApproval(true)` state that renders an "Authorize Relayer (one-time)" button which calls `ensureUsdcApproval({ owner: buyerWallet })` then re-runs `handlePurchase`.

- `src/components/billing/SynapsePurchaseModal.tsx`
  - Mirror the same change in its `handlePurchase`: drop the pre-flight `ensureUsdcApproval` call when the IDIA Life wallet covers the amount; keep the same `APPROVAL_REQUIRED` recovery path.

### Out of scope

- No changes to the edge function (`supabase/functions/top-up-credits/index.ts`) — it already performs the gasless `transferFrom` via `chargeBuyerUsdc` and already returns `APPROVAL_REQUIRED` when allowance is missing.
- No changes to `src/lib/usdc-approval.ts` — kept as the recovery-only path and for the "Connect MetaMask" shortfall flow.
- No changes to `src/lib/metamask-sdk.ts` or the shortfall UI / Connect MetaMask CTA.
- No changes to Wix rail, ledger, or `SynapseCreditsContext`.
