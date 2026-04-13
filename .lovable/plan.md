

# Fix: Align Database Constraint and Data to `individual` / `business`

## Problem

The database `profiles_account_type_check` constraint currently requires `'personal'` instead of `'individual'`, which conflicts with the app's TypeScript type `AccountType = "individual" | "business"` and the `handle_new_user` trigger (which inserts `'individual'`). Eddie's backfill row was inserted as `'personal'` to satisfy the old constraint.

## Changes

### 1. Database Migration (single SQL migration)

```sql
-- Drop the old constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;

-- Normalize any non-standard values to 'individual'
UPDATE public.profiles
SET account_type = 'individual'
WHERE account_type NOT IN ('individual', 'business') OR account_type IS NULL;

-- Re-apply with correct allowed values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_account_type_check
CHECK (account_type IN ('individual', 'business'));
```

This fixes Eddie's row (currently `'personal'` → `'individual'`) and ensures all future inserts — including the `handle_new_user` trigger — work correctly.

### 2. No Code Changes Needed

The app code is already correct:
- `AuthContext.tsx` defines `AccountType = "individual" | "business"`
- The `handle_new_user` DB function already inserts `'individual'`
- All UI components reference `isBusinessAccount` which checks against `"business"`
- No source files use `"personal"` as an account_type data value

