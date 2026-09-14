# Fix the Synapse credit purchase hanging on mobile

No wallet connect option is added anywhere. The wallet is already attached to the account from IDIA Life, and the purchase keeps using that wallet exactly as it does today.

## What's happening

Buying credits from the IDIA wallet is one long request: the app asks the backend to move USDC, and the backend holds the connection open while it sends the transaction and waits for the network to confirm it. On a phone that single connection often dies — the screen locks, the browser backgrounds the tab, or the mobile network drops — and the app never hears back. The result is a spinner that never stops, even in cases where the payment actually went through.

## What changes

- **The purchase no longer depends on one long connection.** The app hands the purchase to the backend, gets an immediate acknowledgement, and then checks on its status. The confirmation wait happens on the server side.
- **The screen always resolves.** Within a few seconds the user sees either "credits added", "payment still confirming — we'll update you", or a plain-English failure with a retry button. No indefinite spinner.
- **Returning to the app picks up where it left off.** If the phone was locked or the browser was backgrounded, reopening the purchase screen resumes checking and shows the final result.
- **No double charges.** The purchase reference already in use guarantees a repeated attempt returns the original result instead of charging twice.
- **Clear wording for the real failure cases:** not enough USDC in the wallet, the wallet hasn't authorised the transfer yet, or the network is congested.
- **Applies to every credit purchase surface:** the plan checkout screen, the credit top-up panel, the purchase pop-up, and the API endpoint purchase.
- **Verified on Android Chrome and iOS Safari** as well as desktop, including a screen-lock mid-purchase.

## Also pending: shared Ford vehicle data

- Any signed-in user can read all Ford vehicle records — it is a shared pool like the other data sources, not personal data.
- Ford records join the platform-wide totals feeding the marketplace, trading desk figures and freshness windows (24h / 7d / 30d / all time), grouped by metric type.
- The AI assistant can query Ford records alongside health, lifestyle and business data, using ecosystem-wide totals so it never quotes a sample as the real count.

## Technical notes

Purchase flow:
- `top-up-credits` splits into two phases: phase one validates, checks allowance/balance, records a `pending` ledger row keyed by `idempotency_key`, dispatches `transferFrom`, and returns the tx hash immediately without awaiting the receipt. Receipt confirmation moves to a background task (`EdgeRuntime.waitUntil`) that flips the row to `completed` and credits the balance, or `failed` with a reason.
- New lightweight status read: the client polls the `synapse_credit_ledger` row by `idempotency_key` (existing RLS covers the owner) rather than holding the invoke open. Poll with backoff, cap around 90s, then switch to "still confirming".
- Client callers — `UniversalPurchaseScreen.tsx`, `SynapseTopUp.tsx`, `SynapsePurchaseModal.tsx`, `APIEndpoints.tsx` — wrap `functions.invoke` in an `AbortController` timeout (~20s) and fall through to polling instead of treating a dropped request as a hang; every catch path resets `isProcessing`/`step`.
- On mount, each surface checks for an unresolved purchase reference (persisted in `sessionStorage`) and resumes polling; a `visibilitychange` listener re-polls on foreground.
- `APPROVAL_REQUIRED` keeps its current meaning but is surfaced as a message on the existing authorise action — no new wallet-connect entry point, no MetaMask onboarding UI.

Ford data (database migration):
- Grant `SELECT` on `public.staged_ford_data` to `authenticated`, `ALL` to `service_role`; owner-scoped select policy replaced with `USING (true)` for authenticated users.
- Extend `get_staging_aggregates` and `get_staging_aggregates_windowed` with a `staged_ford_data` branch, categories `vehicle.<metric_type>`, windows keyed off `processed_at`, quality null (no quality column).
- Extend `get_omni_aggregates` with an ecosystem-wide `ford` block (count, distinct metric types, distinct vehicles, contributors, value average, recorded/processed ranges), not user-filtered.
- `supabase/functions/best-friend-ai/index.ts`: add Ford to the omni fetch, marketplace aggregate scan, ACA-hash table list, and prompt context, labelled ecosystem-wide.
