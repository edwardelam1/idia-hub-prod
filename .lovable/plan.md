

## Plan: Reverse `fiat_amount` change & split FBO into sibling tag

### Context
- `synapse_credit_ledger` table uses column `amount` (NOT `fiat_amount`) — confirmed by `get_synapse_balance` RPC: `SELECT COALESCE(SUM(amount), 0) FROM public.synapse_credit_ledger`.
- The previous "fix" was wrong; revert to `amount`.
- FBO Reservoir balance lives in a separate `fiat_balance` table — should be its own gauge tag, not embedded inside `SynapseGasGauge`.

### Changes

**1. Revert ledger column name** (`amount`, not `fiat_amount`)
- `src/contexts/SynapseCreditsContext.tsx` — change `.select("fiat_amount")` → `.select("amount")` and `Number(d.fiat_amount)` → `Number(d.amount)`.
- `src/hooks/useBillingData.tsx` — same revert in the `user-usage-ledger` query.

**2. Extend `SynapseCreditsContext`** to expose FBO balance
- Add `fbo_balance: number` to context return.
- After fetching ledger balance, query `fiat_balance` table: `SELECT balance FROM fiat_balance WHERE user_id = uid` (need to verify exact column names — will use `supabase--read_query` once approved to confirm schema).
- Expose via `balanceData.fbo_balance` (or new `fboBalance` field).

**3. Create new `FBOReservoirGauge.tsx` sibling component**
- New file: `src/components/billing/FBOReservoirGauge.tsx`.
- Mirrors `SynapseGasGauge` styling/scale (compact tag, `text-lg` value, `p-3` padding).
- Reads `fboBalance` from `useSynapseCredits()`.
- Displays `$X,XXX.XX` with Wallet icon + "FBO Reservoir" label + "Airwallex FBO Settlement" subtitle.

**4. Strip FBO block from `SynapseGasGauge.tsx`**
- Remove the FBO Reservoir section + `Separator` + Wallet import.
- Keep only Synapse Gas (credit ledger) display.

**5. Add new FBO tag to dashboard stat row**
- `src/components/dashboards/IndividualDashboard.tsx` — add `<FBOReservoirGauge />` as a sibling card next to `<SynapseGasGauge />` in the existing 4-column stat grid (may need to adjust grid to accommodate 5 cards, or replace one of the existing tags).

### Files Modified
- `src/contexts/SynapseCreditsContext.tsx` — revert column + add FBO fetch
- `src/hooks/useBillingData.tsx` — revert column
- `src/components/billing/SynapseGasGauge.tsx` — remove embedded FBO block
- `src/components/billing/FBOReservoirGauge.tsx` — NEW sibling component
- `src/components/dashboards/IndividualDashboard.tsx` — add FBO gauge to stat row

### Outcome
- Build error from incorrect `fiat_amount` column reverted.
- FBO Reservoir becomes its own visible "tag" alongside Synapse Gas, sourced from `fiat_balance` table.
- Both gauges visually consistent and live in the TopBar-style stat row.

