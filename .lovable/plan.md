
## Goal

Reorganize the Marketplace into a 3-tile panel ("SQL Terminal", "AI Bundles", "The Vulture") and ship "The Vulture" — a quarantine → sanitize → rehabilitate ingestion pipeline — to production with extreme telemetry.

## Part 1 — Marketplace Tile Panel

Refactor `src/components/marketplace/DataMarketplace.tsx`:

- Replace the two stacked "Tool ·" sections with a tile-selector panel showing three cards: **SQL Terminal**, **AI Bundles**, **The Vulture** (admin-only).
- Active tile drives a single content frame below:
  - `SQL Terminal` → existing `<MarketplaceTerminal />`
  - `AI Bundles` → existing filters + `ResultsHeader` + `BundleCard` grid + privacy/pricing notices
  - `The Vulture` → new admin-gated `<VultureIngestionPanel />` (uploader + ledger table)
- Tile state is local (`useState`), default `AI Bundles`. Header + ShoppingCart stay above the tiles.
- The Vulture tile is hidden unless `userRole === 'admin'`.

## Part 2 — The Vulture: Database, Vault, Storage

Single migration creating:

**Storage buckets**
- `idia-data-quarantine-prod` (private)
- `rehabilitated-manifests` (private)

**RLS on `storage.objects` for quarantine bucket**
- `INSERT` allowed for `authenticated` admins
- `SELECT` allowed for `authenticated` admins + `service_role`
- `UPDATE` / `DELETE` policies explicitly absent + a `BEFORE UPDATE OR DELETE` trigger on `storage.objects` filtered to bucket `idia-data-quarantine-prod` that raises an exception (immutable airlock). Trigger lives in `public` schema, attached via `CREATE TRIGGER` on `storage.objects` (permitted op).
- `rehabilitated-manifests`: INSERT/SELECT for service_role + admin SELECT.

**Table `public.vulture_provenance_ledger`**
Columns: `id uuid pk`, `original_file_name text`, `record_count int`, `action text`, `status text` (`success|failed|processing`), `error_message text`, `original_hash text`, `sanitized_hash text`, `manifest_path text`, `created_at timestamptz default now()`.
GRANTs: `SELECT` to authenticated; `ALL` to service_role.
RLS: append-only — INSERT for service_role only; SELECT for admins via `has_role(auth.uid(),'admin')`; no UPDATE/DELETE policies.

**Vault secret**
Insert `vulture_hash_salt` into `vault.secrets` via `vault.create_secret(...)`, expose `public.get_vulture_salt()` SECURITY DEFINER restricted to service_role.

**Webhook trigger**
`AFTER INSERT ON storage.objects` (filtered to bucket_id = 'idia-data-quarantine-prod') → `pg_net` HTTP POST to the `vulture-sanitization-agent` edge function with `{ bucket, name }`. Function URL + service-role key pulled from `vault`.

## Part 3 — Edge Function `vulture-sanitization-agent`

New `supabase/functions/vulture-sanitization-agent/index.ts` (verify_jwt = false; called by webhook with shared secret header).

Flow, each step wrapped in `[BEGIN:…]` / `[END:…]` console logs, every catch logs `[BEGIN: Vulture.<Step>.Stall]` then returns 500 (4xx for bad input):

1. `Vulture.WebhookAuth` — validate shared-secret header → 400 if missing.
2. `Vulture.VaultAccess` — RPC `get_vulture_salt`.
3. `Vulture.StorageDownload` — stream object from `idia-data-quarantine-prod`.
4. `Vulture.HashOriginal` — SHA-256 of raw bytes.
5. `Vulture.StreamParse` — detect `.csv` / `.json`, stream-parse rows.
6. `Vulture.PIIStrip` — SHA-256(salt + value) for ssn/name/email fields.
7. `Vulture.TemporalReconstruct` — infer/inject timestamps from sequential IDs or metadata.
8. `Vulture.StatusTag` — set `origin_status: 'ACQUIRED_REHABILITATED'`.
9. `Vulture.BatchInsert` — insert to `staged_business_data` in chunks (500/batch).
10. `Vulture.HashSanitized` — SHA-256 of canonicalized cleaned payload.
11. `Vulture.ManifestUpload` — C2PA-style JSON manifest → `rehabilitated-manifests`.
12. `Vulture.LedgerInsert` — write success row to `vulture_provenance_ledger`.

On any failure: write a `failed` ledger row with `error_message`, log `Vulture.<Step>.Stall`, return 500.

Secrets needed (via `add_secret`): `VULTURE_WEBHOOK_SECRET`. `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` already injected.

## Part 4 — UI: Vulture Ingestion Panel

New files:
- `src/components/marketplace/vulture/VultureIngestionPanel.tsx` — container, admin guard.
- `src/components/marketplace/vulture/VultureUploader.tsx` — drag-and-drop (react-dropzone already in stack or native HTML5), uploads via `supabase.storage.from('idia-data-quarantine-prod').upload(...)`, telemetry logs `[BEGIN: VultureUI.Upload]` / `[END: VultureUI.Upload]` / `[BEGIN: VultureUI.Upload.Stall]`.
- `src/components/marketplace/vulture/VultureLedgerTable.tsx` — initial `select * from vulture_provenance_ledger order by created_at desc limit 100` + Supabase realtime subscription on inserts. Shows file name, record count, status badge, hashes, manifest link.

Hook `useVultureLedger` encapsulates fetch + realtime channel.

## Telemetry Standard (mandatory)

Every network boundary, DB call, parse step, and `catch` block in the edge function and Vulture UI uses:
- `console.info('[BEGIN: Module.Action]', context)`
- `console.info('[END: Module.Action]', result)`
- `console.error('[BEGIN: Module.Action.Stall]', err)` inside catch before re-throw/response.

Examples used: `Vulture.VaultAccess`, `Vulture.StorageDownload`, `Vulture.StreamParse`, `Vulture.PIIStrip`, `Vulture.BatchInsert`, `Vulture.LedgerInsert`, `VultureUI.Upload`, `VultureUI.LedgerFetch`, `VultureUI.RealtimeSubscribe`.

## Files Touched

- `src/components/marketplace/DataMarketplace.tsx` (refactor to tiles)
- `src/components/marketplace/vulture/VultureIngestionPanel.tsx` (new)
- `src/components/marketplace/vulture/VultureUploader.tsx` (new)
- `src/components/marketplace/vulture/VultureLedgerTable.tsx` (new)
- `src/hooks/useVultureLedger.tsx` (new)
- `supabase/functions/vulture-sanitization-agent/index.ts` (new)
- `supabase/config.toml` (register function, `verify_jwt = false`)
- One new migration for buckets, RLS, immutability trigger, ledger table, vault salt, webhook.

## Open Items / Confirmations

- Confirm admin gate uses existing `has_role(auth.uid(),'admin')` (per project memory).
- Confirm `staged_business_data` is the correct target staging table for rehabilitated business records.
- I'll request `VULTURE_WEBHOOK_SECRET` via `add_secret` at build time.
