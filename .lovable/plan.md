# Buyer Diagnostic Battery & Affinity-Weighted Credit Pricing

Establish a buyer profile vector (role, jurisdiction, latency, category weights) captured through diagnostic questionnaires, and use it to price every Synapse Credit consumption action accurately.

## Current state (verified)

- `synapse-controller.calculateDynamicFee` already multiplies the sector base value by a `buyerWeight` read from a table `business_interest_profiles` — that table does not exist in the database, so the lookup always fails and every buyer is charged at weight `1.0`.
- `_shared/bundle-pricing.ts` accepts an optional `buyerWeight` input that no caller currently supplies.
- `public.profiles` has no columns for role posture, jurisdiction, latency, or weights.

So the pricing hook points exist; the profile data behind them does not. This plan fills that gap.

## Phase 1 — Data model

New table `public.buyer_profile_vectors` (one row per user):

- `user_id` (unique), `role`, `jurisdiction`, `latency_requirement`
- `weights` jsonb — the six canonical categories: `realtimeSentiment`, `consumerTransactions`, `geospatialSar`, `b2bFirmographics`, `identityGraphs`, `consentArtifacts`
- `level0_completed_at`, `level1_completed_at`, `level1_battery` (which role battery produced the weights), `tier_at_completion`
- `raw_answers` jsonb for audit/replay

New table `public.buyer_diagnostic_responses` — append-only log of every answer set (question id, choice, battery, timestamp) so weight changes are auditable.

Both tables: explicit GRANTs, RLS enabled, users read/write only their own row; `service_role` full access for edge functions.

## Phase 2 — Level 0 hard gate

- `src/components/onboarding/BuyerDiagnosticLevel0.tsx`: a non-dismissible modal with the two questions (Organizational Posture A–D, Jurisdictional Exposure A–E). No close button, no escape, no overlay dismiss.
- Mounted in `AppLayout` so it covers any landing route. It renders when the signed-in user has no `level0_completed_at`. Existing users get it at their next login; new users on first dashboard load.
- On submit: write role + jurisdiction, seed the default weight vector for the chosen role, stamp `level0_completed_at`.

## Phase 3 — Level 1 role batteries (tier-upgrade triggered)

- `src/components/onboarding/BuyerDiagnosticLevel1.tsx` renders the matching battery by role:
  - Trading Desk: Q1 latency, Q2 feature types, Q3 provenance
  - Org Admin / BI: E1 value objective, E2 entity linkage, E3 cadence
  - Compliance: C1 framework, C2 TOMs, C3 retention
  - Individual: I1 vault utilization, I2 sharing posture
- Trigger: a tier change only. A hook compares `profiles.active_saas_tiers` against `tier_at_completion` on the vector row; when the tier rises, the battery opens (dismissible, re-prompts until answered) and rewrites the weight vector with the published vectors for that role, adjusted by the answers (latency answer sets `latency_requirement`).

## Phase 4 — Valuation engine

- `src/lib/buyer-affinity.ts` (shared with an identical `supabase/functions/_shared/buyer-affinity.ts`): the `BuyerProfileVector` interface and `calculateDatasetRelevance()` exactly as specified — base weight × jurisdiction factor (1.20 match / 0.85 mismatch) × latency factor (1.15 match / 0.90 mismatch), clamped to [0.10, 1.00].
- Category mapping: bundle/module category strings map to the six weight keys (e.g. `health.*`/`lifestyle.*` → `consumerTransactions` or `geospatialSar` by subtype, `business.*` → `b2bFirmographics`, feature feeds → `realtimeSentiment`, compliance datasets → `consentArtifacts`).
- Pricing direction (confirmed): high relevance costs more. `V_final = base cost × relevance`, so a 1.00-affinity dataset charges full sector price and a 0.10-affinity dataset is heavily discounted.

## Phase 5 — Wire the engine into every credit path

- `synapse-controller`: replace the dead `business_interest_profiles` lookup with `buyer_profile_vectors`, resolve the dataset category from the routed sub-module, and apply `calculateDatasetRelevance` as the buyer weight.
- `best-friend-ai`: same weight applied to its query fee.
- Bundle pricing: pass `buyerWeight` into `calculateBundlePrice` for the requesting buyer so marketplace prices are personalized.
- Marketplace UI: each bundle card and the detail sheet show an "Affinity" indicator and the personalized credit price, with a tooltip explaining that price scales with relevance to the buyer's declared profile.
- Trading Desk / MCP / feature feed consumption calls route through the same helper — one source of truth, no per-surface duplication.

## Technical notes

- Weight vectors are stored as data, not hardcoded in components, so they can be retuned without a deploy.
- Every fee calculation logs the resolved weight, jurisdiction factor, and latency factor alongside the charge for auditability.
- If a user somehow has no vector (edge function called before Level 0), the engine falls back to weight `1.0` — full price, never a free query.
