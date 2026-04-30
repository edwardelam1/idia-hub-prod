# Restructure Client Organizations — Minimal Density Pass

The current page (`src/components/management/OrganizationManagement.tsx`) uses oversized typography (`text-4xl`, `text-2xl`, `text-xl`), oversized inputs/buttons (`h-14`, `size="lg"`, `py-6 px-8`), and heavy padding (`p-8`, `gap-10`). Goal: bring it down to a tight, professional information-density similar to a modern admin console (think Linear / Stripe dashboard) — without changing any logic, data flow, or features.

## Scope (visual/density only)

No changes to: data fetching, mutations, modal logic, edit/save flow, status logic, or routes. Strictly Tailwind class adjustments and a few minor structural tweaks for compactness.

## Changes

### 1. Page header
- `h1`: `text-4xl font-extrabold` → `text-xl font-semibold`
- Subtitle: `text-lg text-gray-500 mt-1` → `text-sm text-muted-foreground`
- "Add Organization" button: drop `size="lg"`, drop `text-xl py-6 px-8 rounded-xl shadow-lg`, use default size with `gap-2`, icon `h-4 w-4`. Keep indigo color.
- Outer container: `space-y-6 ... p-4` → `space-y-4 ... p-6`; keep `max-w-[1400px]` and the flex column / 100vh layout.

### 2. Add Organization dialog
- Title `text-2xl` → `text-base`, icon `w-6 h-6` → `w-4 h-4`
- Labels `text-lg font-bold` → `text-xs font-medium`
- Inputs / Select trigger `h-14 text-xl` → default height + `text-sm`
- Footer buttons: drop `size="lg" text-xl py-6 px-8`, use defaults
- Header/footer padding `px-8 py-6` → `px-6 py-4`; grid `gap-6` → `gap-4`

### 3. Pending Verifications strip
- Card title `text-xl font-bold` + `w-6 h-6` icon → `text-sm font-medium` + `w-4 h-4`
- Header padding `py-4 px-6` → `py-2 px-4`
- Badge `text-base px-3 py-1` → default small
- Row company name `text-lg font-bold` → `text-sm font-medium`; row padding `p-4` → `px-4 py-2`
- "Process Application" button: drop `size="lg" text-base`, default size, smaller label is fine
- Verification modal title `text-2xl` → `text-base`; body `text-lg` → `text-sm`; button drop `size="lg" text-lg`

### 4. Master list (left panel, 35%)
- "Registry List" `text-2xl font-bold` → `text-sm font-semibold uppercase tracking-wide text-muted-foreground`
- Count badge: smaller, default
- Search input `h-14 text-lg` + `h-5 w-5` icon → `h-9 text-sm` + `h-4 w-4` icon
- Container padding `p-5` → `p-3`
- Row button `p-6` → `px-3 py-2.5`; org name `text-xl font-bold` → `text-sm font-medium`; type `text-base font-medium ... mb-4` → `text-xs text-muted-foreground mb-1.5`
- Tier badge `text-sm px-2 py-1` → default `text-[10px]` style
- Status icons `w-6 h-6` → `w-3.5 h-3.5`, gap `gap-3` → `gap-2`
- Selected state: keep left border accent but slim it (`border-l-2`), drop `shadow-md`

### 5. Detail panel (right, 65%)
- Outer wrapper padding `p-8` → `p-4`; inner card `rounded-2xl shadow-lg` → `rounded-lg shadow-sm`
- Card header gradient block `p-8` → `px-5 py-4`; building icon container `p-5 rounded-2xl` + `h-12 w-12` icon → `p-2.5 rounded-md` + `h-5 w-5` icon; gap `gap-6` → `gap-3`
- Org name `text-4xl font-extrabold` → `text-lg font-semibold`; edit input `h-14 text-2xl` → default `h-9 text-sm`
- Header badges/meta `text-base` + `w-5 h-5` → `text-xs` + `w-3.5 h-3.5`; gap `mt-3` → `mt-1`
- Edit/Save/Cancel buttons: drop `size="lg" text-lg`, use `size="sm"`; icons `w-5 h-5` → `w-3.5 h-3.5`
- Body grid `p-8 ... gap-10` → `p-5 ... gap-6`; section spacing `space-y-6` / `space-y-5` → `space-y-4` / `space-y-3`
- Section headings `text-lg font-bold uppercase tracking-widest ... border-b-2 pb-2` → `text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5`
- Field labels `text-sm font-bold uppercase` → `text-xs font-medium text-muted-foreground` (no uppercase)
- Field values: `text-2xl font-bold` / `text-xl font-medium` → `text-sm font-medium` (mono fields keep `font-mono`)
- Read-only value top margin `mt-2` → `mt-1`
- Edit-mode inputs/selects: `h-14 text-xl` → `h-9 text-sm`; option items `text-lg` → `text-sm`
- Email/phone leading icons `w-6 h-6` → `w-3.5 h-3.5`
- Network Capabilities tiles: `p-6 rounded-xl border-2` → `p-3 rounded-md border`; tile label `text-lg font-bold` + `w-6 h-6` icon → `text-xs font-medium` + `w-3.5 h-3.5` icon; status icons (`getStatusIcon`) shrink from `w-6 h-6` → `w-4 h-4`; switch `scale-125` → default scale; grid `gap-6` → `gap-3`
- Empty state: icon `w-24 h-24` → `w-10 h-10`; text `text-xl font-medium` → `text-sm text-muted-foreground`

### 6. `getStatusIcon` helper
Update the three returns to `w-4 h-4` (single source so tiles + list inherit the smaller size). Verify the list rows use their own sizing locally so they remain consistent at `w-3.5 h-3.5`.

## Out of scope
- No color palette changes beyond removing heavy shadows/borders.
- No component library swaps.
- No copy changes.
- No changes to the dialog form fields, validation, or submission handlers.

## Files touched
- `src/components/management/OrganizationManagement.tsx` (only file)

## Acceptance
- All text on the page renders at standard admin-console sizes (≤ `text-sm` for body, `text-xs` for labels, single `text-lg` heading max).
- Buttons, inputs, and badges use shadcn defaults (no `size="lg"`, no `h-14`, no `text-xl/2xl/4xl`).
- Master list shows visibly more rows in the same viewport.
- All existing functionality (search, add, edit/save, pending review modal) continues to work unchanged.
