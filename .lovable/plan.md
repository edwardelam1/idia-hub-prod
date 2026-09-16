# Egress receipts: true record counts, real NFTs, exact credits

## What I verified first

- The newest receipt (16 Sep, 01:21) lists exactly **2 consent references** even though nine people contributed data. In marketplace mode Best Friend AI only keeps **one reference per contributor**, and the receipt then only keeps the ones it can verify — so the list collapses to a handful. The database holds **99 consent references across 9 contributors** for the health data actually read.
- The label "2 records" is wrong twice over: those entries are consent references for whole data streams, not records. The same query summarised **46,409 records**.
- **NFTs:** the buyer's wallet (0x429F…5A40) really does hold **46 Liability NFTs** on the live contract, the newest minted **21 July 2026**. None of them carries a receipt id that matches any row in the receipt log, and no NFT has been minted for any receipt since. So "Mint pending" is currently permanent — nothing mints these today and nothing ties old mints to receipts.
- **Credits:** the receipt links to a single capped −1.00 CR gas line. The same settlement run (SYN-371E8458) also holds the full set of contributor payout and royalty lines. Today's "1.00 CR" shows only the gas line, not the transaction total.

## What will change

### 1. Receipts reference everything that was consumed
Best Friend AI will hand the Synapse Controller **every consent reference behind the data it read** (all nine contributors, all their streams) instead of one sample per contributor. The Synapse Controller itself is untouched — it already stores whatever it is given and verifies it against the data vaults.

The receipt line will read the true consumed record count (e.g. "46,409 records · 99 consent references") instead of "2 records", taken from the figures the receipt already stores.

### 2. Liability NFT: show what actually exists, honestly
- The reconciler will stop relying solely on the on-chain receipt-id match. It will read the **actual NFT transfers into the buyer's wallet** from the live chain, record token id, mint time and mint transaction, and link a receipt to a mint when the receipt id matches.
- Where no NFT was minted for a receipt, the row will say **"Not minted"** (not "Mint pending"), with a link to the wallet's Liability NFT collection on BaseScan so the auditor can still see the minted set.
- Where a mint is matched, the row links straight to that token on BaseScan.

### 3. Exact credits from the ledger
Each receipt row will show the credits taken from the **ledger lines for that settlement run**, not the single gas entry: the buyer charge as the headline figure, with the run's contributor distribution total shown underneath in the expanded detail. If a receipt has no ledger link, the row says so rather than showing a fabricated 1.00 CR.

## Technical notes

- `best-friend-ai`: `fetchMarketplaceRecords` currently registers one hash per owner (`perContributor`); it will return the full verified hash set per contributor, and `consumedReceipt` will be the union of every touched hash. Sampling for the model prompt stays as-is (row budget unchanged) — only the receipt payload widens.
- `reconcile-liability-nfts`: add an Alchemy `alchemy_getAssetTransfers` (erc721, `toAddress` = buyer wallet, contract = `PROTOCOL.liabilityReceipt`) pass alongside the existing contract read; persist `nft_token_id`, `nft_minted_at`, mint tx hash into `egress_logs`. Requires a migration adding `nft_mint_tx_hash text` to `egress_logs`.
- `ProvenanceAuditLog.tsx`: record-count cell reads `data_points_count` / `metadata.consumed_record_count`; ACA viewer trigger labelled "N consent references"; NFT cell renders matched token / "Not minted" + collection link; credit cell uses a new per-reference ledger aggregate query (buyer charge + distribution total) keyed by `reference_id`.
- All new fetch/map phases bracketed with `[BEGIN]`/`[END]` logs; every catch logs message + stack.
- The Synapse Controller is not modified.
