# Utilities Intake Gateway & Ephemeral Verification Bridge

A fourth tab in the Data Marketplace, "Utilities", where a commercial surveillance operator gets a credential to feed plate reads into IDIA. Each accepted read charges the operator a $2.50 processing royalty and splits it four ways in the clearinghouse ledger. Plate numbers are never stored here — they are exchanged with the Wix identity vault for an opaque account ID and dropped.

## Phase 1 — Ledger and billing

New table `clearinghouse_ledger`: account ID (text — a real account ID or a pool name such as `POOL_DISTRICT_4`), amount, category, extractor ID, created time. Access rules: back-end services get full access; a signed-in person can read only the rows paid to their own account. Pool and admin rows stay invisible to regular users.

New billing routine `deduct_extractor_balance(p_extractor_id text, p_amount numeric)`:
- Resolves the extractor to its IDIA account and charges the $2.50 against its existing Synapse credit balance at the standing $0.75/credit rate (3.3333 CR, 4 decimals internally).
- Refuses and raises when the balance is short, so nothing is written to the ledger for an unbilled read.
- Appends a normal credit-ledger entry so the charge shows in the operator's activity.

## Phase 2 — Intake endpoint

New edge function `surveillance-api-intake`, built on the supplied code with its math and log structure untouched. Two additions required by the "real keys" decision:

- The call must carry the issued credential in an `x-api-key` header. The function hashes it, looks up the matching key record, and takes the extractor identity from that record — the `extractor_id` in the body is only cross-checked, never trusted on its own. Unknown, revoked or mismatched keys are rejected with 401 before any Wix call or billing.
- Standard cross-origin headers on every response, including errors.

Everything else stays exactly as specified: payload validation, the Wix vault round trip, clean 200 "ignored" exit for unregistered assets, the $2.50 split (citizen $0.75, District 4 $0.50, community $0.25, admin $1.00), the four ledger rows, then the extractor charge. Every step keeps its bracketed start/end logs, and every failure path logs the exact error and stack.

The Wix vault key is needed before the function can run — I'll open the secure form for `WIX_SECURE_API_KEY` during the build.

## Phase 3 — Utilities tab

`DataMarketplace.tsx` gains a fourth tile, "Utilities", visible to everyone, sitting next to SQL Terminal, AI Bundles and The Vulture.

New `src/components/marketplace/utilities/UtilitiesIngestionPanel.tsx`. The pasted snippet lost its markup in transit, so I'll rebuild it faithfully to the described design: a header with title, subtitle and a "System Operational" status badge; a credentials card with a masked key field, a copy action, and a "Generate Franchise Key" button that shows "Provisioning…" while it works; the $2.50 royalty footnote. It keeps the bracketed console logs from the snippet.

Behaviour differences from the snippet, following the "real keys" decision: the button calls the back end to mint a genuine key, the full value is shown exactly once with the "store this securely" notice, and only its hash is kept. The panel also lists previously issued keys by prefix with a revoke action, and shows the extractor's current credit balance so an operator can see when they need to top up.

## Technical notes

- `clearinghouse_ledger.user_id` is text on purpose — it holds either a Supabase auth ID or a pool constant, so no foreign key.
- Key issuance reuses the existing `api_keys` table (SHA-256 hash stored, 8-char prefix for display) via a small `issue-extractor-key` edge function; no raw key is ever persisted.
- Billing runs through the routine rather than inline SQL so the balance check and the ledger append stay in one transaction.
- Nothing about plate data is written to Supabase at any point; the plate exists only in the request body and the outbound Wix call.
