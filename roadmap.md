# Roadmap

## In progress
- [x] Replace the MetaMask-based "Authorize Relayer" path with an IDIA Life deep-link handoff + on-chain allowance polling (`src/lib/relayer-authorization.ts`).
- [ ] Wire the new handoff into the three purchase surfaces (UniversalPurchaseScreen, SynapseTopUp, SynapsePurchaseModal) and distinguish "not authorized" from "insufficient USDC".
- [ ] Use the native `idialife://` scheme so the handoff opens inside the iOS/Android shells, not the browser (same scheme already allow-listed for Supabase auth callbacks).

## Blocked / needs another project
- [ ] IDIA Life companion change: answer `idialife://authorize-relayer` by running `walletService.provisionNewWallet()` and returning to the Hub URL in `return`. Until this ships, Hub's handoff has nothing to land on.
