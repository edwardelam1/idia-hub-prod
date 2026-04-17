

## Plan: Fixed 1-CR Cost + AI Receipt Handoff Architecture

### Context
- Current `synapse-controller` calculates dynamic gas: `(records × 1) × complexity + 2 minting fee` — this needs to become a **flat 1 CR** per AI search.
- Credits are valued at **$0.75 fiat** (already reflected in `fiat_equivalent_value` calc — keep `* 0.75`).
- Architecture upgrade: `best-friend-ai` should return `consumed_records` (ACA hashes the AI actually used). `BestFriendPage` then hands that exact receipt to `synapse-controller` so the egress log + payout reflects only touched records — but the **fee stays flat at 1 CR**.

### Changes

**1. `supabase/functions/synapse-controller/index.ts`**
- Replace dynamic gas math with: `totalSynapseDeduction = -1` (flat 1 CR).
- Keep `aca_record_ids` for egress logging / downstream payout attribution, but decouple it from the fee.
- Update returned `financials` payload:
  - `gas_consumed: 1`, `minting_fee: 0`, `total_cr_deducted: 1`, `fiat_equivalent_value: 0.75`.
- Keep ledger insert + egress log write atomic (unchanged structure).

**2. `supabase/functions/best-friend-ai/index.ts`**
- Just before the final `return new Response(...)`, build `consumedReceipt`:
  - `MEDICAL_AGENT` → map `healthMetrics` → `aca_hash_key`
  - `CONSTRUCTION_AGENT` / `FINANCE_AGENT` → map `lifestyleEvents` → `aca_hash_key`
  - `GENERAL_NAVIGATOR` → empty array
- Add `consumed_records: consumedReceipt` to the JSON response.

**3. `src/pages/BestFriendPage.tsx`**
- Replace current invoke logic in `handleSendMessage`:
  1. Call `best-friend-ai` first → get `chatResponse` + `consumed_records`.
  2. If `marketplaceMode && receipt.length > 0`, call `synapse-controller` with `{ client_id: user.id, aca_record_ids: receipt, intent_type: activeAgent, query_complexity: 1.0 }`.
  3. Capture `liability_token_hash` from response.
  4. Append assistant message with `liabilityTokenHash` + `creditDeducted` flags.
  5. Call `refreshBalance()` only after a real deduction.
- Remove any prior unconditional Synapse invocation so navigation-only chats don't burn credits.

### Files Modified
- `supabase/functions/synapse-controller/index.ts`
- `supabase/functions/best-friend-ai/index.ts`
- `src/pages/BestFriendPage.tsx`

### Outcome
- Every AI search that touches data costs exactly **1 CR ($0.75 fiat)**.
- Pure navigation chats (no records consumed) cost **0 CR**.
- Egress log + downstream IDIA Life payout still tied to the exact ACA records the AI actually read.
- Gas gauge refreshes only when a real deduction happens.

