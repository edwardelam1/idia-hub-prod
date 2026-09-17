# Settle Utility Balance With Existing Credits

Today the "Settle Balance" button on the Utilities tab always opens the buy-credits screen, even when the balance is already covered. It should behave like a Best Friend AI chat: confirm the charge, deduct the credits, mark the events paid. Buying credits stays as the fallback when the balance is short.

## Behaviour

- Button opens a small confirmation dialog showing the amount due (e.g. 2.50 CR), the current credit balance, and the balance after paying.
- If credits cover the amount: "Pay 2.50 CR" confirms, the credits are deducted, staged events are marked paid, balance refreshes, toast confirms settlement.
- If credits are short: the dialog states the shortfall and its action button opens the existing buy-credits screen (current behaviour), which on completion returns to the settle step rather than silently marking events paid.
- The button stays disabled while loading or when the balance is zero.

## Technical notes

- New edge function `settle-utility-balance` (synapse-controller and issue-extractor-key untouched):
  - authenticates the caller from the session JWT;
  - re-reads unpaid `lidd_extraction_events` for that extractor server-side and computes the true total (client amount is never trusted);
  - reads the live balance via the `get_synapse_balance` RPC and rejects with a structured `INSUFFICIENT_CREDITS` payload (amount due, available, shortfall) when short;
  - inserts one `synapse_credit_ledger` row: `entry_type: "USAGE"`, `transaction_type: "fee"`, `status: "settled"`, negative amount, description naming the LIDD utility settlement, `reference_id` `LIDD-xxxxxxxx`, metadata carrying event count and event IDs;
  - marks exactly those event IDs `paid` and stores the ledger entry id in their metadata, so a retry cannot double-charge;
  - idempotency: settles only the event IDs read in the same call, and returns already-settled when no unpaid rows remain;
  - CORS OPTIONS intercept plus `[PHASE_START]`/`[PHASE_END]` brackets on every fetch, query and loop, with exact error + stack in each catch.
- `UtilitiesIngestionPanel.tsx`: add the confirmation dialog, read `available_credits` from `useSynapseCredits`, call the new function, then `refreshBalance()` and `fetchBalance()`. `handleSettlementComplete`'s direct client-side `payment_status` update is removed — settlement only happens through the edge function.
- Record the settlement in `activity_history` in line with other paid activity.
