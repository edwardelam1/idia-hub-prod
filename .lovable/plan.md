## Plan

Replace the `adminClient.functions.invoke("idia-circular-settlement")` handoff in `supabase/functions/synapse-controller/index.ts` with a direct `fetch()` to the function URL, then fully consume the response body before the parent finishes.

### Changes
1. Build a dedicated `payoutData` object once in `synapse-controller` and use it for the settlement handoff.
2. Remove the current `functions.invoke` + `EdgeRuntime.waitUntil(...)` handoff path entirely.
3. Add a raw `fetch(`${SUPABASE_URL}/functions/v1/idia-circular-settlement`, ...)` handoff with:
   - `method: "POST"`
   - JSON body
   - explicit `Connection: "close"`
   - explicit auth headers for edge-to-edge invocation
4. Immediately `await response.text()` to fully drain the child’s 202 response and force graceful socket closure before the parent isolate exits.
5. Keep `[HANDOFF: settlement]` correlation logs, but update them to reflect the raw fetch lifecycle:
   - initiated
   - accepted / non-2xx failure
   - network failure
   - egress link success/failure
6. Only update `egress_logs.synapse_ledger_entry_id` after the handoff returns an accepted response; leave orphaned rows unlinked on failure for audit, exactly as requested.
7. Keep the parent response contract intact (`success`, `reference_id`, `settlement_status: "queued"`) so the frontend behavior does not regress.

### Technical details
- Use the project’s established edge-to-edge raw fetch pattern for auth headers (`Authorization` + `apikey`) so the request clears the Supabase gateway reliably.
- Preserve `idia-circular-settlement`’s existing fire-and-forget design; no changes are needed to its `EdgeRuntime.waitUntil(executeSettlement(...))` block unless logs expose a second issue afterward.
- Do not change frontend code in this pass; the current UI already awaits `synapse-controller`.
- Do not add tables or migrations in this pass.

### Validation
- Confirm `synapse-controller` no longer references `functions.invoke("idia-circular-settlement")`.
- Verify logs show the new handoff sequence and that the child reaches its `[ACCEPTED] circular-settlement queued` line without the previous 214ms EarlyDrop signature.
- If the handoff clears but settlement still dies later, the next step is the queue/webhook architecture you outlined, not more isolate-to-isolate retries.