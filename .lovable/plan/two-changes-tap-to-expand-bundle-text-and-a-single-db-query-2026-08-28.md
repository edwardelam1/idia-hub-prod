# Two changes: tap-to-expand bundle text, and a single DB-query contract for pico suggestions

## 1. Marketplace bundle text expands on tap

Today a bundle description is clamped to three lines and only expands through a separate "Show more" link, which is easy to miss and doesn't cover the title.

Change on the bundle card:

- Tapping anywhere on the description, the title, or the Key Insights block toggles the card between clamped and fully expanded — no separate link needed.
- The "Show more / Show less" text stays as a visible affordance, but it now reflects the same single toggle so both routes agree.
- When expanded, the description, the full title and every insight are shown in full with wrapping (no clamp, no ellipsis, no horizontal scroll on a phone).
- The tappable areas get proper button semantics (keyboard focus, aria-expanded) so the toggle is accessible, and tapping does not trigger the purchase or detail-sheet actions.
- Same behaviour inside the detail sheet: text is never clamped there.

No data, pricing or purchase logic changes.

## 2. Pico-Bite suggestions come from one database query

Verified current state: the app builder is already database-driven — `NanoBitePicoDialog.tsx` reads `idia_nano_pico_relations` for the nano-bite and `idia_pico_bites` for the catalog, and there is no keyword matching, regex scoring or heuristic guessing anywhere in the builder or in `PayAppBlueprint.tsx`. Two gaps remain against the stated contract:

- The dialog fires two separate queries and re-joins the pico rows in the client, then sorts by weight in the client.
- The ranking helper `getSuggestedPicosForNano` does not exist in `usePayBlueprintCatalog.ts`.

Work to do:

- Add an exported `getSuggestedPicosForNano(nanoBiteId)` to `src/hooks/usePayBlueprintCatalog.ts` that performs a single joined, server-ordered query against `idia_nano_pico_relations` with the embedded `idia_pico_bites` row, ordered by `relationship_weight` descending.
- Point `NanoBitePicoDialog.tsx` at that helper for the "Suggested by relationship graph" list, so the dialog renders the database result rows in the order the database returned them and does no client-side sorting or scoring. The separate full-catalog fetch stays, because the "Add from full pico catalog" picker must list every pico, related or not.
- Strength labels ("Strongest" / "Strong" / "Weak") stay as presentation of the returned `relationship_weight` only.

Column note: the relations table has no `config_override` column and `idia_pico_bites` has no `default_config` column — it has `default_slot`. The query will select the columns that actually exist (`relationship_weight`, `is_mandatory`, `slot`, plus pico `id`, `tag`, `name`, `description`, `category`, `ui_component`, `default_slot`, `gate_policy`). Adding `config_override` / `default_config` would need a migration; say the word and I'll include one.

## Technical notes

- `src/components/marketplace/BundleCard.tsx` — one `expanded` state drives title/description/insight clamping; clamp classes applied conditionally; wrapper elements become buttons with `aria-expanded`.
- `src/components/marketplace/BundleDetailSheet.tsx` — confirm no clamping.
- `src/hooks/usePayBlueprintCatalog.ts` — new exported async query function.
- `src/components/trading/NanoBitePicoDialog.tsx` — consume the helper; drop the client-side `.sort()`.
- Manifest emission in `PayAppBlueprint.tsx` is unchanged: it already resolves picos from live relations and ships only user-assigned entries.
