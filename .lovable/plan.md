# Egress log: full data references, per-row copy, and Liability NFT

## What's wrong today (verified)

1. **Only 2 data references per receipt.** The most recent receipts each store exactly two reference hashes. In marketplace/research mode, Best Friend AI deliberately sends only *one representative record per contributing data owner* to the receipt service, and there are currently two contributors. So the receipt lists owners, not the records actually used.
2. **Copy confirmation appears on every row.** The green check is tracked by the copied *text*, not by the row. Because recent receipts share the same reference pair, pressing copy marks every matching row (and the same problem affects the token and anchor columns whenever two rows share a value).
3. **No Liability NFT shown.** Receipt records already have places for an on-chain transaction and status, but every existing row is `PENDING` with no transaction recorded, and nothing in the purchase path writes it back. The NFT is minted by the existing contract; the Hub simply never captures or displays it.

## Plan

### 1. Record every data reference actually consumed
- Send the complete list of consumed record hashes to the receipt service instead of one sample per owner, for Best Friend AI research mode and the other paid paths.
- Keep the separate per-owner list used for paying contributors, so payouts stay exactly as they are today.
- Verification of references currently only checks the health vault; extend it so lifestyle/vehicle-staged records are also verified rather than silently dropped.
- Store the full verified list on the receipt, plus the total consumed count.

### 2. Fix the copy buttons
- Track the copy confirmation by row **and** field, so only the button pressed shows the green check.
- Apply this to all copy actions: liability token, data references, anchor, and the new NFT fields, on both the phone list and the wide table.

### 3. Capture and display the Liability NFT
- Read the minted receipt NFTs for the buyer's wallet from the existing contract on Base and match each to its receipt using the liability token already written into the mint.
- Save the matched token number, transaction, and minted state back onto the receipt so it only has to be looked up once, and mark receipts with no mint yet as "pending".
- Show on each receipt row: NFT token number, mint state, and an open-in-BaseScan link to the token page for the owning wallet, alongside the existing purchase metrics.
- New mints appear automatically as the page refreshes its receipt data.

## Technical details
- Backend: `best-friend-ai` builds `consumedReceipt` from `marketplaceReceiptIds` (one hash per contributor) — switch to the full hash set while keeping contributor fan-out for settlement; `synapse-controller.resolveAcaLineage` verifies only against `staged_health_data` — widen to the other staged sources.
- A small edge function reconciles mints: `getReceiptsByBuyer(wallet)` + `getReceipt(tokenId)` on `0x5eA57335f7086f1C069d769a9012835B80a00BD3` (Base mainnet), matching `synapseReceiptId` to `egress_logs.liability_token_hash`, then writing `on_chain_tx_hash`, token id, and `on_chain_status`. A migration adds the token-id column if absent.
- `ProvenanceAuditLog.tsx`: copy state becomes `${log.id}:${field}`; NFT column/field added to the mobile list and the desktop table; BaseScan link format `https://basescan.org/token/<contract>?a=<wallet>`.
- Phase logging and stack traces retained on all new queries and chain reads.

## Verification
- Run a research query and confirm the receipt lists every consumed record, not two.
- Confirm copy marks only the pressed button across every field and both layouts.
- Confirm a receipt with a real mint shows its token and opens the correct BaseScan page, and unminted receipts read "pending".
