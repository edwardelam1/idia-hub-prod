## 1. Rail 1 → ETH (with readable color)

**File:** `src/hooks/useWalletBalance.ts`
- Add a second on-chain read: `publicClient.getBalance({ address: walletAddress })` (native ETH on Base) alongside the existing USDC `balanceOf`.
- Return shape becomes `{ usdc_balance, eth_balance }` (ETH formatted with `formatUnits(raw, 18)`).
- Keep the same 15s polling, abort, and yield behavior.

**File:** `src/components/dashboards/IndividualDashboard.tsx`
- Import `useWalletBalance` and pull `eth_balance`.
- Replace the Rail 1 card content:
  - Label: `Rail 1: ETH` with `Wallet` icon swapped for an ETH-style glyph (keep `Wallet` if no icon available — label change is what matters).
  - Value: `eth_balance.toFixed(4)` with unit `ETH` instead of `USD`.
  - Color: switch label from `text-muted-foreground` to `text-sky-400` and value to `text-sky-300` (matches the colored treatment used on Rail 2/3, much more legible on the dark card). Border/bg tinted `bg-sky-500/5 border-sky-500/20` to match the sibling rails.
- Remove the `rail1_Operating` derivation (no longer reading `protocolState.hub_operating_cash` for this card).

## 2. MetaMask QR auto-popup on launch

**File:** `src/lib/metamask-sdk.ts`
- Set `checkInstallationImmediately: false` (currently `true`, which forces the SDK to surface its install/QR modal as soon as the singleton is constructed at module import).
- Keep `injectProvider: true` so the extension is still detected when the user clicks "Connect MetaMask".
- The explicit `connectEmbeddedWallet()` call already triggers `eth_requestAccounts`, which prompts the extension/QR only on user action — no other change needed.

## 3. Notifications Center frozen

**File:** `src/components/notifications/NotificationsCenter.tsx`

Two issues compound:

- `ScrollArea` is given `max-h-96` but no fixed height. Radix `ScrollArea` only scrolls when its root has a concrete height; with `max-h` and a flex parent it collapses and the wheel never engages. Change to `h-96` (and keep `max-h-96` only as an upper cap if needed: `h-96`).
- `PopoverContent` should be non-modal (default) and not trap pointer events. Add `onOpenAutoFocus={(e) => e.preventDefault()}` to stop the focus-trap from stealing scroll on the rest of the page, and add `collisionPadding={8}` so it repositions cleanly. Wrap the trigger `Popover` with `modal={false}` to be explicit (prevents the inert-overlay behavior some Radix versions apply when stacked under another portal).
- The "Mark all read" / per-item delete buttons sit inside a `<li onClick>` — keep `e.stopPropagation()` (already present on delete) and add the same guard to "Mark all read" by moving it out of the row click path (it already is — verify no regression).

Verification after build:
- Refresh app: no MetaMask QR/install modal on load.
- Dashboard: Rail 1 card reads `ETH` with a 4-decimal ETH value in sky/blue.
- Open bell: popover scrolls, "Mark all read" and trash buttons respond, page outside popover stays interactive.
