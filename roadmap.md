# Roadmap

## Done
- Replaced the MetaMask relayer-approval path with an IDIA Life deep-link handoff (`src/lib/relayer-authorization.ts`).
- Wired the handoff into UniversalPurchaseScreen, SynapseTopUp, SynapsePurchaseModal and APIEndpoints.
- Hard 2-minute timeout + spinner always cleared; "insufficient USDC" now reads differently from "not authorized".

- IDIA Life now answers `idialife://authorize-relayer?owner=&relayer=&return=`: it shows an authorization screen,
  runs the one-time approval on the on-device wallet, warns on an owner mismatch, refuses a non-IDIA relayer, and
  returns to the Hub. Hub pins `return` to `https://hub.thebigidia.com` (Life only honours that host).

## LIDD Utility Intake (done)
- lidd_extraction_events table + profiles buyer diagnostic columns & weight trigger
- surveillance-api-intake edge function (x-api-key auth, Wix vault bridge, PII dropped)
- issue-extractor-key edge function (real franchise keys, SHA-256 hash stored)
- Utilities marketplace tab with balance + settlement via SynapsePurchaseModal

## Marketplace compact controls (done)
- Mobile 2 × 2 marketplace tool grid
- Title-only bundles with individual and bulk expand/collapse controls
- Trading Desk API Access moved into a fifth Marketplace panel; standalone sidebar entry retired
- Trading Desk summary reduced to compact side-by-side Staged Data and Active Bundles metrics

## Production custom selection (done)
- Real stream selections, proportional record pricing, server-side quotes, and matching source-record access

## Saved Searches and activity history (done)
- Unified Trading Desk, Best Friend AI, and Marketplace activity with exact Liability Shield receipt links
- Full input/result capture for new paid actions; honest receipt-only fallback for older egress records
- Compact mobile Egress Logs list with all receipt fields visible without horizontal scrolling

## Liquidity workspace redesign (done)
- [x] Built the tabbed liquidity slices and static Quick Actions bar
- [x] Matched v3 position presentation to v4 and placed it below v4
- [x] Removed the fee-tier panel and verified a clean build
## Liquidity inspector and mobile holdings (done)
- [x] Include live v4 value in the Your Position total
- [x] Show live Uniswap v4 and v3 pools in Pool Inspector
- [x] Prevent large Protocol Holdings totals from overlapping on mobile

## BIG IDIA Radio (done)
- [x] Display official Apple Music and Spotify playlist players side by side in the Master Console with the supplied logos and no client-side secrets.
- [x] Keep the console mounted across signed-in Hub pages so closing it does not stop playback.
- [x] Replace the dashboard banner with the supplied responsive artwork and a launch button; match the console surface to the artwork.


## Music account linking (Radio console)
- [x] Spotify sign-in: listening history, top artists/tracks, playlists & saved songs, full-song playback (Premium)
- [x] Apple Music sign-in with the same data capture where Apple allows it

## Marketplace mobile streamlining (done)
- [x] One-row header and five-segment tool selector on phones; descriptive cards kept on desktop
- [x] SQL Terminal: Editor/Results switch, Saved (n) quick list, single cost + actions row, info popover
- [x] AI Bundles: search, industry and filter in one row; micro time-window pills; icon collapse/expand
- [x] The Vulture: collapsible airlock specs; Uploader / Mesh Nodes / Ledger sub-tabs below desktop
- [x] Utilities: one-line balance + Settle card, compact key rows, collapsible integration specs
- [x] Trading Desk: compact header and swipeable sub-tab strip with active underline

## Crazy 8 role enforcement (done)
- [x] Reassign detectors to the official eight roles; Mirror runs real red-team probes
- [x] Cause-based alert titles and per-role report layouts in the Security pop-up

## CJIS hardening for The Vulture (in progress)
- [ ] CJIS-isolated intake: ledger only, no analytics copy or marketplace bundles (mesh + uploads)
- [ ] Notarization relayer: Merkle root of sanitized hashes anchored on Base, CJIS data stays off-chain
- [ ] Law-enforcement identifiers added to the PII filter (shared by both intake paths)
- [ ] AES-256 column encryption of ledger payloads and quarantine raw payloads (key in Vault)
- [ ] Authenticator-app (TOTP) MFA gate + 30-minute idle lock on the Vulture console and mesh-nodes
- [ ] Owner-scoped access to the provenance ledger and quarantine bucket for enterprise tenants
- [ ] Mesh key lifecycle: no hard deletes, revoke/rotate/allowlist via mesh-nodes, audit to security_events, 90-day expiry
