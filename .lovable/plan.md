

# Plan: Synapse Credit Pipeline Upgrade to Production-Ready Real-Time Economic Engine

## Summary

This is a large, multi-phase upgrade touching ~15 files. The core change is replacing the mock `fetchApi` fallback system with live Supabase queries, creating a new `synapse_credit_ledger` table for real-time credit tracking, building edge functions for credit operations, and wiring all billing/trading/earnings UIs to live data.

---

## Phase 1: Database — Create `synapse_credit_ledger` Table

Create a new migration with a ledger table that records every credit event (deposits, deductions, refunds). This becomes the single source of truth for credit balances.

```sql
CREATE TABLE public.synapse_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type text NOT NULL, -- 'deposit', 'deduction', 'refund', 'subscription_purchase'
  amount numeric NOT NULL, -- positive for deposits, negative for deductions
  balance_after numeric NOT NULL,
  description text,
  reference_id text, -- links to invoice, bundle, API key, etc.
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.synapse_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ledger" ON public.synapse_credit_ledger
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_credit_ledger_user ON public.synapse_credit_ledger(user_id, created_at DESC);
```

---

## Phase 2: Edge Functions

### 2a. `top-up-credits` Edge Function
- Accepts `{ user_id, credit_amount, usd_amount, payment_reference }`
- Reads current balance from `synapse_credit_ledger` (latest `balance_after`)
- Inserts a new `deposit` entry with updated `balance_after`
- Returns the new balance

### 2b. `quote-bundle` Edge Function
- Accepts `{ bundle_id }` or `{ bundle_ids[] }`
- Looks up `marketplace_bundles.price` (the `base_valuation`)
- Returns `{ items: [{ bundle_id, name, base_valuation }], total_cost }`

---

## Phase 3: Refactor `SynapseCreditsContext` — Real-Time Ledgering

**File:** `src/contexts/SynapseCreditsContext.tsx`

- Remove `fetchApi('/api/v1/synapse/balance')` mock call
- Query Supabase: fetch the user's `wallets` row for `wallet_address`, and the latest `synapse_credit_ledger` entry for `balance_after` as `available_credits`
- Subscribe to Supabase Realtime on `synapse_credit_ledger` table filtered by `user_id` — on INSERT, update `balanceData.available_credits` instantly
- Cleanup subscription on unmount

---

## Phase 4: `useCreditCheck` Hook — Insufficient Funds Interceptor

**New file:** `src/hooks/useCreditCheck.tsx`

- Exports `useCreditCheck()` returning `{ checkCredits(cost): boolean, InsufficientFundsModal }`
- Reads `useSynapseCredits()` balance
- If `cost > available_credits`, opens `SynapsePurchaseModal` with a warning banner: "Insufficient Synapse Credits. Please top up to complete this action."
- Used in: ShoppingCart purchase flow, API key provisioning, bundle downloads

---

## Phase 5: Pre-Flight Quote Engine in ShoppingCart

**File:** `src/components/marketplace/ShoppingCart.tsx`

- Before enabling "Purchase & View Reports", call the `quote-bundle` edge function via `supabase.functions.invoke('quote-bundle', ...)`
- Show a "Quoting..." loading state, then display the exact `base_valuation` per item and total
- Only enable "Confirm Purchase" after quote is returned and credits are sufficient
- Wire through `useCreditCheck` to intercept insufficient funds

---

## Phase 6: Upgrade `SynapsePurchaseModal` — Payment Gateway UI

**File:** `src/components/billing/SynapsePurchaseModal.tsx`

- Add a second step after tier selection: "Enter Payment Details" with card number (masked), expiry, CVV fields (simulated — no real PCI)
- "Pay" button shows a processing animation ("Verifying payment..."), then calls `supabase.functions.invoke('top-up-credits', ...)` to log the DEPOSIT into the ledger
- On success, balance updates in real-time via the Realtime subscription
- Remove `fetchApi('/api/v1/billing/worldpay/initiate')` mock call

---

## Phase 7: Burn Rate Visuals

**Files:** `src/components/trading/APIBilling.tsx`, `src/components/billing/SynapseGasGauge.tsx`

- Calculate 30-day average usage from `synapse_credit_ledger` deduction entries
- If current balance < 15% of 30-day average, turn gauge/indicators orange; if < 5%, turn red with pulse animation
- Add a "Burn Rate" stat showing credits/day consumption rate

---

## Phase 8: Clear Mock Data from `lib/api.ts`

**File:** `src/lib/api.ts`

- Remove mock handlers for: `/api/v1/synapse/balance`, `/api/v1/settlement/balance`, `/api/v1/settlement/egress`, `/api/v1/billing/worldpay/initiate`, `/api/v1/delt/logs`
- Keep `fetchApi` function for any remaining real API calls, but stop returning mock data for credit/billing/settlement endpoints

