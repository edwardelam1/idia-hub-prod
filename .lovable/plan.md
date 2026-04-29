## Compliance Blast Wall — `idia-circular-settlement`

Enforce strict Like-for-Like routing to avoid MTL exposure. No fiat↔crypto conversion. Hard stop on missing/invalid `routing`.

### File: `supabase/functions/idia-circular-settlement/index.ts`

**1. New stage `ROUTING_GATEKEEPER`** — runs immediately after JSON parse, before anything else.

```ts
currentStep = "ROUTING_GATEKEEPER";
console.info(`[BEGIN: ${currentStep}]`);
const routing = payoutData?.routing;
if (routing !== "fiat" && routing !== "on-chain") {
  console.error(`[FATAL STALL: ROUTING] Hard stop enforced. Explicit routing parameter missing or invalid.`);
  throw new Error(`ROUTING_HARD_STOP: 'routing' must be exactly "fiat" or "on-chain". Received: ${routing ?? "undefined"}`);
}
console.info(`[END: ${currentStep}] routing=${routing}`);
```

Strict equality only — no lowercasing, no trim, no defaults. `"FIAT"`, `" fiat "`, `"On-Chain"`, `undefined`, `null`, `""` all fail.

**2. Shared logic (runs on BOTH routes, unchanged)**
- `VALIDATING_INPUTS` (`total_fiat_amount`, `contributing_users`, `buyer_id`, `payment_reference`)
- 60/30/10 math (Corporate / Yield / War Chest) — untouched
- All `synapse_credit_ledger` inserts: Corporate Revenue (60%), War Chest (10%), per-contributor Yield (30%)

**3. On-chain execution gated behind `routing === "on-chain"`**

These stages only run for `"on-chain"`:
- `CONFIGURING_BLOCKCHAIN` (viem client + account)
- `FETCHING_MASTER_NONCE`
- `BROADCASTING_INGESTION` (Treasury → Cash Register USDC)
- Per-contributor `client.writeContract` USDC transfer inside `DISSEMINATING_YIELD`

For `"fiat"`:
- Skip all viem code entirely
- Ledger rows still written; `blockchain_tx_hash` set to `payment_reference` (or null)
- Log: `[STATUS] Fiat routing explicitly detected. Ledger updated. Bypassing on-chain execution.`

**4. Logging protocol preserved**
Every block keeps `[BEGIN: STAGE] ... [END: STAGE]`. `currentStep` continues to populate `failed_at` in 400 responses.

**5. Response shape**
- On-chain: `{ success: true, routing: "on-chain", ingestionHash, payouts }`
- Fiat: `{ success: true, routing: "fiat", ledger_only: true, contributors_credited: N }`

### Redeploy
After edits, redeploy `idia-circular-settlement` so the gatekeeper replaces the current revision.

### Out of scope
- viem logic itself (only gated, not modified)
- `top-up-credits`, `synapse-controller`, `src/lib/api.ts`
- DB migrations / frontend changes (callers missing `routing` will surface in logs immediately and be fixed in a follow-up)

### Files touched
- `supabase/functions/idia-circular-settlement/index.ts` — add gatekeeper, branch on-chain stages, fiat status log, routed response.
- Redeploy: `idia-circular-settlement`.
