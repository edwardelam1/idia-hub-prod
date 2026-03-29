

# Plan: Remove All Mock Data from Trading Interface & Billing (Golden Rule Compliance)

## Problem Summary

After thorough review, the following components contain hardcoded mock data or non-functional buttons that violate the Golden Rule:

### Trading Interface & Trading Desk

| Component | Violations |
|-----------|-----------|
| **TradingDeskDashboard.tsx** (Overview tab) | Hardcoded "47ms", "89ms", "99.97%", "99.99%" performance metrics |
| **TradingInterface.tsx** | Hardcoded "12,450" credits, "$847K" 24h volume |
| **APIKeyManagement.tsx** | 3 hardcoded mock API keys with fake key strings, fake dates, fake call counts. "Generate", "Regenerate", "Revoke" buttons are non-functional |
| **APIMonitoring.tsx** | All data is mock: latency arrays, throughput arrays, endpoint usage arrays, audit log entries, "2,847 req/min", "0.03% error rate", "47ms avg latency" |
| **APIBilling.tsx** | Hardcoded "8,456 credits consumed", "12,544 remaining", "100,000 monthly allocation", "resets in 12 days" |
| **FeatureFeedAccess.tsx** | Descriptive/static content (acceptable as product documentation), but "View Sample Data" buttons are disabled/non-functional |
| **useTradingData.tsx** | Portfolio uses `Math.random()` for amounts/values (recalculates on every render); market depth is hardcoded |

### Billing & Credits (Synapse Ledger)

| Component | Violations |
|-----------|-----------|
| **useBillingData.tsx** | Entirely hardcoded: usage (8450/15000), billing history, subscription plan, 2 fake payment methods (Visa 4242, MC 8888), 4 fake invoices, usage breakdown. `downloadInvoice` and `updatePaymentMethod` are console.log stubs |
| **BillingCredits.tsx** | "Add Payment Method" button is non-functional. Invoice "Download" buttons call stub. Payment method "Edit"/"Remove" buttons are non-functional. "Upgrade Plan" and "View All Plans" buttons are non-functional |

### No Supabase tables exist for:
- User API keys
- User payment methods (the existing `payment_methods` table is business/POS-scoped)
- User subscriptions/billing
- User invoices (the existing `invoices` table is business/supplier-scoped)

## Approach

### Phase 1: Create Supabase tables for user-level billing & API keys

Create migrations for:

1. **`user_api_keys`** -- stores API keys per authenticated user with name, hashed key, status, last_used_at, total_calls, created_at. RLS: users can only see/manage their own keys.

2. **`user_payment_methods`** -- stores payment method type (credit_card, debit_card, bank_ach, bank_wire, dex_wallet, idia_life_wallet), display label, last4/identifier, is_default, metadata JSON. RLS: user-scoped.

3. **`user_invoices`** -- stores invoice_number, period, amount, status (paid/pending/overdue), pdf_url, created_at. RLS: user-scoped.

4. **`user_subscriptions`** -- stores plan_name, cost, features JSON, limits JSON, status, current_period_start/end. RLS: user-scoped.

### Phase 2: Update Trading Desk components

**APIKeyManagement.tsx:**
- Query `user_api_keys` from Supabase
- "Generate New Key" creates a key via crypto, stores hash in DB, shows full key once
- "Regenerate" rotates the key
- "Revoke" sets status to 'revoked'
- Show real `total_calls` and `last_used_at`
- Empty state when no keys exist

**APIMonitoring.tsx:**
- Replace all hardcoded arrays with live data derived from `transactions` table (aggregated by time bucket) and `check_pipeline_health` RPC
- Audit log: query recent `transactions` for the authenticated user
- Status cards: derive from real pipeline health data

**APIBilling.tsx:**
- Pull credits consumed from `transactions` table (sum of amounts for current period)
- Pull allocation from `user_subscriptions`
- Calculate days until period end from subscription data

