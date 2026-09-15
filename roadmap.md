# Roadmap

## Done
- Replaced the MetaMask relayer-approval path with an IDIA Life deep-link handoff (`src/lib/relayer-authorization.ts`).
- Wired the handoff into UniversalPurchaseScreen, SynapseTopUp, SynapsePurchaseModal and APIEndpoints.
- Hard 2-minute timeout + spinner always cleared; "insufficient USDC" now reads differently from "not authorized".

## Blocked (needs the IDIA Life app)
- Life must answer `idialife://authorize-relayer?owner=&relayer=&return=` in its appUrlOpen listener by running the
  existing (currently unwired) `walletService.provisionNewWallet()` and then reopening the `return` URL.
  Until that ships, the Hub handoff opens Life but nothing approves on-chain.
