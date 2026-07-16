## 1. Onboard the user (data change, no code)

Insert a `public.employees` row for `heggibear429@gmail.com` under **IDIA Data Inc.** (`df9d2157-e202-4623-b811-b094836d5eeb`):

- `user_id`: `f42515c7-5483-4be0-8899-e44c095bf4d5`
- `name`: "Heggi Bear" (placeholder — user can rename in edit dialog)
- `email`: heggibear429@gmail.com
- `role`: `manager`, `platform_role`: `team_lead`
- `status`: `active`
- `hire_date`: today

Also insert a `public.business_users` row (business_id + user_id, role `team_lead`, is_active true) so business-scoped access resolves through `get_user_business_access`.

## 2. Provisioning-code assignment — schema

Add two nullable columns to `public.device_provisioning_blueprints`:

- `assigned_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL`
- `assigned_at timestamptz`

Assignment rule (enforced in the assign RPC): only rows with `status='active'` AND `assigned_employee_id IS NULL` are eligible. Once applied, we set `assigned_employee_id` + `assigned_at` and leave status active. Employees can be reassigned by clearing.

New security-definer RPC `public.assign_provisioning_code(_employee_id uuid, _code text)`:
- Validates the code exists, is active, unassigned, and belongs to the same `business_id` as the employee.
- Stamps the assignment and returns the updated row.

## 3. Team Management UI — new "Apply Provision Code" action

In `src/components/modules/team/TeamMemberCard.tsx` (and the parent `TeamManagement.tsx` action menu), add a new action next to Edit/Toggle Status: **"Apply Provision Code"**.

Behavior:
- Opens a new dialog `ApplyProvisionCodeDialog.tsx`.
- Fetches `device_provisioning_blueprints` filtered by the member's `business_id`, `status='active'`, `assigned_employee_id IS NULL` — sorted newest first.
- Renders a Select of `{code} — {label}` options; shows an empty state with a link to the Provisioning code log when none are free.
- Submit calls `supabase.rpc('assign_provisioning_code', { _employee_id, _code })`.
- On success: toast "Provision code {code} applied to {name}" and refresh.

Also show the currently assigned code (if any) as a small badge on `TeamMemberCard` so admins can see who is provisioned. Provide an "Unassign" affordance in the same dialog when a code is already bound.

## 4. Out of scope (per your instruction)

- No self-generation of codes by the employee. Codes are only issued by admins via the existing Provisioning code log; this feature just binds an existing ACTIVE code to a team member.

## Technical notes

- `useTeamData` already reads `employees` scoped by `business_id`; the new columns are additive and won't break existing selects.
- The dialog reads blueprints directly with the anon client (RLS on `device_provisioning_blueprints` already restricts to business admins). The assign action goes through the RPC to keep the eligibility check server-side.
- Files touched:
  - migration: add columns + `assign_provisioning_code` function + grants
  - `src/components/modules/team/ApplyProvisionCodeDialog.tsx` (new)
  - `src/components/modules/team/TeamMemberCard.tsx` (add action button + badge)
  - `src/components/modules/TeamManagement.tsx` (wire dialog open state)
  - two `supabase--insert` calls for the employee + business_users rows
