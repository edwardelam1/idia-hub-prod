# Remove "Circle" from crypto withdrawal wording

## What changes

The only place "Circle" appears in user-facing copy is the Withdraw to Crypto Wallet dialog (reached from the DeFi tab of Earnings & Settlement). Three labels get rewritten to reference the MetaMask / on-chain rail instead:

- Dialog subtitle: "Send USDC to your Web3 wallet via Circle." becomes wording describing a direct on-chain USDC transfer to the connected MetaMask wallet address.
- Primary button: "Withdraw via Circle" becomes "Withdraw USDC".
- Processing state: "Initiating Circle USDC transfer" becomes "Initiating on-chain USDC transfer".

No other screen mentions Circle — the purchase/top-up flows already use MetaMask only.

## Technical notes

- Single file: `src/components/billing/WithdrawCryptoModal.tsx` (copy only; the withdrawal call itself is unchanged).
- The Activity Ledger's internal rail heuristic also drops the `circle` keyword from its crypto funding-source list; the `circle_transfer_id` database column stays as-is since it is legacy data, never shown as a brand name.
