# Show real per-contributor settlement hashes in the audit UI

## What I checked first (and one correction)

Before planning I searched the whole app and queried the live database:

- No screen anywhere in the app reads `corporateHash` or `regionalHash`. Those two names exist only inside the settlement edge function's logs. So the "parent hashes shown under ACA hashes" mapping does not exist in the code today.
- The only hash list in the receipt view is **ACA References** on the Egress Logs page. On the newest receipt it holds exactly two values, and they are **data record fingerprints, not transaction hashes** (no `0x`, 64 hex chars) — the same two on every receipt going back to August.
- The real per-contributor transfer hashes **do exist**: the latest settlement run (`SYN-371E8458`) wrote 36 USDC payout hashes and 36 IDIA royalty hashes into the credit ledger, all confirmed on chain.
- **The gap:** those ledger rows have an empty reference field. The run reference only appears inside free text ("... for Ref: SYN-371E8458"). Nothing ties a receipt or a settlement summary to its set of contributor transfers, so the UI has no way to list them.

So the fix is not a re-mapping — it is wiring the contributor hashes through so the audit view can show all of them.

## What changes for the user

On Earnings & Settlement and on each settlement entry in the Activity Ledger, a new **Contributor Settlements** block lists every individual payout from that run:

- One row per contributor transfer, showing the short hash, amount, USDC or IDIA, and settled/failed state.
- Each row links straight to that transaction on BaseScan.
- The list is fully dynamic — 2 contributors or 36, it renders them all, with a count in the header and no truncation of the set.
- Contributors skipped for a missing wallet appear as "awaiting wallet", so a short list never silently hides people.
- On the Egress Logs receipt, ACA References keeps its own label (data lineage) and the settlement transactions appear as a separate, clearly named block — the two are never mixed.

If a run has no recorded transfers, the block says so plainly rather than showing nothing.

## Technical notes

1. **Link the transfers to their run.** Set `reference_id = ingestionReference` on every contributor ledger insert in `supabase/functions/idia-circular-settlement/index.ts` (yield, IDIA royalty, pending-wallet, and failure rows), and mirror the run reference plus contributor wallet into `metadata`. One migration backfills `reference_id` on existing rows by parsing the `for Ref: X` suffix out of `description` — read-verified as present on all current payout rows.
2. **New component** `src/components/billing/ContributorSettlementHashes.tsx`: takes a `referenceId`, queries `synapse_credit_ledger` for `transaction_type in ('data_sale_payout','idia_royalty_yield')` on that reference, and renders the list with `https://basescan.org/tx/<hash>` links. Rows are keyed by ledger id; hashes are validated against `/^0x[a-fA-F0-9]{64}$/` before a link is rendered.
3. **Consumers:** `EarningsSettlement.tsx` (latest run for the signed-in wallet) and the expanded row in `ActivityLedger.tsx` (the run the row belongs to). `ProvenanceAuditLog.tsx` renders it when the receipt resolves to a run reference, under its own heading beside ACA References.
4. **Logging:** every fetch and mapping step wrapped in `console.info("[BEGIN: Settlement.ContributorHashes] ...")` / `[END: ...]`, logging the raw row count, the count of rows that produced a valid hash, and — when those differ — an explicit `[WARN]` naming the dropped ledger ids, so a mapping failure can never be silent. Every catch logs the message and stack.
5. Presentation and data-fetch only, plus the reference wiring in the settlement function and the one backfill migration. No change to payout math or on-chain behaviour.
