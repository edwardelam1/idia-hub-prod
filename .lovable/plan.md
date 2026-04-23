

## Plan: Apple logo + tighten Client Organizations + expand Manual Entry

### 1. Real Apple logo on Login (`src/components/LoginScreen.tsx`)
Replace the lucide `Apple` icon (cartoon apple) with the official Apple SVG logo glyph (the silhouette mark used by "Sign in with Apple"). Inline SVG with `fill="white"`, sized `h-4 w-4`, mirroring the `GoogleIcon` pattern already used in the file. Remove the `Apple` import from `lucide-react`.

### 2. Tighten `OrganizationManagement.tsx` — professional density pass
Global typographic and spacing reduction across the whole page. No layout/feature regressions.

| Area | From | To |
|------|------|----|
| Page H1 | `text-4xl font-extrabold` | `text-xl font-semibold` |
| Page subtitle | `text-lg` | `text-sm text-muted-foreground` |
| Add Organization button | `size="lg"` + `text-xl py-6 px-8` | `size="sm"` (default look, `gap-1.5`) |
| Pending verifications card title | `text-xl` icons `w-6` | `text-sm` icons `w-4` |
| Pending row company name | `text-lg` | `text-sm font-medium` |
| Pending "Process Application" button | `size="lg" text-base` | `size="sm"` |
| Registry list header label | `text-2xl font-bold` | `text-sm font-semibold uppercase tracking-wider` |
| Registry search input | `h-14 text-lg` | `h-9 text-sm` |
| Registry row name | `text-xl font-bold` | `text-sm font-semibold` |
| Registry row blueprint | `text-base` | `text-xs text-muted-foreground` |
| Registry row capability icons | `w-6 h-6` | `w-3.5 h-3.5` |
| Registry row padding | `p-6` | `p-3` |
| Detail card header company name | `text-4xl font-extrabold` | `text-xl font-semibold` |
| Detail card header icon tile | `p-5` w/ `h-12 w-12` icon | `p-2.5` w/ `h-5 w-5` icon |
| Edit/Save/Cancel buttons | `size="lg" text-lg` | `size="sm"` |
| Section headers | `text-lg` | `text-xs uppercase tracking-wider` |
| Field labels | `text-sm font-bold uppercase` | `text-xs uppercase text-muted-foreground` |
| Field values | `text-2xl` / `text-xl` | `text-sm` |
| Edit-mode inputs | `h-14 text-xl` | `h-9 text-sm` |
| Capability tiles | `p-6` `text-lg` icons `w-6` | `p-3` `text-sm` icons `w-4` |
| Modal title | `text-2xl` padding `px-8 py-6` | `text-base` padding `px-5 py-4` |
| Modal field labels | `text-lg font-bold` | `text-xs uppercase text-muted-foreground` |
| Modal inputs/selects | `h-14 text-xl` | `h-9 text-sm` |
| Modal footer buttons | `size="lg" text-xl py-6 px-8` | `size="sm"` |
| Empty-state icon | `w-24 h-24` | `w-12 h-12` |

Reduce `gap-*` and `space-y-*` proportionally (e.g., `gap-6` → `gap-3`, `space-y-6` → `space-y-4`, `p-8` card body → `p-5`).

### 3. Expand Manual Organization Entry form
Form schema (`formData`) adds:
- `addressLine1`, `addressLine2`, `city`, `state`, `zip` (replaces single `hqAddress`; kept compatible by concatenating into `address` on submit)
- `ein` (replaces `taxId` label as "EIN" — XX-XXXXXXX format)
- `entityType` enum: `C-Corp`, `S-Corp`, `LLC`, `LLP`, `Partnership`, `Sole Proprietorship`, `Non-Profit`, `B-Corp`, `Government`, `Other`
- Keep existing `businessType` (Blueprint Category) — they're different concepts (legal entity vs operational blueprint)

**USPS verification (no label):** After user fills street/city/state/zip and blurs the zip field, call USPS Address Validation. Since this is client-side and USPS API requires server credentials, add a thin Supabase Edge Function `usps-verify-address` that proxies USPS Web Tools API. UI shows a small inline state next to the address group: spinner while verifying, green check when standardized, red dot if invalid — no text label per request. The standardized address replaces the user-entered address on success. Submit is blocked if verification fails (toast on attempt).

EIN gets a regex mask (`\d{2}-\d{7}`) and inline format validation.

### 4. Delete Organization with confirmation
Add a destructive button in the detail card header (next to Edit Profile), `size="sm" variant="destructive"`, label "Delete". Clicking opens an `AlertDialog` (shadcn) titled **"Delete this organization?"** with body listing what will be removed (business record, locations, status flags), and a required typed-confirmation input: user must type the exact organization name to enable the red "Delete Permanently" button. On confirm:
1. `supabase.from('business_locations').delete().eq('business_id', id)`
2. `supabase.from('businesses').delete().eq('id', id)`
3. Clear `selectedBusiness`, refetch list, success toast.

### Files touched
- `src/components/LoginScreen.tsx` — Apple SVG swap
- `src/components/management/OrganizationManagement.tsx` — density pass, expanded form, delete dialog
- **New** `supabase/functions/usps-verify-address/index.ts` + `supabase/config.toml` entry — USPS proxy (uses `USPS_USER_ID` secret; will prompt to add it on first deploy)

### Notes
- USPS Web Tools requires a free `USERID`. After approval, I'll request the `USPS_USER_ID` secret via the secrets prompt.
- The `address` column in `businesses` stays a single string (concat of standardized parts) — no migration needed.
- `entityType` and `ein` go into existing `tax_id` (for EIN) and `business_type` is reserved for blueprint; entity type will be stored in a new `entity_type` column. I'll add a small migration: `alter table businesses add column entity_type text;`.

