# Route credit purchases to the relayer wallet

## Problem

When someone buys Synapse Credits, their USDC lands in the Safe
(`0x0910EF34C9F59A90d90FF505B1036DEed4a25d59`) instead of the relayer wallet
(`0xd816D83703764551A7F292dbC435669AA89631a7`).

The payment code picks its destination like this:

1. the stored setting `IDIA_SAFE_ADDRESS_BASE` (the Safe address), then
2. `IDIA_TREASURY_ADDRESS`, then
3. the built-in relayer/treasury address as a last resort.

Because the Safe setting exists, it wins every time — so every purchase is
pulled into the Safe.

## Fix

Stop using the Safe setting for purchases. The destination for a credit
purchase becomes the relayer wallet, always:

- Use the built-in protocol treasury/relayer address
  (`0xd816D83703764551A7F292dbC435669AA89631a7`) as the payment destination.
- Allow an override only through a dedicated `IDIA_SETTLEMENT_RECEIVER`
  setting, and reject it outright if it equals the Safe address.
- Log the resolved destination and its source on every charge so a future
  misroute is obvious in the logs.

Nothing else changes: the wallet authorization flow, pricing, credit ledger
and receipts stay exactly as they are. Payments already sent to the Safe are
not moved by this change — those are a manual treasury transfer if you want
them relocated.

## Technical details

- `supabase/functions/_shared/charge-usdc.ts` → `getTreasury()`:
  drop the `IDIA_SAFE_ADDRESS_BASE` / `IDIA_TREASURY_ADDRESS` lookups, read
  optional `IDIA_SETTLEMENT_RECEIVER`, default to `PROTOCOL.treasury`, throw
  `TREASURY_MISCONFIGURED` when the resolved value is invalid or equals
  `PROTOCOL.safe`. Rename to `getSettlementReceiver()` and update both call
  sites (`chargeBuyerUsdc`, `dispatchBuyerUsdcCharge`).
- Keep `[BEGIN]`/`[END]` phase logging; add
  `receiver=<addr> source=<protocol|env>` to the existing charge log lines.
- Redeploy `top-up-credits` (it bundles the shared charge module).
- `get-org-safe-address` and `process-delt-transfer` keep using the Safe —
  they are governance/war-chest paths, not purchase settlement.
