# Crazy 8: enforce the official agent roles and make every alert specific

## 1. Each agent does exactly the job you defined

| Agent | Role | What it will actually check (real data only) |
|---|---|---|
| Sentinel | Anomaly detection | Request volume, failure rate and slowness across the Hub (unchanged) |
| Oracle | Predictive threat modeling | 7-day trend of alerts by agent and type, forecasts which area is heating up |
| Hunter | Active threat hunting | Security logs, the credit ledger and payment records for odd patterns (e.g. bursts of charges, failed settlements, repeated refused calls from one source) |
| Guardian | Zero-trust access control | New admin/security roles, new API keys, refused sign-ins and permission-denied database calls (moved here from Gatekeeper) |
| Gatekeeper | Ingress and egress sanitization | Best Friend AI messages for manipulation tricks (moved from Mirror) plus outgoing exports for fields that should never leave |
| Shield | Data loss prevention | The Vulture quarantine airlock: uploads set aside, why, and unverified/legacy data arriving (moved from Hunter), plus export volume per account |
| Mirror | Adversarial red-teaming | Every sweep it actually tries a short list of known attacks against the live system (signed-out reads of protected tables, calling admin-only functions without a role, bad API keys) and reports any that got through. These are real tests, not fake events |
| Insight | Forensic auditability | Writes a dated, plain-English incident record for each serious alert, suitable for a security officer review |

Guardian no longer re-triages other agents' alerts, so the same incident is not reported three times.

## 2. Titles say what happened

Titles are built from the real cause, with the agent and role as a small tag:
- "Admin role granted to an account" (Guardian)
- "2 messages tried to override Best Friend AI" (Gatekeeper)
- "Red-team check: 0 of 6 attacks got through" (Mirror)
- "Incident record: admin role granted" (Insight)
- "Access alerts rising: 3 today vs 0 yesterday" (Oracle)
- "All clear: 412 requests checked" (any quiet sweep)

Older alerts are retitled on screen from the numbers they already hold.

## 3. Each report reads differently
- Detectors (Sentinel, Hunter, Guardian, Gatekeeper, Shield): "What we saw" plus evidence.
- Mirror: list of attacks tried, pass/fail for each.
- Oracle: trend, what to expect next, confidence.
- Insight: "What happened / Why it matters / What was done / Record ID", with a link back to the original alert.

The agent cards, glossary pop-ups and "what this agent watches" text are updated to the new roles.

## Technical details
- `crazy-8-security`: reassign detectors per table above; add Mirror probe set using an anon client (expect denial; any success = critical); Hunter reads ledger/settlement tables; per-agent prompts and response shapes; model returns a `headline`; store `headline` and `source_event_ids` in `result_data`. Redeploy and run one sweep. Model unchanged.
- `securityGlossary.ts`: new AGENT_INFO roles, `eventHeadline()` with fallbacks for old rows; `SecurityEventSheet.tsx` / dashboard / `AgentCards.tsx` render headline and per-type sections.
- Record the role mapping as a project rule so it stays enforced; add the task to roadmap.md.
- Public ticker still shows only sanitized labels.
