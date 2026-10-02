# Make the Subscription page live and accurate

## What's wrong today (confirmed in the data)
- **Projected Burn** is always 0. Usage is summed from ledger rows labelled "deduction", but real charges are recorded as "USAGE"/"DEBIT" (185+ rows exist). The projection also uses the calendar day of the month, not your billing cycle.
- **Renewal Countdown** shows "— Days". Both subscriptions on file ran out in April 2026 but are still marked "active", so the countdown reads 0 and nothing flags the lapse.
- **Invoice Archive** is empty. Nothing writes to the invoice table (0 rows), even though real credit purchases and charges are in the ledger.
- **Protocol Tier** reads only the subscription record. It ignores the tier on your platform account (e.g. "enterprise"), and one record uses "pure_alpha", which the page doesn't recognise, so it falls back to "Standard Individual".

## What will change
1. **Projected Burn**: worked out from your real credit charges. Average daily spend over the last 30 days (or the current cycle if shorter), projected to the cycle end. Shown next to your actual balance. The warning appears only when the projection exceeds the balance.
2. **Renewal Countdown**: counts down to the real cycle end date. A lapsed subscription shows "Expired on <date>" with a renew action instead of "— Days". If there is no subscription, the card says so.
3. **Invoice Archive**: built from the ledger. Each real credit purchase (deposit, with its USDC amount and BaseScan transaction link) and each monthly roll-up of charges appears as a statement. Rows from the invoice table, if any are added later, are merged in. Each row has a download option that produces a statement from that row's real data. Nothing is invented.
4. **Protocol Tier**: one resolver decides your tier. It uses the active, unexpired subscription first, then your platform account tier, then the Standard default. "pure_alpha" and the other known tiers get proper names and limits. The status badge shows Active, Expired, or None based on real dates instead of always "Active".
5. **Live updates**: balance, burn, and invoices refresh when new ledger entries arrive. Settings > Billing and the API billing card use the same corrected numbers.

## Technical details
- `useBillingData`:
  - usage filter becomes `entry_type in ('USAGE','DEBIT','usage')`, using absolute amounts and the 30-day or cycle window
  - add `isExpired` and `cycleEnd`
  - tier resolver reads `platform_users.hub_saas_tier` and adds `pure_alpha`/`pro`/`pro_plus` entries to `PLAN_PRICING`
- Available balance comes from `SynapseCreditsContext.balanceData`, not `limit - used`.
- Invoice archive: client-side derivation from `synapse_credit_ledger` (deposits plus monthly USAGE aggregates), merged with `user_invoices`. Download produces a generated text/CSV statement. No schema change is needed.
- Realtime ledger subscription inside `useEffect` with cleanup. It invalidates the billing queries.
- No changes to how payments or charges work.
