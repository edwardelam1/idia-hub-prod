# Fix "No manifest found for IDIA-FRWD-NEUL" + empty Load / empty Deploy

## What's actually broken

Two coupled bugs in `src/components/trading/PayAppBlueprint.tsx`:

### Bug 1 — `handleLoadSchema` (line 1211) restores an incomplete state

When a row is loaded from the Provision Code Log:

- Custom sub-modules are rebuilt from `payload.modules.custom` — but the saved shape (from `generateBlueprintJSON` → `itemizedSidebarManifest`) is `{ id, name, vertical }` (vertical = display *name*). The loader looks up `verticalCategories` by `m.parentId` (never present) then by `v.name === m.vertical`. When the vertical name doesn't match exactly (canonical id vs display name mismatch after the 2b sanitization step overwrote `vertical` to `verticalId` on bundles), `parentId`/`parentName`/`icon`/`color` come back `undefined`, so the module renders but has no parent → doesn't appear in the vertical drawer and downstream `generateBlueprintJSON` treats it as unmapped.
- `setSelectedSubModules(new Set())` wipes the sub-module selection, so the "Add Selected" UI is empty and re-deploy from the loaded row generates an empty manifest.
- `p.taxonomy.nanoBites` is copied into `selectedNanoBiteIds`, but `industryId` is not restored, so the Nano-Bite panel (which filters by `expandedVertical` → industry) shows nothing until the user re-clicks a vertical.
- No mirror to `idia_schema_manifest_vault`, so the terminal calling `hydrate-terminal` for `IDIA-FRWD-NEUL` gets "Failed to locate blueprint" — surfaced to the user as **"No manifest found for IDIA-FRWD-NEUL"**.

### Bug 2 — Deploy runs against the emptied state

Because Bug 1 leaves `selectedModules` half-hydrated and `selectedNanoBiteIds` disconnected from the UI, "Deploy to Device" calls `generateBlueprintJSON()` which emits `bundles: []` / `remedyRequiredNodes: [...]` and upserts an empty payload. Terminals then see either nothing or a manifest with no nano-bites.

## Fix

Edit only `src/components/trading/PayAppBlueprint.tsx`.

1. **Rewrite `handleLoadSchema` to fully hydrate state from the payload**:
   - Resolve each custom module's vertical by trying, in order: `m.parentId`, `verticalCategories.find(v => v.id === m.vertical)` (canonical id), then `v.name === m.vertical` (legacy display name). Fall back to keeping the raw values so nothing silently disappears.
   - Rebuild `selectedSubModules` as the `Set` of custom module IDs so the drawer reflects the loaded blueprint.
   - Restore `selectedNanoBiteIds` **and** `industryId` on the taxonomy classification (from `p.taxonomy.industryId` when present, else derive from the first mapped custom module via `getRoute(...).industryId`).
   - Re-open the first vertical that has selected modules by calling `setExpandedVertical(firstVerticalId)` so the Nano-Bite panel is populated immediately.
   - After state restore, call `mirrorToManifestVault(row.code, row.payload)` so terminals hydrating the same code can locate the manifest even if the user only loaded (didn't re-deploy).

2. **Guard `handleSendToDevice`** with a pre-flight: if `generateBlueprintJSON()` returns `bundles.length === 0`, show a toast ("Blueprint is empty — add sub-modules or nano-bites before deploying") and abort the upsert. Prevents overwriting a good vault payload with an empty one.

3. **No schema/RLS/migration changes.** No changes to `hydrate-terminal`, edge functions, or any other file.

## Verification

- Load `IDIA-FRWD-NEUL` → custom sub-modules reappear inside their vertical drawers, nano-bite chips are pre-selected, expanded vertical shows the correct industry bites.
- Immediately click **Deploy to Device** → `device_provisioning_blueprints` and `idia_schema_manifest_vault` both receive a non-empty payload (verified via a `supabase.from(...).select('payload').eq('pairing_code','IDIA-FRWD-NEUL')` read after deploy).
- Terminal boot against `IDIA-FRWD-NEUL` → `hydrate-terminal` returns 200 with `businessId` + populated `payload`; the "No manifest found" toast is gone.
