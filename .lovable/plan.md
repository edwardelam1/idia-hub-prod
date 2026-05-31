# Synapse Purchase Modal — Shortfall Calculation + MetaMask SDK Onboarding

Branch the purchase popup on `availableUSDC` vs `usdAmount`. If funded, transfer from wallet to treasury. If short, surface the explicit shortfall and route into the MetaMask SDK so the user can natively import their IDIA Life recovery phrase.

## Behavior

After tier/A-la-carte selection (existing UI), compute:
```
shortfall = usdAmount - availableUSDC
hasEnoughBalance = shortfall <= 0
```

### Funded path
Replace the current confirm screen with a green "Funded from IDIA Life Wallet" summary:
- Available Balance, Transfer Amount, Remaining Balance
- CTA **Pay from Wallet** → existing `top-up-credits` invoke (`payment_method: "internal_usdc"`). No backend change.

### Shortfall path
Red/amber "Wallet Shortfall" card:
- Total Required, Available in IDIA Life, **Amount to Fund** (emphasized)
- Amber `AlertTriangle` block with verbatim text:
  > To find your recovery phrase, open IDIA Life, visit the Wallet page, tap Security, and press Reveal Recovery Phrase. Ensure no one is around you when you do this and do not do this on a device that is not your own.
- CTA **Connect MetaMask** → calls `connectEmbeddedWallet()` from new SDK bridge. On success: refresh wallet balance, re-evaluate shortfall, transition back to summary (which now shows the funded path if balance covers it).

All branches include the granular `[IDIA_PURCHASE_MODAL]` / `[IDIA_WEB3_SDK]` console logging from the spec (>>> START / --- ACTION / <<< END / !!! FATAL ERROR).

## Files

- **`src/components/billing/SynapsePurchaseModal.tsx`** — Replace the `step: "payment"` body with the funded/shortfall branch. Keep tier/A-la-carte selection, processing, and success states. Wire `Connect MetaMask` to the SDK helper and refresh `useWalletBalance` on resolved account.
- **`src/components/billing/SynapseTopUp.tsx`** — Apply the same branch logic to the standalone top-up surface so both entry points behave identically.
- **NEW `src/lib/metamask-sdk.ts`** — Singleton `MetaMaskSDK` instance with `dappMetadata: { name: "IDIA Sovereign Hub", url: "https://hub.thebigidia.com" }`, `checkInstallationImmediately: false`, `logging.developerMode: true`. Exports `connectEmbeddedWallet()` returning `string[]` via `provider.request({ method: 'eth_requestAccounts' })`. Full instrumented logging.
- **`src/hooks/useWalletBalance.ts`** — Read-only check. If `refreshBalance` does not already accept an optional external address override, extend its signature so the MetaMask-returned address can drive the next USDC read. If the hook already keys off the auth user's wallet column, persist the connected address there before refreshing.
- **`package.json`** — Add `@metamask/sdk` dependency.

## Technical Notes

- No edge function, migration, or RLS change. The funded path reuses the existing `top-up-credits` invocation verbatim.
- Recovery phrase never reaches Hub code. MetaMask's native sandbox handles import; the SDK only returns the resolved public address back to React.
- Use design tokens (`primary`, `destructive`, `emerald-500`, `muted`, `border`) — no hardcoded hex.
- Numeric formatting stays on `.toFixed(2)` for USD and `formatCredits()` for CR.
- Keep `IDIA_SYNAPSE_WALLET` constant as the treasury target on the funded path.

## Out of Scope
- No changes to `synapse-controller`, `idia-circular-settlement`, ledger writes, or settlement queue.
- Wix/credit-card rail stays available as an alternate `paymentRail` toggle; not modified.
