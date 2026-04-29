## Compliance Routing — End-to-End Wire for Best Friend AI

The Cashier already enforces `routing ∈ {"fiat","on-chain"}`. The fatal stall is happening because the Best Friend → Synapse Controller → Cashier chain never carries that field. We also have a duplicated `CASHIER_HANDOFF` block in `synapse-controller` that double-declares `const { routing } = body` (will not compile cleanly and double-fires the cashier).

### The chain we're fixing

```text
BestFriendPage.tsx ──(routing)──▶ best-friend-ai
                                       │
                                       ▼
                              synapse-controller ──(routing)──▶ idia-circular-settlement
```

Every hop must carry `routing` exactly as `"fiat"` or `"on-chain"` (no defaults, no coercion — same contract as the Blast Wall).

---

### 1. Persist the user's compliance rail (source of truth)

Add a `compliance_rail` field on `profiles` so the rail used to fund credits is the rail used to burn them. Set/refresh whenever a top-up succeeds.

- **Migration**: add column `profiles.compliance_rail text` (nullable, no default — null forces UI to ask).
- **`top-up-credits`** (and `SynapseTopUp` success path): on successful top-up, write `"on-chain"` if `paymentRail === "usdc"`, else `"fiat"`.
- No backfill — existing users without a rail get prompted on first Marketplace Mode query.

### 2. Frontend — `src/pages/BestFriendPage.tsx`

- On mount, fetch `profiles.compliance_rail` for the active user; hold in component state as `complianceRail`.
- In `handleSendMessage`, when `marketplaceMode === true`:
  - If `complianceRail` is null/missing → show a small inline modal/toast: "Choose your settlement rail (Fiat / USDC)" with two buttons; on choose, persist to `profiles.compliance_rail` and continue.
  - Pass `routing: complianceRail` inside the `body` of the `supabase.functions.invoke("best-friend-ai", ...)` call.
- Add a tiny pill near the Marketplace Mode toggle showing the active rail (`FIAT` or `ON-CHAIN`) with a click-to-change action that updates `profiles.compliance_rail`.

### 3. Edge — `supabase/functions/best-friend-ai/index.ts`

In the existing `BestFriendAI.ReceiptTransmission` block (around line 497) when POSTing to `synapse-controller`:

- Extract `const routing = body?.routing` from the inbound request payload.
- Hard-stop early if `marketplaceMode && routing !== "fiat" && routing !== "on-chain"` — return a 400 with `error: "ROUTING_HARD_STOP"` so the UI can prompt the user. No defaults.
- Add `routing` into the JSON body sent to `synapse-controller`.

### 4. Edge — `supabase/functions/synapse-controller/index.ts` (cleanup + propagate)

Two issues to fix in one pass:

1. **Duplicated CASHIER_HANDOFF**: lines ~115–169 contain the same block twice, and `const { routing } = body` is declared twice in the same scope. Delete the second copy entirely. Keep one clean handoff.
2. **Gatekeeper parity**: at the top of the handler, after parsing `body`, validate:
   ```ts
   const { routing } = body;
   if (routing !== "fiat" && routing !== "on-chain") {
     throw new Error(`ROUTING_HARD_STOP: 'routing' must be exactly "fiat" or "on-chain". Received: ${routing ?? "undefined"}`);
   }
   ```
   so failures surface here with full context instead of inside the Cashier.
3. Keep the single `adminClient.functions.invoke("idia-circular-settlement", { body: { ..., routing } })` call.

### 5. Cashier — `idia-circular-settlement`

No changes. The Blast Wall stays as-is and will now always receive a valid `routing`.

---

### Logging protocol

All new branches keep the `[BEGIN: STAGE] / [END: STAGE]` convention:
- `[BEGIN: ROUTING_RESOLUTION]` in best-friend-ai when reading `routing` from the payload.
- `[BEGIN: ROUTING_GATEKEEPER]` in synapse-controller mirroring the Cashier.
- `[STATUS] Compliance rail locked: <fiat|on-chain>` on success.

### Files touched

- `supabase/migrations/<new>.sql` — add `profiles.compliance_rail`.
- `src/pages/BestFriendPage.tsx` — fetch/prompt/persist rail, send `routing` in invoke body, pill UI.
- `supabase/functions/best-friend-ai/index.ts` — read `routing` from body, validate, forward to synapse-controller.
- `supabase/functions/synapse-controller/index.ts` — delete duplicated CASHIER_HANDOFF block, add top-of-handler `ROUTING_GATEKEEPER`, ensure single invoke carries `routing`.
- `supabase/functions/top-up-credits/index.ts` (+ `SynapseTopUp.tsx` follow-through) — write `compliance_rail` on successful top-up.
- Redeploy: `best-friend-ai`, `synapse-controller`, `top-up-credits`.

### Out of scope

- Cashier code (already compliant).
- Viem / blockchain logic.
- Any conversion between rails — explicitly forbidden by MTL posture.
