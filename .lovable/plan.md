## Part 1 — Fix the build errors (small, surgical)

**`src/taxonomy/index.ts`** — re-export everything the consumers actually import. Replace the file with explicit named exports (no wildcard):

- Values: `getIndustriesBySector`, `getIndustryById`, `getNanoBitesFor`, `getNanoBitesForSubModule`, `getProductionMethodSpec`, `getSubModuleCoverage`, `recommendArchetype`, `recommendedProductionFor`, `serializeClassification`, `EMPTY_CLASSIFICATION`, `breakEven`, `initializeTaxonomy`, plus the existing data exports (`SECTORS`, `ALL_INDUSTRIES`, `ALL_NANO_BITES`, `REVENUE_ARCHETYPES`, `NAICS_CODES`, `GICS_CODES`, `PRODUCTION_METHODS`).
- Types: `NanoBite`, `IndustryNode`, `ArchetypeSpec`, `ProductionMethod`, `Classification`, `BreakEvenInput`, `BreakEvenResult`, `PositioningArchetype`, `ValueChainStage`, `SectorId`, `Cadence`, `NetworkModel`, `RevenueArchetype`, `TaxonomyNode`, `PositioningSpec`.

This resolves the TS2305 "no exported member" errors. The TS2345 mismatches in `PayAppBlueprint.tsx` and `useBusinessTaxonomy.ts` are downstream of the missing `getNanoBitesFor` re-export and disappear once the import resolves to the real `(filter: NanoBiteFilter)` signature.

**`src/pages/Index.tsx`** — verify and fix any default-import vs named-export mismatches (e.g. `SystemHealthDashboard`, `TradingDeskDashboard`). Change to named imports if needed.

No DB or runtime changes in Part 1.

---

## Part 2 — Live Liquidity Pools page

