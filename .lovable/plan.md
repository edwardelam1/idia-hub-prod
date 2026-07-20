## Root cause

The `NanoBitePicoDialog` and `generateBlueprintJSON` both read from `pico_bites` and `nano_pico_relations`. Neither table exists in the database (confirmed: only `taxonomy_nano_bites`, `nano_bite_executions` are present, no `idia_*` pico/relation tables). Every fetch 404s, which surfaces the "Failed to load pico-bite catalog" toast and forces the blueprint JSON to emit empty `picoBites: []`. IDIA Pay therefore hydrates a manifest with no pico atoms.

## Fix

### 1. Schema migration — create both tables with RLS + grants

- `public.idia_pico_bites`
  - `id uuid pk`, `tag text unique not null` (e.g. `pico.input.pin_pad`), `name text not null`, `description text`, `category text` (input / output / peripheral / logic / display / compliance / loyalty), `ui_component text` (e.g. `numpad`, `signature_pad`, `receipt_printer`), `gate_policy jsonb` (tier / permission gates), `default_slot text`, `is_active bool default true`, timestamps.
  - Grants: `SELECT` to `anon` + `authenticated`, full to `service_role`. Public read (catalog is not sensitive).
- `public.idia_nano_pico_relations`
  - `id uuid pk`, `nano_bite_id text not null` (matches `taxonomy_nano_bites.id`), `pico_bite_id uuid fk → pico_bites`, `relationship_weight numeric(4,3) not null` (0.000–1.000), `is_mandatory bool default false`, `slot text`, `source text default 'graph'`, timestamps.
  - Unique `(nano_bite_id, pico_bite_id, slot)`; index on `nano_bite_id`.
  - Grants + RLS mirror the pico table (public read, service-role write).

### 2. Seed the pico catalog (~110 entries)

Ship one migration/insert that populates `pico_bites` across categories:

- **Input**: pin_pad, numpad, signature_pad, barcode_scan, qr_scan, nfc_tap, mag_stripe, chip_insert, camera_capture, voice_command, weight_scale, id_scan…
- **Output / peripheral**: receipt_printer, kitchen_printer, cash_drawer, kds_route, label_printer, customer_display, buzzer, scale_display…
- **Display / UI**: item_grid, cart_pane, modifier_sheet, tip_selector, discount_prompt, split_check, table_map, ticket_ribbon, upsell_carousel…
- **Compliance / auth**: manager_override, age_verify, id_check, sig_capture, permit_gate, tax_holiday_flag, refund_reason…
- **Loyalty / payments**: loyalty_scan, gift_card_swipe, wallet_pay, ach_prompt, split_tender, currency_convert, tip_share_split…
- **Logic / ambient**: geo_fence, dwell_timer, session_lock, offline_queue, provenance_stamp…

### 3. Auto-generate `nano_pico_relations`

Write a one-shot Deno edge function `seed-pico-relations` (invoked once after deploy) that:

- Loads all 998 rows from `taxonomy_nano_bites` and all pico rows.
- For each nano-bite, tokenises `task`, `micro_element`, `value_chain_stage`, `industry_id` and matches against pico `tag` / `name` / `category` synonyms (small keyword dictionary in-function: e.g. `payment→pin_pad+chip_insert+tip_selector`, `inventory→barcode_scan+label_printer`, `kitchen→kds_route+kitchen_printer`, `age-restricted→age_verify+id_check`, `receipt→receipt_printer+customer_display`, etc.).
- Scores each candidate 0.30–0.95 based on match strength; top pick gets `is_mandatory=true` when the nano-bite is a payment/compliance atom.
- [NEVER USE UPSERTS] Upserts rows into `nano_pico_relations` (unique key on nano+pico+slot). Idempotent — safe to re-run. [FIX THIS]

### 4. Front-end hardening

- `NanoBitePicoDialog.tsx`: keep the toast for real failures but suppress it when the query simply returns zero rows (empty catalog is a valid state, not an error). Show an inline "No pico-bites yet" empty state.
- `PayAppBlueprint.generateBlueprintJSON`: already awaits the pico fetch — no logic change needed once the tables exist; the emitted `picoBites[]` will populate automatically. Confirm the loader in `handleLoadSchema` restores `bitePicoAssignments` (already done in Phase 3c).
- `hydrate-terminal` edge function: no change required — it forwards `schema_payload` verbatim, so once the JSON carries picos they arrive at the terminal.

### 5. Verify

- `supabase--read_query` counts: `pico_bites` ≥ 100, `nano_pico_relations` ≥ 2× nano-bite count.
- Open `/pay-blueprint`, tap gear on an active nano-bite → dialog lists "Suggested" chips + full catalog dropdown, no error toast.
- Deploy to device → inspect emitted manifest in `idia_schema_manifest_vault.schema_payload.nanoBites[].picoBites` for non-empty arrays.
- Re-hydrate a terminal with the pairing code and confirm pico atoms render in IDIA Pay.

## Technical notes

- Relations table stores `nano_bite_id` as `text` (not FK) because `taxonomy_nano_bites.id` is a slug string, not a uuid.
- Seed edge function uses `SERVICE_ROLE_KEY` and `verify_jwt = false`; invoke once from the browser after migration approval (button in `MCPConfigurator` dev panel, or a one-off `supabase.functions.invoke` from the console).
- Auto-relation heuristic is intentionally conservative (weights 0.30–0.95); operators still hand-tune via the dialog, and picks land as `source='user'` overriding graph rows.