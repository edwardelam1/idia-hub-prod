# LIDD Intake — Align to Cryptographic Key Auth

Most of this directive is already live. Verified against the project right now:

- The buyer profile fields (`buyer_role`, `buyer_jurisdiction`, `buyer_latency`, `buyer_weights`, the four `diagnostic_*` fields) already exist on `profiles`.
- `lidd_extraction_events` already exists with $2.50 default cost, unpaid status, and the extractor-only / service-role access rules.
- The intake gateway already hashes the presented key with SHA-256, looks it up in `api_keys`, and derives the extractor from the stored record.
- The Utilities tab already shows the unpaid balance, settles through the standard checkout, and issues franchise keys.

So Phase 1 needs no migration. The remaining work is tightening the gateway and correcting the integration instructions.

## Gateway hardening

`surveillance-api-intake`:

- Restrict the key lookup to `environment = 'lidd'`, so a mesh node key can never stage utility debt.
- Treat `extractor_id` in the body as optional and ignored; identity comes only from the key hash. A mismatched value still returns a clear rejection.
- Keep the Wix Identity Vault call on `WIX_SECURE_API_KEY` — the credential already saved and working for this vault.
- Keep the existing per-phase `[PHASE_START]` / `[PHASE_END]` logging and full error + stack logging in every catch; add the same bracketing to the new environment check.
- Key-only authentication stays: no bearer token required.

`issue-extractor-key` is not touched, per the boundaries.

## Utilities tab corrections

Today's panel keeps all of its current behaviour — key history, revoke, delete, custom label, and the one-time key popup. Only the developer instructions change:

- Drop `extractor_id` from the JSON payload example; the body is just `{ "infractions": [ { "license_plate", "timestamp" } ] }`.
- Add a short note that identity is resolved from the key's cryptographic hash, so nothing identifying goes in the body.
- Headers stay `x-api-key` plus `Content-Type` only.
- The ready-to-run example is regenerated from the corrected payload.

## Technical notes

- Files: `supabase/functions/surveillance-api-intake/index.ts`, `src/components/marketplace/utilities/UtilitiesIngestionPanel.tsx`.
- No database migration required — schema verified as already matching the directive.
- `surveillance-api-intake` is already registered with JWT verification off in `supabase/config.toml`; it will be redeployed after the change.
