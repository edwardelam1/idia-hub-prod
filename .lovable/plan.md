# Settings cleanup + live team integration

## 1. `src/pages/SettingsPage.tsx`
- Remove the `insights` `TabsTrigger` and `TabsContent` blocks.
- Drop unused imports: `SettingsInsights`, `BarChart3`.
- Rename tab label `Business Profile & Team` → `Business Profile & Team` (keep) but it now shares the same live roster as the sidebar **Team Management** page.

## 2. `src/components/settings/SettingsBusinessProfile.tsx` (full rewrite)
Eliminate ALL mock data. Replace with live Supabase-backed implementation:

**Business Profile card (live):**
- Resolve active business via `getBusinessId()` (same helper used by `TeamManagement`).
- Load `businesses` row: `name`, `tax_id`, `billing_wallet_address` (fallback to `address` field if column missing — verify schema first).
- Editable inputs save via `supabase.from('businesses').update(...).eq('id', businessId)`.
- Show loading / empty states; no hard-coded "Acme Corporation".

**Team Members section (live, shared source):**
- Render the existing live component `<TeamManagement />` from `@/components/teams/TeamManagement` directly below the Business Profile card.
- This guarantees the Settings tab and the sidebar `/teams` route show the **same** roster (same `employees` table, same realtime channel, same provisioning + revoke flows).
- Delete the local `MOCK_TEAM` array, the inline `<Table>`, and the mock invite `Dialog` — `TeamManagement` already provides ACA/NFC provisioning, ephemeral profiles, and revoke.

## 3. Optional cleanup
- If `SettingsInsights.tsx` is no longer referenced anywhere else, leave the file in place (safer for the 12h cutover) but stop importing it. We can delete in a follow-up.

## Technical notes
- `TeamManagement` heading says "Enterprise Team Management" with a large `h1`. When embedded inside the Settings tab we'll wrap it in a section with reduced top padding so it fits inside the tab card layout, but won't fork the component (single source of truth).
- Schema check before edit: confirm `businesses` columns `tax_id`, plus a wallet column. If wallet column doesn't exist, that field will be hidden rather than faked.
- No changes to `/teams` route or `AppSidebar`.

## Out of scope
- Renaming the sidebar entry, role/permission changes, or schema migrations.
