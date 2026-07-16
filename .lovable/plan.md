## Goal
Make Pay's deep-search find Cristina's identity inside the hydrate-terminal response by embedding assignment fields with the exact key names Pay looks for (`assigned_employee_id`, `assigned_employee_name`, `assigned_employee_email`) directly into `schema_payload`.

## Current State
`hydrate-terminal` already returns:
- `status` (top-level)
- `assignment: { employee_id, employee_name, employee_email, assigned_at, status }` (top-level AND nested in `payload.assignment`)

Pay's team reports its deep-search scans for `assigned_employee_id` / `assigned_employee_name`-style keys — the nested `assignment.employee_*` shape isn't matching.

## Change
Edit `supabase/functions/hydrate-terminal/index.ts` only. In the response `payload` object, add flat aliases alongside the existing `assignment` object:

```text
payload: {
  ...schema_payload,
  businessId,
  assignment,                            // keep (nested, existing)
  assigned_employee_id,                  // NEW flat alias
  assigned_employee_name,                // NEW flat alias
  assigned_employee_email,               // NEW flat alias
  assigned_at,                           // NEW flat alias
  assignment_status,                     // NEW flat alias (blueprint status)
}
```

All values come from the already-resolved `assignment` variable — no new DB calls, no schema changes. When unassigned, these fields are `null`.

Also mirror the same flat fields at the top level of the response (next to existing `status` + `assignment`) so consumers that don't unwrap `payload` still find them.

## Verification
- `curl` hydrate-terminal with `IDIA-FRWD-NEUL` → response contains `payload.assigned_employee_name = "Cristina Heggison"` and `payload.assigned_employee_id` set.
- `curl` with an unassigned code → those fields are `null`, hydrate still succeeds.
- Re-pair Cristina's phone in Pay → deep-search resolves her identity.

## Out of Scope
- Hub UI, DB schema, Pay codebase.
- Any behavioral change to hydration success/failure — assignment stays informational.