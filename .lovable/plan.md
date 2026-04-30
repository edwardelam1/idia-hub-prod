
# Finish: Granular Address in Card + Red Deactivate Button

The DB already has `street_address_1`, `street_address_2`, `city`, `state`, `postal_code`, `country`, `provisioning_active`, and `deactivated_at`. The Add Organization dialog already writes to them. The detail card on the right side of `/organizations` was never updated — it still shows/edits a single `address` string and has no Deactivate control.

All changes are in **`src/components/management/OrganizationManagement.tsx`** only.

## 1. Detail card — replace single HQ Address with granular block

Inside the "Operational Profile" column (currently lines ~744–759), replace the single HQ Address field with a stacked group of labeled rows that mirror the Add dialog:

- Street Address 1
- Street Address 2 (only shown in display mode if present; always shown in edit mode)
- City  /  State  /  ZIP (3-col grid, same as the dialog)

Display mode: render each value as the existing dense `text-xs font-medium text-slate-900` rows. If `street_address_1` is empty, fall back to parsing `selectedBusiness.address` so legacy rows still show something.

Edit mode: render `Input`s bound to `editForm.street_address_1`, `editForm.street_address_2`, `editForm.city`, `editForm.state` (uppercase, maxLength 2), `editForm.postal_code` — same `h-8 text-xs` styling already used in the card.

The header MapPin preview (line 652) keeps using `selectedBusiness.address?.split(",")[0]` as today, but we recompute `address` on save (see below) so it stays in sync.

## 2. `handleUpdateBusiness` — persist granular fields

Update the `supabase.from("businesses").update({...})` payload to include:

```ts
street_address_1: editForm.street_address_1,
street_address_2: editForm.street_address_2 || null,
city: editForm.city,
state: editForm.state,
postal_code: editForm.postal_code,
```

And recompose the legacy `address` string the same way `handleCreateBusiness` does, so list rows / header preview stay consistent:

```ts
const composedAddress = [
  editForm.street_address_1,
  editForm.street_address_2,
  `${editForm.city ?? ""}, ${editForm.state ?? ""} ${editForm.postal_code ?? ""}`.trim(),
].filter(Boolean).join(", ");
```

Send `address: composedAddress` in the same update.

## 3. Red Deactivate button (header, left of Edit)

In the action cluster (lines 659–692), when **not** in edit mode, render a Deactivate / Reactivate button immediately **before** the Edit button:

- If `selectedBusiness.provisioning_active !== false` → label "Deactivate", `bg-red-600 hover:bg-red-700 text-white`, `size="sm"`, `h-7 px-2 text-xs`.
- If already deactivated → label "Reactivate", same size but `bg-emerald-600 hover:bg-emerald-700`.
- Hidden while `isEditingCard` is true (matches Edit visibility rules).

Add a `handleToggleProvisioning` handler:

```ts
const handleToggleProvisioning = async () => {
  const next = !(selectedBusiness.provisioning_active !== false);
  const { error } = await supabase
    .from("businesses")
    .update({
      provisioning_active: next,
      deactivated_at: next ? null : new Date().toISOString(),
    })
    .eq("id", selectedBusiness.id);
  if (error) {
    toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    return;
  }
  toast({
    title: next ? "Provisioning Restored" : "Provisioning Deactivated",
    description: next
      ? `${selectedBusiness.name} has been re-enabled for IDIA Pay.`
      : `${selectedBusiness.name} can no longer access IDIA Pay.`,
  });
  fetchBusinesses();
};
```

Wrap the destructive action in a small `confirm()` ("Cut off this organization from IDIA Pay?") before calling — single confirm, no extra dialog component needed.

## 4. Visual signal for deactivated rows (light touch)

In the left-side Registry list row, when `org.provisioning_active === false`, append a small `bg-red-100 text-red-700` "Suspended" pill next to the tier badge so deactivated orgs are scannable. No layout changes.

## Out of scope

- No DB migration (already done).
- No changes to the Add Organization dialog.
- No changes to pending verification flow, search, taxonomy, or RLS.

## Acceptance

- Editing a card shows discrete inputs for Street 1, Street 2, City, State, ZIP — saving writes them all and the composed `address`.
- A bright red **Deactivate** button sits to the **left** of **Edit** in the card header. Tapping it (after confirm) flips `provisioning_active` to false, sets `deactivated_at`, toasts the user, and the button flips to a green **Reactivate**.
- Deactivated orgs show a "Suspended" pill in the left list.
- No regressions to Add Organization, pending verifications, or list filtering.
