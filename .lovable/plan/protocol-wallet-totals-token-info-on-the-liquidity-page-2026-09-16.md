# Protocol Wallet Totals & Token Info on the Liquidity Page

Today the Liquidity page only shows the IDIA/USDC Uniswap pools plus your own and the org Safe's LP positions. None of the protocol's own wallets are shown, and the page never states what the IDIA token actually is.

## What gets added

### 1. Protocol Holdings panel
A new section listing every protocol wallet/contract that holds funds, each with its live on-chain balances (ETH, IDIA, USDC) and a combined USD value, plus a total across all of them.

Wallets shown (Base Mainnet, taken from the settlement engine and the protocol config):

- Global War Chest (governance Safe) — 0x0910…5d59
- Relayer / settlement wallet — 0xd816…31a7
- System Cash Register — 0x6494…f0e3
- Ecosystem Escrow — 0xd052…e708
- Team Escrow — 0xF0E6…1074
- Liquidity Escrow — 0xdC93…E8A1
- Investor Escrow — 0xDc93…ADe9
- Public Sale Escrow — 0xAE51…014c
- Timelock — 0xd3Fd…1BC5

Each row: label, shortened address with an icon-only copy button, ETH / IDIA / USDC amounts, USD value, and a BaseScan link. A header tile shows the grand total in USD. Mobile-first: rows stack compactly on small screens, table on desktop.

USD value uses the live IDIA/USDC pool price already fetched on this page; USDC is 1:1. Any address that cannot be read shows "—" rather than 0, so real zero balances stay distinguishable.

### 2. On-Chain Contract Information panel
Replaces the bare address list with real token facts read on-chain:

- IDIA token: name, symbol, decimals, total supply, current pool price in USD, implied market value, contract address + BaseScan token link
- USDC reference address
- Protocol contracts with no balance role — Governor, Registry, Pool Factory, Liability Receipt (Liability Shield), Pool Deployer Module — each with address, copy, and BaseScan link
- Network badge: Base Mainnet (Chain ID 8453)

## Technical notes

- New read-only hook `src/hooks/useProtocolHoldings.ts`: a viem `createPublicClient` pointed at the existing `base-rpc-proxy` edge function (already allows `eth_call` and `eth_getBalance`), batching `balanceOf` for IDIA and USDC plus native ETH balance for every address above. React Query, 60s refetch, `retry: false`, degrades to `null` per address on failure.
- New hook `useIdiaTokenInfo.ts` reading `name/symbol/decimals/totalSupply` through the same proxy client.
- Addresses come from `src/config/contracts.ts` (`PROTOCOL`); the two addresses currently only hardcoded in the settlement function — System Cash Register `0x649436db4d9352240d1132d9372293e5cc6af0e3` and Pool Deployer Module `0x8AF7C97B56282DF3Af8f9472a9938b0D6b33Bf09` — get added to the config so the frontend and edge function stay in sync. No change to settlement behaviour.
- Price derivation reuses the existing `sqrtPriceX96` math already in `LiquidityPools`/`IndividualDashboard`; it is lifted into a small shared helper so both use one implementation.
- Every fetch/mapping step brackets `[PHASE_START]`/`[PHASE_END]` logs; every catch logs message and stack.
- Presentation only — no database, pricing, or settlement logic changes.
