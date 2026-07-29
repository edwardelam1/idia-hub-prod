## What's actually happening

The Hub UI is fixed, but IDIA Pay doesn't read the UI — it reads the **persisted manifest** in the database. I checked both storage rows for `IDIA-FRWD-NEUL`:

- `device_provisioning_blueprints.payload` still contains, inside `modules.bundles[].nanoBites[].picoBites`, the old ghost entries (`hosp.ft.fleet.loc_lock`, `hosp.ft.pos.item_add`, `hosp.ft.inv.log_waste`, …) plus graph-sourced entries like `"source": "graph", "weight": 0.65`.
- `idia_schema_manifest_vault.schema_payload` (last written 2026-07-29 12:07 UTC) contains the exact same stale array.

The earlier cleanup only sanitized the `picoAssignments` map. It did **not** rewrite the already-emitted `picoBites` arrays inside the saved manifests, and no re-deploy has happened since the generator fix. So `hydrate-terminal` faithfully serves the old JSON.

## Plan

1. **Database cleanup (migration)** — for every row in `device_provisioning_blueprints` and `idia_schema_manifest_vault`, walk the manifest and rewrite each `nanoBites[].picoBites` array to keep only entries whose `id` is a UUID that exists in `idia_pico_bites` **and** whose `source` is `"user"`. Drop everything else (dotted legacy nano-bite IDs, `source: "graph"` bleed). This makes the persisted JSON match what the fixed generator would now emit.

2. **Enrich on emit** — the emitted picoBites currently ship `tag: null, name: null` even for valid UUIDs, which gives IDIA Pay nothing renderable. Fix `generateBlueprintJSON` in `src/components/trading/PayAppBlueprint.tsx` to populate `tag` and `name` from the pico catalog for every emitted entry, and backfill the same fields in the migration above.

3. **Deploy path must overwrite, not merge** — verify the save/send path writes the freshly generated manifest to *both* `device_provisioning_blueprints.payload` and `idia_schema_manifest_vault.schema_payload` with a full replace (upsert on the pairing code), and bump a `manifest_version` / `updated_at` so the terminal can tell the payload changed.

4. **Terminal cache** — the Pay terminal caches the blueprint under `idia_blueprint_v1` in localStorage (`ProvisioningEngine.loadCached`). Even with clean DB rows it will keep serving the old copy until re-hydrated. Add a version/`updated_at` field to the hydrate response and have the terminal discard its cache when the value differs, so a clean deploy propagates without a manual device wipe.

5. **Verify** — re-query both rows for `IDIA-FRWD-NEUL` and confirm `picoBites` is empty for bites with nothing assigned, and contains only named, user-selected UUIDs elsewhere. Then re-hydrate the terminal and confirm no KDS/graph picos appear.

## Technical notes

- Cleanup runs as one SQL migration using `jsonb_set` over the nested path plus a join against `idia_pico_bites` — no table or policy changes.
- Step 4 touches `supabase/functions/hydrate-terminal/index.ts` (add version to the response) and `src/lib/provisioning-engine.ts` (cache invalidation). If the Pay app lives in a separate project, I'll ship the Hub side and tell you the exact field the Pay client needs to check.
