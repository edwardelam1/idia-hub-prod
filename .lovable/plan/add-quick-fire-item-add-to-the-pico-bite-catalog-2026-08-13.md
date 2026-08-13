# Add "Quick Fire Item Add" to the Pico-Bite catalog

Adds one new canonical entry to the shared pico-bite catalog used by the App Builder's "Active Payload Settings" dialog, so it can be assigned to any nano-bite and shipped in the manifest.

## What gets added

A single catalog row in the pico-bite table:

- Name: Quick Fire Item Add
- Tag: `pico.input.quick_fire_add`
- Category: `input` (consistent with existing entry-style picos)
- UI component: `quick_fire_add`
- Default slot: `catalog`
- Active: yes, no gating policy

Once inserted it appears immediately in the dialog's "Add from full pico catalog" dropdown (searchable), raising the catalog count from 112 to 113.

## Relationship graph

Add `quick fire`, `fire item`, and `quick add` to the commerce keyword vocabulary in the pico relations seeder, and re-run it so the new pico is suggested on POS / order-entry / mobile-sale nano-bites instead of only being findable manually. Existing user assignments are unaffected — suggestions never auto-apply to the manifest.

## Technical notes

- Data change: one `INSERT` into `idia_pico_bites` (idempotent on tag).
- Edge function edit: keyword map in `supabase/functions/seed-pico-relations/index.ts`, then redeploy and invoke to rebuild `idia_nano_pico_relations`.
- No frontend changes required; the dialog reads the catalog live.
