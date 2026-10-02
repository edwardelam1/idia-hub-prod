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


## Music account linking (Radio console)
- [x] Spotify sign-in: listening history, top artists/tracks, playlists & saved songs, full-song playback (Premium)
- [x] Apple Music sign-in with the same data capture where Apple allows it
