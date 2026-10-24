# Make each security alert specific and readable

## The problem
When one thing happens (for example, a new admin role), Gatekeeper, Guardian and Insight all react to it. Today they get nearly the same instructions and return the same summary, findings and steps, so the reports look identical. Titles like "Incident explained" or "Incident triage" describe what the agent did, not what happened.

## What changes for you

**1. Titles say what happened, not the agent's job**
Each alert gets a title built from its actual cause. Examples:

| Today | After |
|---|---|
| Incident explained | New admin role granted: what it means |
| Incident triage | 1 open alert needs review: new admin role |
| Threat forecast | Serious alerts rising: 3 today vs 0 yesterday |
| Privilege change | Admin role given to an account |
| Sweep clear | All clear: 412 requests checked, none failed |
| Error spike | 24% of requests failing on /synapse |
| Data export surge | One account made 31 exports in 30 min |
| AI manipulation attempt | 2 messages tried to override Best Friend AI |

The agent name and its job stay as a small tag under the title.

**2. Each agent writes its own kind of report**
- **Gatekeeper / Sentinel / Shield / Hunter / Mirror (detectors):** "What we saw" plus the evidence numbers.
- **Guardian (triage):** a ranked list of the open alerts with "Fix first", "Then", and who should act. No repeated summary.
- **Insight (explainer):** three short parts: "What happened", "Why it matters", "What to do", written for a non-technical reader.
- **Oracle (forecast):** the trend, what it expects in the next day, and how sure it is.

Each report also links to the original alert it is reacting to, so you can tap from Insight's explanation straight to Gatekeeper's evidence.

**3. Older alerts get better titles too**
Alerts already recorded are retitled on screen from the numbers they hold, so the whole list reads consistently without changing stored history.

## Technical details
- `crazy-8-security`: give each agent its own JSON response shape and system prompt (detector / triage / explainer / forecast); have the model return a short `headline`; pass Guardian and Insight the source event ids and types so their output references them; store `headline` and `source_event_ids` in `result_data`. Redeploy.
- `securityGlossary.ts`: add `eventHeadline(event)` that prefers the stored `headline`, otherwise builds one from the signals per event type (for old rows); keep the current title as the agent tag.
- `SecurityEventSheet.tsx` and `CrazyFriendSecurityDashboard.tsx`: show headline as the title, render each report type with its own sections, add "Caused by" links to source events.
- Public ticker keeps showing only sanitized labels (no change to what outsiders see).
- Run one sweep afterwards to confirm the reports differ.
