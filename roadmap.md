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
