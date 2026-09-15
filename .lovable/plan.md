# LIDD Utility Intake — Staged Debt & Utilities Tab

A commercial surveillance operator pushes batches of plate reads. Each plate is checked against the external Wix identity vault, the plate is dropped immediately, and every matched person stages a $2.50 unpaid debt against the operator. A new "Utilities" tab in the marketplace shows that accumulated balance and settles it through the existing checkout.

## Phase 1 — Database

Run the supplied SQL as given:

- Adds the buyer diagnostic columns to `profiles` (role, jurisdiction, latency, weights, completion timestamps, raw answers) — none exist today, so nothing is overwritten.
- Adds the server-side trigger that sets the weights from the chosen role on insert or role change.
- Creates `lidd_extraction_events` (extractor's account, matched person's GUID, $2.50 cost, unpaid status, extraction time). The person's GUID links to the unique `platform_guid` on profiles, which exists. Access: back-end services full, a signed-in operator reads only its own rows. No plate, location or vehicle data is stored.

Two additions the settlement step needs: grants so the table is reachable at all, and an update rule so an operator can flip its own rows from unpaid to paid after paying.

## Phase 2 — Intake endpoint

New `supabase/functions/surveillance-api-intake/index.ts` using the supplied code verbatim — same loop, same math, same `[PHASE_START]`/`[PHASE_END]` bracketing, same stack traces in every catch.

Two additions, since this endpoint is exposed to an outside company:

- Cross-origin headers on every response, including errors.
- The request must carry the issued credential in an `x-api-key` header; unknown or revoked keys are rejected with 401 before any vault call, logged with the same bracketing. The body's `extractor_id` is cross-checked against the key's owner.

The Wix vault key must be saved before the function can run — I'll open the secure form for `WIX_SECURE_API_KEY` during the build.

## Phase 3 — Utilities marketplace tab

`DataMarketplace.tsx` gains a fourth tile, "Utilities", visible to everyone alongside SQL Terminal, AI Bundles and The Vulture.

New `src/components/marketplace/utilities/UtilitiesIngestionPanel.tsx`, built from the supplied component — the pasted markup lost its tags in transit, so I'll rebuild the layout faithfully to what it describes while keeping every line of logic and every bracketed log verbatim:

- Header: title, subtitle, "API Active" badge.
- "Pending Data Dividend Balance" card: sum of unpaid events, count of identity infractions, "Settle Balance" button disabled while loading or at zero.
- "Commercial Ingestion Credentials" card: masked key field, copy action, "Generate Franchise Key" button.
- The existing `SynapsePurchaseModal`, unmodified, opened with the balance prefilled.

Two behaviour notes:

- Key generation calls the back end to mint a real key rather than the placeholder string in the snippet, so the key it shows actually works against the intake endpoint. Shown in full once with a "store this securely" notice; only its hash is kept.
- After checkout reports success, the panel marks that operator's settled events as paid and refreshes, so the balance actually clears.

## Technical notes

- Key issuance reuses the existing `api_keys` table (SHA-256 hash, 8-char prefix) via a small `issue-extractor-key` edge function; no raw key is persisted.
- Settlement is prefilled at the standing $0.75/credit rate; the staged amount stays as recorded.
- `SynapsePurchaseModal` is untouched; the panel only supplies the prefill and reacts to the result.
