## Goal
Make the "Choose from N pico-bites…" dropdown in the Assign Pico-Bites dialog searchable.

## Change
Single file: `src/components/trading/NanoBitePicoDialog.tsx`

- Add a `picoQuery` state and a sticky search `Input` (with a magnifier icon) pinned at the top of the `SelectContent`, above the scrolling list.
- Filter `availablePicos` by case-insensitive match against both `name` and `tag`.
- Stop keystrokes from being swallowed by Radix Select's typeahead/close behavior (`onKeyDown` stopPropagation, `e.preventDefault()` on the content's auto-focus so the input keeps focus).
- Show "No pico-bites match '<query>'" when the filter empties the list; keep the existing "All pico-bites are already assigned" message when nothing is available at all.
- Reset the query when a pico is added or the dialog closes.

No changes to assignment logic, manifest generation, or the database.
