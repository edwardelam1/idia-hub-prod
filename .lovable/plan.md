
Fix both issues in two passes: first make the egress path trustworthy and visible, then replace the current mega-prompt with the Core Orchestrator layer.

1. Fix why tokens exist but do not appear in /egress-logs
- I inspected the live DB and found a recent `egress_logs` row created on 2026-04-15 with:
  - `client_id = idia_hub_ui_best_friend`
  - `user_id = 00000000-0000-0000-0000-000000000000`
  - empty `aca_record_references`
- Your `egress_logs` RLS policy only shows rows where `user_id = auth.uid()`.
- So the token can be created, but that row is invisible to the real user because it was written under a zero UUID.
- This is the main reason the log screen does not show the newest record.

2. Repair the Best Friend egress write path
- Standardize Best Friend so it always reaches `process-delt-transfer` through one authenticated path.
- Remove any stale/parallel writer behavior that can still create rows like `idia_hub_ui_best_friend`.
- Make `process-delt-transfer` reject invalid user identity early and log clearly when auth is missing.
- Ensure the function always writes:
  - the real authenticated `user_id`
  - non-empty `aca_record_references`
  - a stable `client_id`
  - the returned `liability_token_hash`

3. Fix ACA resolution before tokenization
- `BestFriendPage.tsx` currently queries staged tables with `pseudo_user_id = platform_guid`.
- That is likely wrong for this pipeline. The staging system writes pseudonyms, not the raw `platform_guid`.
- I will align the lookup with the actual pseudonymization flow so Best Friend resolves the correct staged records first.
- Then I will build `aca_record_ids` from the staged rows’ `aca_hash_key` values, as you specified.
- If no ACA hashes are found, the UI should show a clear “no auditable lineage found” state instead of silently producing a broken egress event.

4. Clean up the chat request payload
- `best-friend-ai` expects richer context than the page currently sends.
- I will pass the actual marketplace datasets and relevant history so marketplace mode works as intended.
- I will also keep the Liability Shield receipt UI tied to the same successful egress response, not to partial frontend assumptions.

5. Make /egress-logs reliably reflect what was written
- Keep the realtime listener, but treat it as secondary.
- Make the list refetch after successful egress creation and after realtime inserts.
- Keep the current RLS-safe query by `auth.uid()`.
- Add a one-time data correction for malformed recent rows written with the zero UUID, if you want me to repair existing hidden records as well.

6. Build the Chief Researcher Core Orchestrator first
- Per your choice, I will implement the orchestration foundation before any domain agent.
- Replace the current single marketplace/research prompt with a routing layer that does:
  - Intent triage
  - Research plan decomposition
  - Agent selection
  - Verification pass
  - Output normalization
- Add the language guardrails you specified:
  - banned lexicon
  - short sentences
  - simple vocabulary
  - no semicolons
  - no em dashes
  - “And,” “But,” or “So,” style openings where appropriate

7. Core-only orchestrator structure
- In `best-friend-ai`, add:
  - `routeIntent(message)` for domain detection
  - an Orchestrator system prompt
  - agent prompt registry placeholders
  - a verification loop scaffold
  - governance filters before final output
- For now, domain agents will be stubs with strict interfaces, not full implementations.
- That gives you the modular framework first, without overcommitting to Medical or Construction yet.

8. Governance and safety layer
- Add a final output filter for:
  - banned phrasing
  - simple sentence shaping
  - citation enforcement for numeric claims
  - PII redaction
  - required “Audit Required” footer for high-stakes medical or financial guidance

9. Files I would update
- `src/pages/BestFriendPage.tsx`
- `src/components/trading/ProvenanceAuditLog.tsx`
- `src/lib/api.ts`
- `supabase/functions/process-delt-transfer/index.ts`
- `supabase/functions/best-friend-ai/index.ts`

10. Expected result
- Best Friend marketplace use will create egress rows under the real authenticated user.
- New Liability Shield tokens will appear on `/egress-logs`.
- ACA hashes will be captured as the auditable lineage batch.
- The AI layer will be ready for a modular Chief Researcher rollout, starting with the Core Orchestrator only.

Technical notes
- Confirmed from code: `BestFriendPage.tsx` is currently resolving staged data with `platform_guid`, which does not match the pseudonymized staging pattern used elsewhere.
- Confirmed from DB: newest problematic row is hidden by RLS because of `user_id = 00000000-0000-0000-0000-000000000000`.
- Confirmed from code: `process-delt-transfer` requires authenticated identity and writes to `egress_logs` plus `synapse_credit_ledger`.
- Confirmed from code: the current Best Friend page is not sending full marketplace data/history into `best-friend-ai`, so the AI side is not yet operating with the intended context.
