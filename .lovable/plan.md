## What I’ll change

1. **Make Best Friend ACA replies deterministic, not prompt-only**
   - Replace the current soft ACA prompt-append approach in `supabase/functions/best-friend-ai/index.ts` with a server-authored ACA response composer for ACA catalog / ACA file inspection requests.
   - Enforce the agreed output shape: no ACA identifier echoed back, signal-only language, medium-length summary, grouped totals translated into meaning instead of raw table dumps.
   - Ensure the ACA path wins over the older generic agent phrasing so the assistant cannot fall back to legacy wording.

2. **Normalize Best Friend receipt creation across AI usage**
   - Audit the Best Friend request modes and make receipt issuance happen for AI-powered data access flows, not only `isMarketplaceMode === true`.
   - Keep receipt generation tied to actual data/ACA usage so Synapse burns are consistent with what the AI accessed.
   - Return receipt metadata in a stable way so the frontend can surface it reliably.

3. **Close trading-desk receipt gaps**
   - Keep the already-correct receipt paths intact:
     - `marketplace-bundle-access` -> `synapse-controller`
     - `APIEndpoints` live calls -> `synapse-controller`
   - Add receipt-backed charging where it’s missing or incomplete for trading tools, especially:
     - SQL terminal / query execution path
     - feature-feed / live data access path where usage should count as billable consumption
     - any AI/data-access path in the trading desk that currently reads data without a Synapse receipt

4. **Align billing/monitoring with the real receipt model**
   - Make usage dashboards read the same ledger entry types that the Synapse controller actually writes, so the UI reflects real consumption.
   - Verify the trading desk monitoring/billing views don’t undercount because they only look at legacy `deduction` rows.

## Likely files involved

- `supabase/functions/best-friend-ai/index.ts`
- `supabase/functions/synapse-controller/index.ts`
- `supabase/functions/execute-hub-query/index.ts` or the live query path used by the SQL terminal
- `src/pages/BestFriendPage.tsx`
- `src/components/marketplace/MarketplaceTerminal.tsx`
- `src/components/trading/FeatureFeedAccess.tsx`
- `src/hooks/useBillingData.tsx`
- `src/contexts/SynapseCreditsContext.tsx` if balance/usage refresh needs alignment

## Key findings behind this plan

- The new ACA behavior exists, but it is currently **only appended as prompt context** in `best-friend-ai`; that means the model can still answer in the old generic style instead of the agreed format.
- Best Friend currently sends Synapse receipts only in the marketplace/data-scientist branch, so some AI interactions can still bypass receipt creation.
- Marketplace bundle access and the API endpoint test flow already hand off to `synapse-controller`, but other trading-desk surfaces are not consistently wired into the same receipt path.
- Billing currently appears to rely on legacy ledger filtering, which risks misreporting actual usage after Synapse-controller burns.

## Technical details

- **Best Friend formatter:** move ACA summary generation from “model instructed to summarize this JSON” to “server computes the summary, model only used when needed outside ACA mode.”
- **Receipt standardization:** use one server-authoritative receipt contract centered on `synapse-controller` so marketplace, AI, API, and query tools burn credits the same way.
- **Usage accounting:** update client queries to count the real Synapse usage entries (`USAGE`/settled burns and related receipt rows) instead of only older `deduction` records.
- **Validation:** test ACA lookup responses, Best Friend receipt emission, bundle access, endpoint execution, and SQL/query execution so each produces both a user result and a ledger/receipt trail.

```text
User action
  -> tool/feature call
  -> server-side receipt decision
  -> synapse-controller (or equivalent standardized burn path)
  -> synapse_credit_ledger + egress_logs
  -> UI refresh / monitoring / billing
```

If you approve, I’ll implement this end-to-end with the smallest possible set of targeted changes.