## Diagnosis — no, no other contributors were paid

I traced your last query (`SYN-5923023A`, 2026-07-10 20:37:40 UTC):

- **egress_logs** carried 37 `aca_record_references` — but every one is the **same hash** (`2964510b…5dbb4`).
- That hash resolves in `user_aca_records` to a single `platform_guid`: **you** (`217c6224-…-267536`).
- **settlement_queue** shows the payload had `contributing_users: [1]` and `total_fiat_amount: 0.75`.
- `idia-circular-settlement` therefore ran Phase 1 (60% corporate), Phase 2 (regional war chest), and Phase 3 with a **single contributor payout that went back to you** (~$0.22 after the corporate/regional splits).

So there was no missed payout — the system faithfully paid the only contributor it was told about. The bug is upstream: **the receipt never fanned out to the real owners of the 37 sampled rows.**

## Root cause

In `supabase/functions/best-friend-ai/index.ts` around line 1000, the receipt is built from the rows the AI actually saw:

```ts
const healthIds = healthMetrics.map((r) => r.aca_hash_key || r.id).filter(Boolean);
```

Two problems compound:

1. `healthMetrics` / `lifestyleEvents` for Best-Friend-AI are pulled scoped to the caller's own `pseudo_user_id`, so every row's `aca_hash_key` belongs to the caller. In `MARKETPLACE_RESEARCH` mode this should be a **cross-user** sample.
2. Even when rows do span owners, they often carry the same `aca_hash_key` per user (one record per user, repeated), which then collapses in `resolveContributors` via `Array.from(new Set(...))`.

Net effect: the marketplace pipeline can never pay more than one contributor per query.

## Plan

1. **Marketplace fetchers must span owners.** In `best-friend-ai/index.ts`, when `isDataScientistMode` (MARKETPLACE_RESEARCH), fetch `staged_health_data` / `staged_lifestyle_data` **without the `pseudo_user_id` filter** (respecting bundle scope only), and select `pseudo_user_id, aca_hash_key` explicitly for every row.
2. **Build a per-owner receipt.** Before firing the synapse-controller POST, group the sampled rows by `pseudo_user_id` and emit one representative `aca_hash_key` per unique owner (preserve repeats only where they represent distinct records — the goal is one entry per contributor so `resolveContributors` returns the true set).
3. **Guard the store-clerk path.** `BEST_FRIEND_AI_CHAT` should keep behaving as today (self-only), so keep that branch scoped to `operatorId` and don't fan out payouts on personal chats.
4. **Verification.** After deploy, run a marketplace query and confirm:
   - `egress_logs.aca_record_references` contains ≥2 distinct hashes,
   - `settlement_queue.payload->'contributing_users'` length > 1,
   - `idia-circular-settlement` logs `payouts=N` where N matches the unique-owner count,
   - each contributor sees a `data_sale_payout` row in `synapse_credit_ledger`.
5. **No schema changes.** Everything is edge-function-side; existing tables, RLS, and grants stay as-is.

## Out of scope

- The empty `/egress-logs` view for other accounts (all 203 rows belong to `217c6224-…`). That's expected under the current RLS (`user_id = auth.uid()`) — no other user has ever run an egress. Flag if you'd like a follow-up.
- Retro-paying the past `SYN-*` settlements — those already closed on-chain.
