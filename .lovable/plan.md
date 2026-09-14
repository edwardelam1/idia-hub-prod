# Mobile wallet purchases + shared Ford vehicle data

Two open items: the credit purchase spins forever on Android, and the new Ford vehicle data needs to be visible to everyone across the app.

## 1. Fix the credit purchase on phones and all browsers

Today the purchase screen asks the wallet to connect and then simply waits. On a phone browser there is no wallet extension, so nothing ever comes back and the button spins indefinitely with no message.

What changes:

- **Detect the situation up front.** If there's no wallet available in the current browser and the user is on a phone, don't silently wait — hand off to the MetaMask app directly (deep link), or show a clear "Open in MetaMask" action that reopens the same purchase page inside the MetaMask app browser.
- **Never spin forever.** Every wallet step (connect, authorize, confirm) gets a time limit. If the wallet doesn't answer, the screen returns to the purchase view with a plain-English reason and a retry button.
- **Handle coming back from the app.** When the user returns from MetaMask, the page re-checks the wallet connection automatically instead of staying stuck.
- **Clear messages for the common cases:** request cancelled in the wallet, a request already waiting in the wallet, wrong network, no wallet installed.
- **Same behaviour everywhere a wallet is used:** the purchase screen, the credit top-up, the purchase pop-up, earnings withdrawal, and the API endpoint purchase — so no surface is left with the old stuck spinner.
- **Check on real browsers:** Android Chrome, iOS Safari, desktop Chrome/Safari/Firefox, and inside the MetaMask in-app browser.

## 2. Make Ford vehicle data available to everyone

The Ford vehicle table exists but is currently locked to each record's own owner, and nothing in the app reads it.

- Any signed-in user can read all Ford vehicle records — it is a shared pool like the other marketplace data, not personal data.
- Ford records are added to the platform-wide data totals that feed the marketplace catalogue, the trading desk figures, and freshness windows (24h / 7d / 30d / all time), grouped by metric type.
- The AI assistant gets Ford records as a queryable source alongside health, lifestyle and business data, with ecosystem-wide totals so it never quotes a small sample as the real count.

## Technical notes

Wallet flow:
- `src/lib/metamask-sdk.ts`: add mobile/deep-link handling to the SDK config, expose provider-availability and in-app-browser detection, and wrap `eth_requestAccounts` in a timeout that rejects with a typed reason.
- `src/lib/usdc-approval.ts`: apply the same timeout/abort to `wallet_switchEthereumChain`, `approve`, and receipt waiting; keep the existing error codes.
- Callers to update: `UniversalPurchaseScreen.tsx`, `SynapseTopUp.tsx`, `SynapsePurchaseModal.tsx`, `EarningsSettlement.tsx`, `APIEndpoints.tsx` — reset `isProcessing`/`step` on every failure path and add a "Open in MetaMask app" fallback button when no provider is injected.
- Deep link target: `https://metamask.app.link/dapp/<host><path>` so the user lands back on the same purchase route.

Ford data (database migration):
- Grant `SELECT` on `public.staged_ford_data` to `authenticated`, `ALL` to `service_role`; replace the owner-scoped select policy with `USING (true)` for authenticated users.
- Extend `get_staging_aggregates` and `get_staging_aggregates_windowed` with a `staged_ford_data` branch, categories `vehicle.<metric_type>`, windows keyed off `processed_at` (the table has no `created_at`), quality left null since the table carries no quality score.
- Extend `get_omni_aggregates` with an ecosystem-wide `ford` block (count, distinct metric types, distinct vehicles, contributors, value average, recorded/processed ranges) — not filtered by user.
- `supabase/functions/best-friend-ai/index.ts`: add Ford to the omni fetch, marketplace aggregate scan, ACA-hash table list, and the prompt context, labelling it ecosystem-wide.
