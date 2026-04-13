

# Persona Split + Secure Credit Deduction Edge Function

## Overview
Three changes: (1) create a dedicated `deduct-synapse-credit` edge function for secure server-side credit deductions, (2) update `BestFriendPage.tsx` to call it instead of hacking `top-up-credits` with negative values, (3) rewrite the `best-friend-ai` edge function prompt with the Jekyll/Hyde "Store Clerk vs Data Scientist" persona split.

## Changes

### 1. Create `supabase/functions/deduct-synapse-credit/index.ts`
- Authenticates the caller via the Authorization header (`getUser`)
- Accepts `{ amount, description, referenceId }` in the body
- Inserts into `synapse_credit_ledger` with correct column names: `amount` (negative), `entry_type: "usage"`, `status: "SETTLED"`, `description`, `reference_id`, `user_id`
- Uses service role key to bypass RLS for ledger writes
- Returns `{ success: true, deducted: N }`

**Column alignment note**: The existing `synapse_credit_ledger` schema uses `amount` (not `credit_amount`), `entry_type` (not `transaction_type` for the primary field), `reference_id` (not `payment_reference`). The function will use the correct column names.

### 2. Update `src/pages/BestFriendPage.tsx`
- Replace `deductCredit` to call `supabase.functions.invoke('deduct-synapse-credit', { body: { amount: 1, description: 'Marketplace Search Query' } })` instead of the `top-up-credits` hack
- If deduction fails, throw to abort the AI response
- Pass `marketplaceResults` directly in the edge function body (not nested in `context`) so the AI edge function receives it at the top level as expected

### 3. Rewrite `supabase/functions/best-friend-ai/index.ts` — Persona Split
- Remove the single `BEST_FRIEND_PERSONA` constant
- Define two personas: `STORE_CLERK_PERSONA` (navigator, refuses data requests, directs user to toggle Marketplace Search) and `DATA_SCIENTIST_PERSONA` (synthesizes insights from provided search results)
- Dynamically select persona based on whether `marketplaceResults` is present and non-empty
- Store Clerk mode: navigate, inform, refuse data/statistics requests
- Data Scientist mode: synthesize insights, simulate metrics, act authoritative with the provided marketplace result themes/features
- Keep existing history formatting and OpenAI call logic unchanged

## Technical Details

**Ledger insert shape** (deduct-synapse-credit):
```
{ user_id, amount: -1, entry_type: "usage", status: "SETTLED",
  description: "Marketplace Search Query",
  reference_id: "USAGE-xxxxxxxx" }
```

**Persona detection logic** (best-friend-ai):
```
const isDataScientist = marketplaceResults?.length > 0;
const systemPrompt = isDataScientist ? DATA_SCIENTIST_PERSONA + ... : STORE_CLERK_PERSONA + ...;
```

## Result
- Credit deductions are server-side authenticated — no client-side ledger manipulation
- AI persona dynamically switches between helpful navigator and deep data analyst based on search authorization
- Hallucinated "systems operational" responses eliminated by strict mode enforcement

