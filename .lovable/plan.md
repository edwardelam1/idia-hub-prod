

# Plan: A La Carte Credit Purchase + Best Friend Marketplace Search

## Part 1: A La Carte Custom Amount Option

### `src/components/billing/SynapsePurchaseModal.tsx`
- Add state: `purchaseMode: 'tier' | 'alacarte'`, `alacarteAmount: string`
- Add a toggle row above tiers: "Volume Tranches" | "A La Carte"
- When "A La Carte" is active, replace tier cards with a USD input field:
  - Static `$` prefix, input accepts only digits, static `.00` suffix displayed
  - Min $10, max $1,000 — validation error shown outside range
  - Credits calculated at base rate: `credits = usdAmount / 0.75`
  - No volume discount
- Transaction Summary updates dynamically for both modes
- Same payment flow after selection

### `src/components/billing/SynapseTopUp.tsx`
- Same pattern: add mode toggle between "Volume Tranches" and "A La Carte"
- Custom amount input with identical $10-$1,000 validation and `.00` suffix
- Summary panel updates reactively based on mode

---

## Part 2: Best Friend AI Marketplace Search (Credit-Gated)

### `src/pages/BestFriendPage.tsx`
- Import `supabase` client and `useSynapseCredits`
- Add a **"Marketplace Search"** toggle button below the input field (next to Send), styled as a pill/chip
- When toggled ON, the input placeholder changes to `Search the data marketplace...`
- Marketplace search triggers on:
  1. The toggle is ON and user sends any message, OR
  2. Message contains `@search marketplace` (case-insensitive) regardless of toggle state
- On marketplace search:
  1. Check credit balance >= 1 CRD
  2. If insufficient, toast error: "Insufficient Synapse Credits (1 CRD required)"
  3. If sufficient, query `marketplace_bundles` from Supabase (title, category, description, price, tier, contacts_count, data_points, features)
  4. Deduct 1 CRD via `supabase.functions.invoke('top-up-credits', { body: { amount: -1 ... } })`
  5. Inject bundle results as context into the AI chat request
  6. Show a small "1 CRD deducted" badge on the AI response message
- For non-marketplace queries, proceed as before (no credit cost)

### `supabase/functions/best-friend-ai/index.ts`
- Accept optional `marketplaceResults` in request body
- When present, append to the Gemini prompt: the bundle data as context, with instruction to summarize signal-level metadata only (names, categories, record counts, pricing, compliance tags)
- Add directive: "You must NEVER return raw data records. Raw data access requires Enterprise T1P clearance."

### `src/lib/api.ts`
- Update mock handler for `/api/v1/best-friend/chat` to check for `marketplaceResults` in context and return a smarter mock response summarizing the bundles

---

## Technical Details

### Files modified:
1. `src/components/billing/SynapsePurchaseModal.tsx` — a la carte mode + custom USD input
2. `src/components/billing/SynapseTopUp.tsx` — a la carte mode + custom USD input
3. `src/pages/BestFriendPage.tsx` — marketplace search button, credit deduction, Supabase query
4. `supabase/functions/best-friend-ai/index.ts` — marketplace context in persona prompt
5. `src/lib/api.ts` — enhanced mock handler

### No database changes needed
- `synapse_credit_ledger` already supports deductions
- `marketplace_bundles` already exists for querying

