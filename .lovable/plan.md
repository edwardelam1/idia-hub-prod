

## Plan: Strip academic guardrails from `best-friend-ai`

### Changes to `supabase/functions/best-friend-ai/index.ts`

**1. Replace `ORCHESTRATOR_PROMPT`** — remove staged researcher persona, source-marker rule, "never claim certainty" language. New prompt = plain Hub Analyst voice.

**2. Simplify `buildResearchPlan`** — drop agent-specific objectives, evidence needs, verification checks. Return a flat plan with one objective: "Summarize the data yield."

**3. Rewrite `buildOrchestratorPrompt` execution rules** — delete the "If you mention a number, add a source marker" and "If data is missing, say that directly" lines. Replace with:
```
- State the data clearly.
- Do not add citations or source markers.
- If the count is 55, just say 55.
```

**4. Neutralize `runVerificationLoop`** — currently rewrites any sentence with a number that lacks a citation into "This numeric point may matter, but it still needs a cited source." This is the actual source of the spam. Change it to a pass-through that returns `{ text: draft, issues: [] }`.

**5. Delete `enforceAuditFooter`** and remove its call inside `normalizeOutput`. No more "⚠️ Audit Required" tails.

**6. Soften agent prompts** in `AGENT_REGISTRY` — strip PICOTSS / "Require cited numeric claims" / "Flag forward-looking statements" lines. Keep agent identity (Medical/Construction/Finance/Navigator) but remove the citation-policing verification checks (already neutralized in step 4, but clean the registry too for consistency).

**7. Keep intact**: omni-fetch (`fetchOmniRecords`), CORS, Zod validation, PII redaction, banned-word governance, sentence-shortening, JWT-free deploy. None of these cause the "cited source" spam.

### Deploy
After edits, deploy `best-friend-ai` and the user can re-test on `/best-friend` in Marketplace Mode — expected output is a clean numeric summary like "55 health records, 87,950 steps, avg HR 95 BPM" with no audit footer or citation nags.

### Files Modified
- `supabase/functions/best-friend-ai/index.ts`

### Outcome
- No more "needs a cited source" rewrites.
- No more "⚠️ Audit Required" footers.
- AI responds as Hub Analyst with clean record counts and trends.