### Scope (per ground truth)
- Network: **Base mainnet** (chain 8453)
- Token: **IDIA** at `0x6526f939d257e67896821c25b6c24daa404a01fb`
- Quote: **USDC** on Base (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- DEX: **Uniswap v3** (the explore link confirms v3 pool)
- User wallet source: `public.profiles.wallet_address` (confirmed column exists). If null → show "Provision your wallet in the IDIA Life app" gate (re-use existing `useAccountGate`-style empty state).
- Org wallet: the IDIA Safe (multi-sig) — address stored as a new secret `IDIA_SAFE_ADDRESS_BASE` so it's editable without code changes.

### Architecture

```text
LiquidityPools.tsx
  └─ useUniswapPoolStats()   ── Uniswap v3 subgraph on Base (TVL, vol24h, fee, APY, 30d chart)
  └─ useWalletLpPositions()  ── viem (Base public RPC) → NonfungiblePositionManager
        ├─ org position  (Safe address from edge fn)
        └─ user position (profiles.wallet_address)
  └─ useUncollectedFees()    ── viem static-call collect() for fee preview
```

### Data layer

1. **Subgraph hook (`src/hooks/useUniswapPoolStats.ts`)**
   - Fetch from Uniswap v3 Base subgraph (`https://gateway.thegraph.com/api/...` — gated by `THEGRAPH_API_KEY` secret) via a thin edge function `uniswap-pool-stats` to keep the key server-side.
   - Returns all IDIA/USDC pools (3 fee tiers if they exist), with `totalValueLockedUSD`, `volumeUSD` (24h + 30d series via `poolDayDatas`), `feeTier`, current price, and derived APY = `feeTier * volume30dAvg / TVL`.
   - 60-second client cache via React Query.

2. **On-chain hook (`src/hooks/useWalletLpPositions.ts`)**
   - viem `createPublicClient({ chain: base, transport: http(VITE_BASE_RPC_URL) })` — RPC URL is a public-safe env var; default to `https://mainnet.base.org` with optional override secret.
   - For a given address: call `NonfungiblePositionManager.balanceOf(addr)` → `tokenOfOwnerByIndex` → `positions(tokenId)`; filter to positions whose `token0/token1` match the IDIA/USDC pool.
   - Derive position USD value from `liquidity` + current `sqrtPriceX96` (helper in `src/lib/uniswap-math.ts`).
   - Run twice in parallel: once for `profiles.wallet_address`, once for the Safe address (from new edge fn `get-org-safe-address`).

3. **Uncollected fees**
   - Static eth_call to `collect()` on each NFT positionId with `MAX_UINT128` amounts; convert to USD using current prices.
   - Displayed as info only ("Uncollected fees" replaces "Pending Rewards" panel header is hidden per Q4 answer — actually: hide the rewards panel entirely; surface uncollected fees inline under each position row).

### UI changes to `src/components/liquidity/LiquidityPools.tsx`

- Delete `useLiquidityData` and the entire mock dataset file (or keep file but stub-export types only).
- Page header: "Liquidity Pools" + subtitle "IDIA / USDC on Base via Uniswap v3".
- Top stat tiles become: **Pool TVL**, **24h Volume**, **Your Position (USD)**, **Org Position (USD)**. The "APY Range" tile becomes "Fee APY (30d avg)".
- "Pool Performance" chart: real `poolDayDatas` (TVL + volume, last 30d).
- **Manage Liquidity card** → becomes "Manage on Uniswap":
  - Replaces in-app form. Two buttons: "Add Liquidity" and "Remove Liquidity" → deep-links to `https://app.uniswap.org/add/USDC/0x6526...fb/<feeTier>?chain=base` and `https://app.uniswap.org/pool` respectively.
  - Below: live read-only stats (current price, your LP %, your fee accrual).
- **Quick Actions** card:
  - "View Pool on Uniswap" → deep link.
  - "View on BaseScan" → `https://basescan.org/address/<poolAddress>`.
  - "My Positions" dialog → real positions from viem, with per-position liquidity, range, and uncollected fees.
  - Remove "Claim Rewards" button.
- **Top Pools** strip → becomes "IDIA/USDC Fee Tiers" (0.05% / 0.3% / 1% — whichever exist on chain). Clicking selects the active tier for the Performance chart.
- **Settings dialog (the broken "Manage" button)** → repurpose as **Pool Inspector**: lists every IDIA/USDC pool on Base with contract address, fee tier, TVL, 24h vol, both wallet positions, and an "Open in Uniswap" / "Open in BaseScan" link per row. The previous broken inner UI is removed.
- Wallet-gate state: if `profiles.wallet_address` is null, replace "Your Position" tile + My Positions dialog body with a `NoWalletState` component pointing the user to IDIA Life.

### Backend additions

1. **Edge fn `uniswap-pool-stats`** (`supabase/functions/uniswap-pool-stats/index.ts`)
   - Accepts `{ fee?: 500 | 3000 | 10000 }`. Returns aggregated stats + 30d series. Uses `THEGRAPH_API_KEY`.
2. **Edge fn `get-org-safe-address`**
   - Returns `{ address: <IDIA_SAFE_ADDRESS_BASE> }`. Trivial wrapper so the address can be rotated without redeploy.
3. **Secrets to add** (will request via `add_secret` once you approve):
   - `THEGRAPH_API_KEY` (server-only)
   - `IDIA_SAFE_ADDRESS_BASE` (server-only; surfaced via edge fn)
4. **Public env**: `VITE_BASE_RPC_URL` defaults to `https://mainnet.base.org`; optional override later.

### Dependencies
- `viem` (lightweight, tree-shakable, already common in Lovable projects)
- `@tanstack/react-query` (verify; add if missing — needed for caching subgraph calls)

### Out of scope (explicitly)
- No in-app tx signing, no wagmi, no wallet-connect modal.
- No staking-rewards integration.
- No write actions on the Safe.

### Files touched
- New: `src/hooks/useUniswapPoolStats.ts`, `src/hooks/useWalletLpPositions.ts`, `src/lib/uniswap-math.ts`, `src/lib/uniswap-abi.ts`, `src/components/liquidity/NoWalletState.tsx`, `supabase/functions/uniswap-pool-stats/index.ts`, `supabase/functions/get-org-safe-address/index.ts`.
- Rewritten: `src/components/liquidity/LiquidityPools.tsx`.
- Deleted/emptied: `src/hooks/useLiquidityData.tsx`.
- Touched for build fixes: `src/taxonomy/index.ts`, `src/pages/Index.tsx`.

### Verification
- Build passes (no TS errors).
- Page loads with real TVL / 24h vol matching the Uniswap explore link.
- With a profile that has `wallet_address` set, "Your Position" shows live values; without, the wallet-gate state renders.
- "Manage on Uniswap" buttons open the correct Base/IDIA/USDC pool URL.
