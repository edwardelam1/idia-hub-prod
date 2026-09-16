# Liquidity Workspace Redesign

## Result
Reorganize the Liquidity page into a compact amethyst tabbed workspace using JetBrains Mono for headings and values and Work Sans for supporting text.

## Changes
- Replace the passive summary pills with four active view buttons: **Pool TVL**, **Protocol Holdings** (renamed from Org Position), **Your Position**, and **Contract Info**.
- Keep one focused content slice visible at a time instead of stacking every liquidity section.
- Put the token contract information in **Pool TVL**, and make **Protocol Holdings** its own dedicated slice.
- Put both Uniswap position versions in **Your Position**, with v4 first and a fully redesigned v3 section directly below it using the same row structure, badges, values, and external-position treatment as v4.
- Move **Add Liquidity**, **Remove Liquidity**, and **Pool Inspector** into a static horizontal Quick Actions bar directly below the page heading.
- Keep Uniswap and BaseScan destinations available in the same Quick Actions bar.
- Remove the fee-tier frame and all of its visible contents entirely.
- Preserve live on-chain reads, wallet states, pool metrics, dialogs, links, and loading/error states.

## Responsive Behavior
- Keep the Quick Actions bar horizontally scrollable on narrow screens so every action remains one tap away.
- Render the four view buttons as a compact 2×2 grid on mobile and a single row on larger screens.
- Keep position rows dense and readable without wide-table overflow.

## Validation
- Confirm the app builds cleanly.
- Verify the default and each selectable slice render without overlap at desktop and mobile widths where public preview access permits.
