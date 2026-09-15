# LIDD Utility Intake & Data Staging

A commercial surveillance operator pushes batches of plate reads to IDIA. Each read is checked against the external Wix identity vault, the plate is dropped immediately, and every matched person produces a $2.50 staged debt against the operator. A new "Utilities" tab in the marketplace shows the operator their accumulated unpaid balance and lets them settle it through the existing checkout.

## Phase 1 — Staging table

New table `lidd_extraction_events` exactly as specified: extractor ID (the operator's account email), matched person's ID, $2.50 cost, payment status defaulting to unpaid, extraction time, created time.

Access: back-end services have full access; a signed-in operator can read only rows whose extractor ID matches their own sign-in email. No plate, location or vehicle data is ever stored.

One addition required for the payment step: an update rule so a settlement can flip that operator's own rows from unpaid to paid, plus the grants the table needs to be reachable at all.

## Phase 2 — Intake endpoint

New edge function `surveillance-api-intake`, using the supplied batch code with its loop, math and log brackets unchanged: parse payload, validate extractor and infractions array, loop each plate through the Wix vault, skip non-matches and per-plate faults without aborting the batch, collect matched events, bulk-insert them, return processed/matched/debt-staged counts. Every step keeps its `[PHASE_START]`/`[PHASE_END]` logs and every catch logs the full stack.

Two additions, since this endpoint is exposed to an outside company:

- The request must carry the issued credential in an `x-api-key` header. The function hashes it, matches an active key record, and derives the extractor identity from that record — the `extractor_id` in the body is only cross-checked. Unknown or revoked keys are rejected with 401 before any vault call. This is logged with the same bracketing.
- Cross-origin headers on every response, including errors.

The Wix vault key must be saved before the function can run — I'll open the secure form for `WIX_SECURE_API_KEY` during the build.

## Phase 3 — Utilities marketplace tab

`DataMarketplace.tsx` gains a fourth tile, "Utilities", visible to everyone alongside SQL Terminal, AI Bundles and The Vulture; it passes the signed-in person's email as the extractor ID.

New `src/components/marketplace/utilities/UtilitiesIngestionPanel.tsx`. The pasted snippet lost its markup in transit, so I'll rebuild it faithfully to what it describes, keeping its logic and bracketed logs verbatim: header with title, subtitle and an "API Active" badge; a "Pending Data Dividend Balance" card summing all unpaid events with the event count and a "Settle Balance" button (disabled while loading or at zero); a credentials card with a masked key field, copy action and "Generate Franchise Key" button; the existing `SynapsePurchaseModal` opened with the balance prefilled.

Two behaviour notes:

- Key generation calls the back end to mint a real key (per your earlier decision): shown in full once with a "store this securely" notice, only its hash kept, previously issued keys listed by prefix with a revoke action.
- After the checkout modal reports success, the panel marks that operator's settled events as paid and refreshes, so the balance actually clears.

## Technical notes

- Settlement is prefilled in credits at the standing $0.75/credit rate; the staged amount stays as recorded.
- Key issuance reuses the existing `api_keys` table (SHA-256 hash, 8-char prefix) through a small `issue-extractor-key` edge function; no raw key is persisted.
- `SynapsePurchaseModal` stays unmodified; the panel only supplies the prefill amount and reacts to its result.
