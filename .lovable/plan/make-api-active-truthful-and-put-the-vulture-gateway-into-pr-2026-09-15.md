# Make "API Active" truthful and put the Vulture gateway into production

Two things in the Marketplace are currently theatre. This replaces both with real, working plumbing.

## 1. "API Active" badge (Utilities tab)

Today the badge is hardcoded text — it says "API Active" even when the operator has never issued a key or sent a single record.

It becomes a live status derived from real data:

- **No Keys** (grey) — the operator has no active franchise key.
- **Awaiting First Call** (amber) — a key exists but has never been used.
- **API Active** (green) — a key has been used; the badge shows when the last call arrived ("last call 4m ago").
- **Checking…** while the key list and last-call time load.

Source of truth: the operator's own franchise keys (active status, last-used time) and the most recent staged extraction event. No hardcoded state.

## 2. Vulture Mesh Gateway — from simulation to production

Today the panel fabricates fake sightings, telemetry and alerts on a timer in the browser, hashes them locally, and the "authorize gateway" button just waits 800ms and writes a pretend approval line. Nothing reaches the backend. This also breaks the project's rule against synthetic data.

The whole simulated generator is removed and replaced with the real path that already exists on the backend:

**a. Real file ingestion.** The panel becomes a genuine uploader: drag or choose a `.json`, `.csv`, `.bin` or `.lora` capture file, it is uploaded into the secure quarantine bucket, and the sanitization agent is invoked on it. That agent (already live) strips identifying fields, reconstructs timestamps, tags records `ACQUIRED_REHABILITATED`, writes them to the mesh telemetry store, publishes a provenance manifest and records the result in the provenance ledger. Per-file progress, record counts and failures are shown from the real response — the ledger table below already streams live rows, so results appear automatically.

**b. Real gateway authorization for edge nodes.** Autonomous nodes need a door. A new authenticated ingest endpoint accepts mesh payloads over HTTP, authenticated with a franchise-style key (same key issuing/revocation machinery as the LIDD keys, in a `mesh` environment). It refuses everything when the gateway is closed.

The gateway switch becomes real: its open/closed state is stored server-side, so flipping it in the UI actually opens or seals the ingest endpoint, and the state survives reloads and is the same for every operator. Each transition is written to the provenance ledger as a real authorization event, not a UI-only line.

**c. Integration details for node operators.** The Vulture panel gets the same treatment the Utilities tab already has: endpoint URL, method, required headers, payload schema, a ready-to-run example, and key issue/revoke/delete — each with a copy button.

## Technical notes

- `UtilitiesIngestionPanel.tsx`: badge state computed from `keys` (active + `last_used_at`) plus a `lidd_extraction_events` max `extraction_timestamp` query; loading and empty states included.
- `VultureUploader.tsx`: delete `setInterval` generator, `decodeLoRaPayload`, and all synthetic payload builders. Upload via `supabase.storage.from("idia-data-quarantine-prod").upload(...)`, then `supabase.functions.invoke("vulture-sanitization-agent", { body: { bucket, name, created_at } })`; render `{ records, originalHash, sanitizedHash }` from the response.
- New table `public.mesh_gateway_state` (single row: `is_open`, `updated_at`, `updated_by`) with RLS: read for authenticated, write restricted to admin/csuite via existing role checks; service role full access. Requires a migration you approve.
- New edge function `mesh-telemetry-intake`: CORS preflight, `x-api-key` SHA-256 lookup against `api_keys` (`environment = 'mesh'`, `status = 'active'`), gateway-state check (503 when sealed), payload validation, PII strip with the vault salt, insert into `mesh_telemetry_events`, ledger row, `last_used_at` stamp. Full `[PHASE_START]`/`[PHASE_END]` bracketing and stack traces in every catch, per the logging mandate.
- `issue-extractor-key` extended with an `environment` argument so mesh keys reuse the existing create/list/revoke/delete flow.
- Bucket `idia-data-quarantine-prod` and `rehabilitated-manifests` already exist; the sanitization agent, `mesh_telemetry_events` and `vulture_provenance_ledger` are already live. Ledger is currently empty because nothing has ever reached it.
