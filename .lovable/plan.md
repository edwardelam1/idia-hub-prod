## Plan

Force-deploy `synapse-controller` so the raw-fetch handoff goes live, then verify the version increments past 183 before declaring the EarlyDrop neutralized.

### Steps
1. Call `supabase--deploy_edge_functions` for `synapse-controller` to push the current `index.ts` (raw fetch + `Connection: close` + `await response.text()`) to the gateway.
2. Pull the latest `function_edge_logs` for `synapse-controller` and confirm `m.version >= 184` on a fresh invocation.
3. Once version 184+ is confirmed, ask you to fire a manual test purchase.
4. After the test, tail logs for both functions and confirm the new handoff sequence:
   - `[HANDOFF: settlement] raw-fetch initiated …`
   - `[HANDOFF: settlement] ACCEPTED … elapsed_ms=<small>`
   - child `[ACCEPTED] circular-settlement queued runId=…` followed by the full Planck trace to `[COMPLETE: circular-settlement]`
   - no `EarlyDrop @ ~214ms` signature on the parent

### Notes
- No code edits in this pass — the patch is already in `supabase/functions/synapse-controller/index.ts`.
- If version still reports 183 after deploy, re-deploy and inspect the deploy response for build errors before retesting.
- If version bumps but EarlyDrop persists, the next move is the Postgres → pg_net webhook queue architecture (insert into `settlement_queue`, let Postgres fire the child) — not more isolate-to-isolate retries.