---

## Phase 9: Header CRD Display — Live Balance

**File:** `src/components/layout/TopBar.tsx`

- Already reads from `useSynapseCredits()` — once Context is refactored (Phase 3), the header will automatically show live balance instead of mock 1250.00 CRD

---

## Phase 10: Billing Credits "Credits Remaining" — Live

**File:** `src/components/billing/BillingCredits.tsx`

- Replace hardcoded `limit: 15000` in `useBillingData` with the subscription tier's actual credit allocation from `user_subscriptions`
- "Credits Remaining" badge reads live balance from `synapse_credit_ledger`

**File:** `src/hooks/useBillingData.tsx`

- Usage calculation: sum of deduction entries in `synapse_credit_ledger` for current billing period (between `started_at` and `expires_at` from `user_subscriptions`)
- Remove hardcoded `limit: 15000` fallback — derive from subscription tier

---

## Phase 11: Earnings & Settlement — Live Data

**File:** `src/components/billing/EarningsSettlement.tsx`

- Replace `fetchApi('/api/v1/settlement/balance')` with Supabase queries:
  - `available_balance`: sum of completed `transactions` where `transaction_type = 'data_sale'` minus settled amounts
  - `pending_balance`: sum of pending transactions
  - `lifetime_earnings`: total sum
  - `bank_last4`: from `user_payment_methods` where `method_type = 'bank_ach'` and `is_default = true`
- Replace `fetchApi('/api/v1/settlement/egress')` with a Supabase insert into a `settlement_requests` or `transactions` table
- Remove mock `businessId = 'ENT-MOCK'`

---

## Phase 12: Provenance Audit Log — Remove HRI Score, Live Data

**File:** `src/components/trading/ProvenanceAuditLog.tsx`

- Remove `hri_score_at_egress` column from the table header and rows
- Remove from the `ProvenanceLog` interface
- Replace `fetchApi('/api/v1/delt/logs')` with Supabase query on `transactions` filtered by `transaction_type = 'delt_transfer'` or similar, deriving provenance data from transaction metadata
- Remove mock data from `lib/api.ts` (already covered in Phase 8)

---

## Phase 13: Subscription Plans — Unified Purchase Flow

**Files:** `src/components/billing/BillingCredits.tsx`, `src/components/onboarding/EcosystemOnboarding.tsx`

### Fix plan pricing to match Hub Enrollment:
- Analyst: $9,995/yr
- Professional: $24,995/yr
- Enterprise: $49,995+/yr

Currently `BillingCredits.tsx` shows $99/mo, $299/mo, $999/mo — these are wrong. Update the plans dialog to show annual pricing matching enrollment.

### "Select Plan" button action:
- Both the Subscription tab's "Select Plan" buttons and the Ecosystem Onboarding "Confirm & Continue" button navigate to a universal purchase screen
- Create a new route/component `UniversalPurchaseScreen` or reuse an existing checkout flow
- The screen shows: selected plan name, annual cost, payment method selector (from `user_payment_methods`), and a "Complete Purchase" button
- On purchase: insert into `user_subscriptions`, insert a `subscription_purchase` entry into `synapse_credit_ledger`, create an invoice in `user_invoices`

### Ecosystem Onboarding:
- "Confirm & Continue" navigates to the same universal purchase screen with the selected role pre-loaded

---

## Technical Details

### New files:
- `src/hooks/useCreditCheck.tsx` — insufficient funds interceptor hook
- `src/components/billing/UniversalPurchaseScreen.tsx` — checkout for subscriptions
- `supabase/functions/top-up-credits/index.ts` — edge function for credit deposits
- `supabase/functions/quote-bundle/index.ts` — edge function for bundle pricing

### Modified files:
- `src/contexts/SynapseCreditsContext.tsx` — Supabase + Realtime
- `src/components/billing/SynapsePurchaseModal.tsx` — payment gateway UI + edge function
- `src/components/billing/SynapseGasGauge.tsx` — burn rate visuals
- `src/components/billing/BillingCredits.tsx` — live credits, fixed plan pricing, purchase navigation
- `src/components/billing/EarningsSettlement.tsx` — live Supabase data
- `src/components/trading/APIBilling.tsx` — burn rate visuals
- `src/components/trading/ProvenanceAuditLog.tsx` — remove HRI, live data
- `src/components/marketplace/ShoppingCart.tsx` — quote engine
- `src/components/onboarding/EcosystemOnboarding.tsx` — navigate to purchase screen
- `src/hooks/useBillingData.tsx` — live usage from ledger
- `src/lib/api.ts` — remove mock handlers
- `src/App.tsx` — add route for universal purchase screen

### New migration:
- `synapse_credit_ledger` table with RLS

