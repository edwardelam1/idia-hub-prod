# Custom Selection — production buildout

Today the "Custom Selection" button on a bundle is a mock-up. It invents a list of
"data points" from the bundle's marketing bullet text and gives each one a made-up
price (first item cheap, second twice as much, and so on). Nothing you tick there
matches real data, and when you check out the cart it asks for the whole bundle
anyway.

Two further faults sit behind it, both confirmed:

- The cart asks a pricing service that does not exist, so it silently falls back to
  whatever price the page happened to be showing.
- Checkout refuses every bundle in the catalogue today, because it looks for a list
  of source records that none of the current bundles carry.

So custom selection has to be rebuilt on the real data, and the two paths behind it
have to be made real too, otherwise nothing can actually be bought.

## What it becomes

Opening Custom Selection on a bundle shows the actual data streams inside that
bundle, taken from the bundle's own contents — for example the movement bundle
lists steps, step length, walking speed, double support and walking asymmetry, each
with its true record count and its own credit price.

- Price of a pick is its exact share of the records. Choose streams holding half the
  records and you pay half the bundle price; select everything and you pay the full
  bundle price, never more.
- A running total updates as you tick, shown against your credit balance, with a
  clear "not enough credits" state that opens the top-up window instead of a dead
  button.
- Search still narrows the list, and empty or single-stream bundles say so rather
  than showing a blank panel.
- The selection goes into the cart as one line naming the bundle and the chosen
  streams, with quantity controls removed for partial picks (buying the same slice
  twice is meaningless).

## Cart and checkout

- A new pricing service re-prices every cart line on the server from the catalogue
  and the chosen streams, so the total shown is the total charged and a tampered
  page price cannot be used. If the catalogue price has moved since the item was
  added, the cart shows the new price before you confirm.
- Checkout accepts a partial selection, resolves the real source records for that
  bundle's category, time window and chosen streams, and issues the Liability Shield
  receipt for exactly that slice. Full-bundle purchases keep working unchanged and
  will start working again for the current catalogue.
- Failures name the reason (stream no longer available, price moved, insufficient
  credits) instead of a generic rejection.

## Technical notes

- `src/components/marketplace/AlaCarteModal.tsx`: replace the fabricated
  `getDataPoints()` with streams read from `data_json.activity_mix`
  (`{ stream: recordCount }`) plus `record_count` and `price`. Per-stream price =
  `round(bundlePrice × streamRecords / totalRecords)`, remainder assigned so the
  sum of all streams equals the bundle price exactly. Emits one cart item
  `{ id: "<bundle_id>:<streams joined>", bundleId, name, streams: string[],
  recordCount, price }`.
- `src/types/marketplace.ts`: extend `CartItem` with optional `streams` and
  `recordCount`.
- New edge function `supabase/functions/quote-bundle/index.ts` (the one
  `ShoppingCart.tsx` already calls and which does not exist): CORS preflight, JWT
  check, takes `{ items: [{ bundle_id, streams?, quantity? }] }`, reads
  `marketplace_bundles`, recomputes each line by the record-share rule and returns
  `{ items: [{ bundle_id, streams, name, base_valuation, stale }], total }`.
  `ShoppingCart.tsx` sends streams and stops falling back silently — a failed quote
  blocks confirm with a retry.
- `supabase/functions/marketplace-bundle-access/index.ts`: accept optional
  `streams`; replace the `data_json.aca_record_ids` requirement (no active bundle
  has that key — this is why checkout currently fails) with a lineage query against
  the staging table for the bundle's category root, `window_start`/`window_end` and
  the selected `activity_type` values, capped and logged. Charge the recomputed
  server-side price, not the client's.
- `DataMarketplace.tsx`: pass `streams` through `handlePurchase`, merge duplicate
  selections of the same bundle+streams instead of stacking rows.
- Full `[PHASE_START]`/`[PHASE_END]` bracketing and stack traces in both functions,
  per the logging mandate. No synthetic data anywhere — an empty `activity_mix`
  means the picker reports no selectable streams.
