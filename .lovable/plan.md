# Fix Pool Inspector v4 visibility

## What changes
- Read the live Uniswap v4 pool data already used by the wallet-position view.
- Show v4 pools first in Pool Inspector, with version, fee, pair, liquidity, reserves, price state, and Uniswap link.
- Keep any discovered v3 pools in a separate section and add clear loading, empty, and error states.
- Keep the popup compact and usable on mobile.

## Technical details
- Reuse the cached `useV4Positions` query so opening the inspector does not create a separate data source.
- Preserve the existing v3 subgraph query for legacy pools.
- Verify the preview build and the popup rendering.
