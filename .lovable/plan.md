
What I verified in the current code

- Done:
  - `process-delt-transfer` now uses `auth.getUser()`
  - zero-UUID rejection is present
  - `BestFriendPage.tsx` calls `generate_pseudonym` via RPC
  - Best Friend chat calls `supabase.functions.invoke("best-friend-ai")` directly
- Only partially done:
  - the provenance refresh from Best Friend invalidates `["provenance-logs"]`, but the audit screen queries `["provenance-logs", userId]`
  - the realtime handler exists, but the Best Friend success path is not invalidating the exact cache key the log screen uses
- Not actually done:
  - no real verification loop exists in `best-friend-ai`
  - no true research-plan decomposition layer exists
  - no structured agent registry/workflow scaffold beyond prompt stubs
  - no citation enforcement logic exists, only prompt instructions
  - no real output normalization beyond banned-word stripping and PII regex cleanup

Plan

1. Fix the egress-log sync path first
- Update `BestFriendPage.tsx` to invalidate the exact query key used by the audit screen: `["provenance-logs", userId]`
- Also trigger a broader fallback invalidation/refetch for provenance queries after a successful transfer
- Make the UI only show Shield-active state when the transfer truly succeeds

2. Tighten the DELT handoff from Best Friend
- Ensure `aca_record_ids` is built only from non-empty `aca_hash_key` values
- If no ACA hashes are found, stop the transfer and show a clear user-facing error instead of silently proceeding
- Keep `client_id` stable and auditable for Best Friend egress rows

3. Clean up the Best Friend AI payload
- Pass the full conversation history consistently
- Pass marketplace context in a single normalized shape
- Either remove unused `marketplaceResults` support or wire it up properly from the page so the function receives the data it was designed for

4. Replace the current “prompt blob” with an actual Core Orchestrator structure
- Refactor `supabase/functions/best-friend-ai/index.ts` into clear stages:
  - intent triage
  - plan decomposition
  - agent selection
  - verification scaffold
  - response synthesis
  - governance post-processing
- Keep Medical, Construction, and Finance as strict stubs for now

5. Add the missing verification layer
- Implement a real `runVerificationLoop` scaffold instead of only telling the model to verify
- For core-only mode, this will:
  - inspect the drafted response
  - flag unsupported numeric claims
  - require a source marker for numbers
  - downgrade unsupported claims to plain-language uncertainty

6. Strengthen governance/output normalization
- Keep banned lexicon filtering
- Add sentence shaping so long responses are split more safely
- Preserve the “no semicolons / no em dashes / simple vocabulary” rules
- Apply mandatory audit footers for medical and finance outputs
- Keep PII redaction as the final pass

7. Verify the audit screen behavior end to end
- Confirm a Best Friend marketplace query creates:
  - a visible `egress_logs` row under the authenticated user
  - non-empty `aca_record_references`
  - a matching `liability_token_hash`
- Confirm the row appears immediately on the audit log screen without manual refresh

Files to update
- `src/pages/BestFriendPage.tsx`
- `src/components/trading/ProvenanceAuditLog.tsx`
- `supabase/functions/best-friend-ai/index.ts`
- optionally `src/lib/api.ts` only if there is leftover dead routing code to remove

Expected outcome
- New Best Friend Liability Shield events will appear on the Provenance Audit Log immediately
- Best Friend will stop creating “successful-looking” UI states when no auditable ACA lineage exists
- The Chief Researcher backend will have a real core orchestration pipeline, not just prompt text that describes one

Technical notes
- The key cache bug is real: Best Friend currently invalidates `["provenance-logs"]`, while the audit log reads `["provenance-logs", userId]`
- The current orchestrator is mostly descriptive prompt engineering, not a modular workflow yet
- The current citation rule is only an instruction to the model, not an enforced post-check
