

## Plan: Delete dead/legacy Edge Functions only

User re-pasted the same list. Interpreting as: clean up the dead ones, keep the live Hub running. I'll remove only the obvious test/emergency/legacy/duplicate functions and **preserve every function that's part of the live pipeline** (synapse-controller, idia-synapse, execute-hub-query, best-friend-ai, voice-to-text, text-to-speech, anonymization-processor, process-staged-data, process-health-streams, process-business-data, process-lifestyle-data, fix-health-pipeline, recover-health-pipeline, life-pii-bridge, quote-bundle, cleanup-duplicate-bundles, force-bundle-update, run-bundle-cleanup, trigger-comprehensive-bundle-generation, trigger-pipeline-recovery, health-data-processor, withdraw-to-crypto, etc.).

### Functions to DELETE (codebase + Supabase)

Test / emergency / one-off / superseded:
- `comprehensive-pipeline-recovery`
- `create-comprehensive-health-test-data`
- `create-test-session`
- `emergency-payment-pipeline-repair`
- `emergency-pipeline-fix`
- `emergency-pipeline-restart`
- `pipeline-diagnostics`
- `pipeline-recovery`
- `process-backlog`
- `process-pending-events`
- `test-pipeline-e2e`
- `test-reward-pipeline`
- `test-security-system`
- `trigger-emergency-restart`
- `universal-data-bundler`
- `universal-data-processor`
- `virtuous-cycle-ai` (9 months old, unused)
- `health-data-bridge` (superseded by anonymization-processor / health-data-processor)
- `ingest-strava-data` (Strava ingestion handled inside the unified pipeline)
- `redeem-gift-card` (9 months old, no Hub references)
- `validate-proposal` (governance flow not active in Hub)

### Steps
1. Delete each directory under `supabase/functions/<name>/` from the codebase (auto-syncs to GitHub via the bidirectional sync).
2. Call `supabase--delete_edge_functions` with the 21 names above to undeploy them from Supabase.
3. Quick grep across `src/` and remaining `supabase/functions/` to flag any lingering references — if found, leave a note (no live UI calls these, so none expected).

### Files Modified
- Delete directories: 21 `supabase/functions/<name>/` folders listed above.

### Outcome
- 21 dead functions removed from Supabase + GitHub.
- Every live Hub function preserved — no breakage to AI search, Marketplace, voice, Synapse pipeline, billing, or bundle generation.
- If you want different scope (e.g. also drop `withdraw-to-crypto` or keep `ingest-strava-data`), tell me before approving and I'll adjust the list.

