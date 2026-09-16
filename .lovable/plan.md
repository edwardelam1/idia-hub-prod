# Accurate credit charge on receipts, settlement blocks removed

## What I verified first

- Every recent receipt's ledger row is literally `-1` credit ("Synapse Gas: MARKETPLACE_RESEARCH | Sector: general [1 CR]"). The receipts page is faithfully showing what was charged — the 1.00 comes from the charge itself, not from a display bug.
- The Synapse Controller prices these queries as `ceil(1 × sector base × buyer weight)`. The sector always resolves to `general` (base 1.0) and the buyer's weight lands at or below 1, so the result is always exactly 1 credit regardless of how many records were consumed. The newest receipt consumed 52 records and still cost 1 credit.
- The buyer weight is computed on every call but never stored on the receipt or the ledger row, so the figure can't be explained after the fact.

## What changes for the user

1. **The distributed amount and the Contributor Settlements block are removed** from the Egress Logs receipts (mobile and desktop). Receipts show data-consent facts only; settlement transfers stay on Earnings & Settlement.
2. **The credit figure becomes the real, weighted charge.** The charge scales with the buyer's weight and the volume of records actually consumed, so a 52-record yield and a 46,000-record yield no longer both cost 1.00 CR.
3. **The receipt explains the number.** Next to the charge, the receipt shows the weight and sector that produced it, so a vendor or buyer can see why it cost what it cost.

Existing receipts keep their historical 1.00 CR — they were genuinely charged that, and rewriting them would falsify the ledger.

## Technical notes

- `src/components/trading/ProvenanceAuditLog.tsx`: drop the `ContributorSettlementHashes` import and both render sites, drop `distributed` from `receiptSpend` and the per-run totals query (keep the per-ledger-entry charge lookup), and remove the "CR distributed" lines from the mobile card and the desktop row. Credit cell reads the exact charge from `synapse_credit_ledger.amount` for the receipt's ledger entry, formatted to 2 decimals, with weight/sector rendered beneath from the receipt metadata.
- `supabase/functions/synapse-controller/index.ts` (`calculateDynamicFee`): fee becomes `sector base × buyer weight × a record-volume factor` derived from the verified record count, rounded to 4 decimals rather than `Math.ceil` to a whole credit. The controller's existing sector/weight resolution and the `[SYNAPSE_CONTROLLER:VECTOR_APPLIED]` logging stay as they are; only the final fee expression and rounding change.
- The same function writes `buyer_weight`, `sector_label`, and `record_factor` into the egress row's `metadata` and into the ledger row's `metadata`, so the receipt can show the breakdown without recomputing anything client-side.
- All new fetch/mapping steps keep the `[PHASE_START]`/`[PHASE_END]` bracket convention, and every catch logs the message and stack.
- No change to settlement execution, payout math, or on-chain behaviour.

## One thing to confirm

Changing the fee formula is the only way the figure stops reading 1.00. If you'd rather leave pricing exactly as the controller has it today and only add the weight/record explanation next to the charge, say so and I'll cut the controller change from the plan.
