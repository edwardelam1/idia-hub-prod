

# Deploy `synapse-controller` and Wire It to the Chief Researcher

## Summary
Create the `synapse-controller` Edge Function as the centralized gas metering and egress tokenization engine. Then rewire `BestFriendPage.tsx` to call it instead of the current scattered `process-delt-transfer` + `deduct-synapse-credit` pattern. Finally, update `best-friend-ai` to return complexity metadata so the frontend can pass it to the controller.

## Schema Compatibility Check
- `egress_logs` insert requires: `user_id`, `client_id`, `liability_token_hash`, `batch_checksum`, `digiramp_anchor_id`. The controller code provides all of these. `country_of_origin` has a default. Compatible.
- `synapse_credit_ledger` insert requires: `user_id`, `amount`, `entry_type`. The controller provides these. `transaction_type` is nullable (enum: FEE fits best here). `status` defaults to null but the code sets "SETTLED". One fix needed: use `transaction_type: "FEE"` instead of omitting it, to match existing convention.
- `entry_type` is a plain string — "USAGE" is valid but the existing deduction function uses "deduction". I will keep "USAGE" as the user specified, since it distinguishes controller-metered gas from flat 1-CR deductions.

## Implementation Steps

### 1. Create `supabase/functions/synapse-controller/index.ts`
- Use the user's provided code with one adjustment: add `transaction_type: "FEE"` to the ledger insert to satisfy the enum convention.
- The function handles: auth validation, zero-UUID rejection, dynamic gas calculation, SHA-256 tokenization, atomic ledger + egress write, and financial response payload.

### 2. Update `src/pages/BestFriendPage.tsx`
- Replace the two-step marketplace flow (step 2: `process-delt-transfer` + step 3: `deduct-synapse-credit`) with a single call to `synapse-controller`.
- Pass `intent_type`, `query_complexity` (default 1.0 for now), `client_id`, and `aca_record_ids`.
- Read `financials.total_cr_deducted` from the response to display in the chat bubble.
- Keep the `best-friend-ai` call unchanged — it runs after the controller succeeds.
- Invalidate `["egress-logs"]` queries after success (already done).

### 3. Update `supabase/functions/best-friend-ai/index.ts` (minor)
- Add `queryComplexity` to the response payload based on the detected agent:
  - `GENERAL_NAVIGATOR`: 1.0
  - `MEDICAL_AGENT` / `FINANCE_AGENT`: 2.0 (high-stakes)
  - `CONSTRUCTION_AGENT`: 1.5
- This allows a future iteration where the frontend calls the controller *after* the AI responds with complexity data, rather than before. For now, the frontend uses a default 1.0.

### 4. Deploy
- Deploy `synapse-controller` edge function.

## Files Changed
| File | Action |
|------|--------|
| `supabase/functions/synapse-controller/index.ts` | Create — user's provided code + `transaction_type: "FEE"` |
| `src/pages/BestFriendPage.tsx` | Modify — replace `process-delt-transfer` + `deduct-synapse-credit` with single `synapse-controller` call |
| `supabase/functions/best-friend-ai/index.ts` | Minor — add `queryComplexity` to response |

## Technical Notes
- The controller uses `SUPABASE_SERVICE_ROLE_KEY` for the atomic write — this bypasses RLS intentionally since the function validates auth first and writes under the real `user_id`.
- `SUPABASE_ANON_KEY` is used only for user auth verification via `getUser()`.
- The `synapse_ledger_entry_id` linkage (egress → ledger) provides the financial audit trail the provenance log needs.
- The `process-delt-transfer` function is NOT deleted — it remains available for non-AI egress paths. But Best Friend no longer calls it.