**TradingDeskDashboard.tsx (Overview):**
- Replace hardcoded performance metrics ("47ms", "99.97%") with either live Supabase Edge Function latency stats or a clear "No live telemetry" indicator with a note that these will populate from production API gateway metrics

**TradingInterface.tsx:**
- Replace "12,450" credits with Synapse balance from `useSynapseCredits` context (already exists)
- Replace "$847K" volume with aggregated `transactions` sum
- Stabilize portfolio by using deterministic seed instead of `Math.random()`
- Remove hardcoded market depth; show "No order book data" when empty

### Phase 3: Update Billing & Credits (Synapse Ledger)

**useBillingData.tsx:**
- Rewrite to query Supabase tables: `user_subscriptions`, `user_payment_methods`, `user_invoices`, `transactions`
- Derive `currentUsage` from transaction sums in current billing period
- Derive `billingHistory` from transaction sums grouped by month
- Derive `usageBreakdown` from transactions grouped by `transaction_type`

**BillingCredits.tsx -- Add Payment Method modal:**
- Create a dialog with payment method type selector offering: Credit/Debit Card, Bank (ACH), Bank (Wire), DEX Wallet, IDIA Life Wallet
- For cards: collect last4, brand, expiry (no real payment processing -- stores reference)
- For bank: collect routing/account last4, bank name
- For DEX/IDIA wallet: collect wallet address
- Insert into `user_payment_methods`
- "Edit" and "Remove" buttons become functional (update/delete from DB)
- "Set as Default" functionality

**Invoices:**
- Query `user_invoices` from Supabase
- "Download" generates a simple receipt view (or shows toast "Invoice PDF not yet available" if no pdf_url)
- Empty state when no invoices

**Subscription:**
- Query `user_subscriptions`
- "Upgrade Plan" / "View All Plans" show a plan comparison dialog
- If no subscription exists, show "No active subscription" with option to select a plan

### Phase 4: Remove market depth mock, stabilize portfolio

- Replace hardcoded `marketDepth` with empty state
- Use deterministic portfolio derivation (seeded by token symbol hash) instead of `Math.random()`

## Technical Details

### New migrations:
```sql
-- user_api_keys
CREATE TABLE public.user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name text NOT NULL,
  key_prefix text NOT NULL,  -- first 8 chars for display
  key_hash text NOT NULL,    -- SHA-256 hash of full key
  status text NOT NULL DEFAULT 'active',
  total_calls integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- user_payment_methods
CREATE TABLE public.user_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type text NOT NULL, -- credit_card, debit_card, bank_ach, bank_wire, dex_wallet, idia_life_wallet
  display_label text NOT NULL,
  identifier text,          -- last4 or wallet address prefix
  is_default boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- user_subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  cost numeric NOT NULL,
  features jsonb DEFAULT '[]',
  limits jsonb DEFAULT '{}',
  status text DEFAULT 'active',
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

-- user_invoices
CREATE TABLE public.user_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  period text NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending',
  pdf_url text,
  created_at timestamptz DEFAULT now()
);
```

All tables get RLS policies: user can SELECT/INSERT/UPDATE/DELETE only their own rows (`user_id = auth.uid()`).

### Files to modify:
- `src/hooks/useBillingData.tsx` -- full rewrite with Supabase queries
- `src/components/billing/BillingCredits.tsx` -- Add Payment Method modal, functional buttons
- `src/components/trading/APIKeyManagement.tsx` -- Supabase CRUD
- `src/components/trading/APIMonitoring.tsx` -- live data from transactions/pipeline
- `src/components/trading/APIBilling.tsx` -- live data from transactions/subscriptions
- `src/components/trading/TradingDeskDashboard.tsx` -- remove hardcoded perf metrics
- `src/components/trading/TradingInterface.tsx` -- use SynapseCredits context, stabilize portfolio
- `src/hooks/useTradingData.tsx` -- deterministic portfolio, remove market depth mock

