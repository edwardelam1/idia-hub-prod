

# Plan: Correct Hub to "Synapse Credits" Architecture (Undo IDIA-USD Rebrand)

The previous implementation incorrectly rebranded Hub UI elements to "IDIA-USD". The Hub is a B2B product and must use **"Synapse Credits"** exclusively. IDIA-USD is for the Life app (B2C) only.

This plan creates a new append-only `hub_synapse_ledger` table, a `get_hub_balance()` DB function, updates all UI labels, implements the settlement flow, and changes the revenue split to 60/30/10.

---

## Part 1: Database Migration — `hub_synapse_ledger` + Balance Function

Create a new migration:

- **New table `hub_synapse_ledger`** (append-only, NO updates ever):
  - `id` UUID PK
  - `user_id` UUID (references auth.users)
  - `amount_credits` DECIMAL(10,4)
  - `entry_type` TEXT (`TOP_UP`, `CONSUMPTION`, `SETTLEMENT`)
  - `status` TEXT (`PENDING`, `SETTLED`, `FAILED`)
  - `reference_id` UUID nullable (links settlement rows to pending rows)
  - `metadata` JSONB
  - `created_at` TIMESTAMPTZ default now()
  - Index on `(user_id, created_at DESC)`
  - RLS: users can SELECT own rows only

- **Function `get_hub_balance(uid UUID)`**: Returns `SUM(amount_credits)` from `hub_synapse_ledger` WHERE `user_id = uid` AND `status != 'FAILED'`. This is the ONLY way to get balance.

- **RLS policy**: Deny UPDATE/DELETE entirely. Only INSERT via service role.

---

## Part 2: Formatting Utility

### `src/lib/utils.ts`
- Add `formatCredits(amount: number): string` — formats to 4 decimal places (e.g., `1,000.0000 CR`). Keep `formatIdiaUsd` for backward compat but the Hub UI will use `formatCredits`.

---

## Part 3: Context Update — `SynapseCreditsContext.tsx`

- Switch from reading `synapse_credit_ledger` to calling `get_hub_balance` RPC for balance.
- Update Realtime subscription to listen on `hub_synapse_ledger` INSERT events.
- Toast messages use "Synapse Credits" terminology (e.g., "Ledger Updated: +1,000.0000 CR").
- Expose `currency: 'SYNAPSE_CREDITS'`.

---

## Part 4: UI Rebrand — Replace ALL "IDIA-USD" with "Synapse Credits"

### `SynapseGasGauge.tsx`
- Header: "IDIA-USD Balance" → "Synapse Credit Balance"
- Loading text: "Querying IDIA-USD Ledger..." → "Querying Synapse Ledger..."
- Subtitle: "Backed 1:1 by USDC · Powered by Circle" → "Held in FBO custody at Airwallex"
- Use `formatCredits()` instead of `formatIdiaUsd()`
- Burn rate label: "IDIA-USD / day" → "CR / day"

### `SettingsBilling.tsx`
- Card title: "IDIA-USD Credit Ledger" → "Synapse Credit Ledger"
- Description: replace Circle/USDC references with "Secure FBO account at Airwallex"
- All balance labels: "IDIA-USD" → "Synapse Credits" / "CR"
- Remove "Withdraw to Crypto" button (that's a Life app feature, not Hub)
- Remove `WithdrawCryptoModal` import/usage from this file

### `SynapsePurchaseModal.tsx`
- Title: "Purchase IDIA-USD Credits" → "Purchase Synapse Credits"
- All "IDIA-USD" labels → "Synapse Credits" / "CR"
- Rate labels: "$ / IDIA-USD" → "$ / CR"
- Success toast: "IDIA-USD added" → "Synapse Credits added"
- Footer: Add "Funds held in secure FBO account at Airwallex"
- Use `formatCredits()` throughout

### `SynapseTopUp.tsx`
- Title: "Fund IDIA-USD Wallet" → "Fund Synapse Credits"
- Description: replace Circle/USDC text with Airwallex FBO text
- All "IDIA-USD" → "CR" / "Synapse Credits"
- Use `formatCredits()` throughout

### `BestFriendPage.tsx`
- Badge: "1 CRD deducted" → "1 CR deducted"
- Error messages: "1 CRD required" → "1 Synapse Credit required"

### `WithdrawCryptoModal.tsx`
- Keep the component (it's for Circle/USDC off-ramp, used from Life app context), but remove it from `SettingsBilling.tsx` Hub context.

---

## Part 5: Edge Function — `execute-hub-query`

Create new edge function `supabase/functions/execute-hub-query/index.ts`:

- Accepts `{ user_id, query_cost_credits, query_type, bundle_id }`.
- **Step 1**: INSERT a `CONSUMPTION` row with `amount_credits: -query_cost_credits`, `status: 'PENDING'`. Returns the row ID.
- **Step 2**: Simulate Synapse Engine confirmation. INSERT a `SETTLEMENT` row with `amount_credits: 0`, `status: 'SETTLED'`, `reference_id` pointing to the PENDING row.
- **Metadata logging (60/30/10 War Chest)**: The SETTLEMENT row's metadata records:
  - `corporate_revenue`: 60% of credits consumed (recognized revenue)
  - `user_liquidity_pool`: 30% (to be distributed as IDIA-USD in Life app)
  - `ecosystem_war_chest`: 10% (escrowed for Phase 2)
  - `fbo_routing`: "JPM FBO" reference

### Update `process-data-sale/index.ts`
- Change the split from 60/30/5/5 to **60/30/10**:
  - 60% IDIA Corporate Revenue
  - 30% User Liquidity Pool
  - 10% Ecosystem War Chest
- Remove the `BURN` and `COMMUNITY_POOL` constants.

---

## Part 6: Update `top-up-credits` Edge Function

- Update to write to `hub_synapse_ledger` instead of (or in addition to) `synapse_credit_ledger` for Hub top-ups.
- Entry type: `TOP_UP`, status: `SETTLED`.

---

## Files Modified

1. **New migration** — `hub_synapse_ledger` table + `get_hub_balance` function
2. `src/lib/utils.ts` — add `formatCredits()`
3. `src/contexts/SynapseCreditsContext.tsx` — switch to `hub_synapse_ledger` + RPC balance
4. `src/components/billing/SynapseGasGauge.tsx` — "Synapse Credits" + Airwallex
5. `src/components/settings/SettingsBilling.tsx` — "Synapse Credits", remove Withdraw
6. `src/components/billing/SynapsePurchaseModal.tsx` — "Synapse Credits" labels
7. `src/components/billing/SynapseTopUp.tsx` — "Synapse Credits" labels
8. `src/pages/BestFriendPage.tsx` — "CR" badge labels
9. **New**: `supabase/functions/execute-hub-query/index.ts` — settlement flow + 60/30/10 split
10. `supabase/functions/process-data-sale/index.ts` — 60/30/10 split
11. `supabase/functions/top-up-credits/index.ts` — write to `hub_synapse_ledger`

