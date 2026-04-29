## Root Cause

The USDC Rail 3 column in the shared database is stale because **nothing writes to it from the chain**.

1. **No Alchemy webhook receiver exists.** Alchemy's Address Activity webhook at `base-mainnet.g.alchemy.com` has no destination Edge Function in this project — every USDC `Transfer` event is silently dropped.
2. **No `BASE_RPC_URL` or Alchemy secret** is configured (secrets list returned only `LOVABLE_API_KEY`). Even the polling fallback inside `top-up-credits` falls back to the public RPC and only fires during a top-up, never for inbound transfers.
3. **Schema/scale mismatch.** `wallets.idia_beta_balance` is `bigint`, but `top-up-credits` writes whole-USDC numbers (e.g. `100`) and `idia-circular-settlement` writes to a non-existent `wallets.stablecoin_balance` column — that update silently no-ops. Live row example: `idia_beta_balance = 3` for a wallet that holds millions of micro-USDC.
4. **Hub UI hides the bug** because `useWalletBalance.ts` reads on-chain directly via viem. IDIA Life reads from the DB column → shows stale data. Same DB, two different sources of truth.

## Goal

Make the **database the single source of truth** for USDC, fed by:
- A signed Alchemy webhook (push, real-time)
- A scheduled reconciliation cron that polls Base RPC (pull, safety net)
- Consistent integer **micro-USDC** scale across all writers

---

## Plan

### 1. Database migration — fix scale + add tracking

Add to `public.wallets`:
- Keep `idia_beta_balance bigint` as the **canonical micro-USDC balance** (1 USDC = 1_000_000 units). Backfill existing rows by multiplying current values by 1_000_000 only where they look like whole-USDC entries (gated; will confirm before backfill).
- `usdc_last_synced_at timestamptz`
- `usdc_last_block bigint`

New table `public.usdc_onchain_events` (idempotency + audit):
- `id uuid pk`, `tx_hash text`, `log_index int`, `from_address text`, `to_address text`, `amount_micro bigint`, `block_number bigint`, `direction text` (`in`/`out`), `wallet_user_id uuid`, `received_at timestamptz default now()`
- Unique constraint on `(tx_hash, log_index)` — Alchemy retries will hit it and no-op.
- RLS: service-role-only writes; users read their own via `wallet_user_id`.

### 2. New Edge Function: `alchemy-usdc-webhook`

- Public (no JWT) — Alchemy can't sign Supabase JWTs.
- Verifies `X-Alchemy-Signature` HMAC-SHA256 against `ALCHEMY_WEBHOOK_SIGNING_KEY` secret. Reject 401 if invalid.
- Parses Address Activity payload, filters for USDC contract `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` on Base.
- For each transfer:
  - Look up `wallets.user_id` by matching `to_address` or `from_address` (lowercased).
  - Insert into `usdc_onchain_events` (ON CONFLICT DO NOTHING).
  - Atomically `UPDATE wallets SET idia_beta_balance = idia_beta_balance ± amount_micro, usdc_last_synced_at = now()` via a SECURITY DEFINER RPC `apply_usdc_delta(user_id, micro_delta, tx_hash)`.
- Returns 200 fast (under Alchemy's 5s timeout) — heavy work is just one insert + one RPC.

### 3. New Edge Function: `usdc-reconcile` (polling fallback)

- Runs every 5 minutes via `pg_cron` + `pg_net`.
- Loads all `wallets` with a real `0x…` `wallet_address`.
- Calls Base RPC (`BASE_RPC_URL` if set, else Alchemy URL) `eth_call` → USDC `balanceOf` for each (batched JSON-RPC, max 50 per request).
- If on-chain balance ≠ `idia_beta_balance`, writes the delta and stamps `usdc_last_synced_at`. Logs a `RECONCILE_DRIFT` event so we can see when the webhook missed something.

### 4. Fix the existing writers

- **`top-up-credits/index.ts`**: when routing is `on-chain`, the on-chain `transfer()` already mints the truth on-chain — remove the manual `wallets.idia_beta_balance += credit_amount` write entirely. The webhook + reconciler will pick it up. (Avoids double-counting now that the chain is authoritative.) Fiat routing keeps writing to `corporate_revenue` as today.
- **`idia-circular-settlement/index.ts`**: the `stablecoin_balance` reads/writes target a non-existent column. Either rename to `idia_beta_balance` (and convert to micro-units) or remove that DB write and emit an on-chain transfer instead. Will rename + scale, since settlement yields are currently fiat-denominated.
- **`useWalletBalance.ts` (Hub)**: switch to reading `wallets.idia_beta_balance` (÷ 1_000_000) instead of calling viem directly, so Hub and Life share the exact same number. Keep a 30s refresh.
- **`SynapseCreditsContext.tsx`**: divide `idia_beta_balance` by 1_000_000 when mapping into `stablecoin_balance` for the UI.

### 5. Secrets the user must add

- `ALCHEMY_WEBHOOK_SIGNING_KEY` — from the Alchemy dashboard → Webhooks → Signing Key.
- `BASE_RPC_URL` (already mentioned but **not present** in fetched secrets) — set to `https://base-mainnet.g.alchemy.com/v2/jKAs5SHfEFihKOngFIL2N`.

I will request these via `add_secret` before deploying. Without them the webhook + reconciler will refuse to boot.

### 6. Alchemy dashboard step (user action)

After deploy I'll give the user the webhook URL:
`https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/alchemy-usdc-webhook`

They paste it into Alchemy → Notify → Address Activity, select Base Mainnet, and add the USDC contract `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` plus all user wallet addresses (or use a wallet-tracking webhook so new wallets auto-register).

---

## Flow after the fix

```text
Alchemy detects USDC Transfer on Base
        │
        ▼
POST → alchemy-usdc-webhook  (HMAC verified)
        │
        ├─► usdc_onchain_events (idempotent insert)
        └─► apply_usdc_delta() RPC → wallets.idia_beta_balance
                                   │
                                   ├─► Hub UI (useWalletBalance reads DB)
                                   └─► IDIA Life (reads same DB) ✅ now in sync

Every 5 min:
  pg_cron → usdc-reconcile → Base RPC balanceOf → corrects any drift
```

## Files to touch

- New: `supabase/functions/alchemy-usdc-webhook/index.ts`
- New: `supabase/functions/usdc-reconcile/index.ts`
- New migration: scale fix + `usdc_onchain_events` + `apply_usdc_delta` RPC + cron schedule
- Edit: `supabase/functions/top-up-credits/index.ts` (remove manual on-chain DB write)
- Edit: `supabase/functions/idia-circular-settlement/index.ts` (column + scale fix)
- Edit: `src/hooks/useWalletBalance.ts` (read from DB, not chain)
- Edit: `src/contexts/SynapseCreditsContext.tsx` (apply 1e6 divisor)

## Open question before I start the backfill

The current `idia_beta_balance` column holds inconsistent values (e.g. `3`, `2000000`, `0`). Before multiplying anything by 1_000_000 I'll dump the rows so you can confirm which are already in micro-units vs whole-USDC. The migration will be split: structural changes first, balance backfill second after your sanity check.
