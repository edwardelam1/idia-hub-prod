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

## Liquidity workspace redesign (in progress)
- [ ] Build the tabbed liquidity slices and static Quick Actions bar
- [ ] Match v3 position presentation to v4 and place it below v4
- [ ] Remove the fee-tier panel and verify the page
