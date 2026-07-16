# Fix: `hydrate-terminal` must surface the blueprint assignment

## What's actually broken

Pay now routes both pairing paths through `ProvisioningEngine.hydrateFromHub` → `hydrate-terminal`. Good. But that edge function reads **only** `idia_schema_manifest_vault`, which has no assignment columns. The assignment (`assigned_employee_id`, `assigned_at`) lives on `device_provisioning_blueprints` — a separate table that `hydrate-terminal` never touches.

Confirmed in DB: `IDIA-FRWD-NEUL` is `status=active`, `assigned_employee_id=b998343a…` (Cristina), `assigned_at=2026-07-16 01:32`. Pay can't see any of it because the edge function doesn't return it.

## Plan

### 1. Extend `supabase/functions/hydrate-terminal/index.ts`

After the successful vault lookup, do a second read (service-role) on `device_provisioning_blueprints` by `code = pairing_code`. If a row exists, resolve the employee's display name from `employees` (name/email). Merge into the response as:

```text
assignment: {
  employee_id, employee_name, employee_email,
  assigned_at, status
}
```

Also promote `status` to the top level so Pay can gate on it (`active` vs `inactive`).

Behaviour:
- No matching blueprint row → `assignment: null` (still returns manifest — unchanged behaviour for legacy codes).
- Blueprint row `status != 'active'` → still return payload, but include `status: 'inactive'` so Pay can reject.
- Employee lookup fails → return `assignment` with `employee_id` only, no name. Never fail the whole hydrate over a name resolution.

Logging additions: one line each for blueprint lookup start/end and employee resolution start/end, matching the existing `⚙️ [EDGE: hydrate-terminal]` style.

### 2. No DB migration

Both tables already exist with the needed columns. No schema change required.

### 3. Verify

- `curl` `hydrate-terminal` with `IDIA-FRWD-NEUL` → response contains `assignment.employee_name = "Cristina Heggison"` and `status = "active"`.
- `curl` with `IDIA-IJKX-ET0U` (your unassigned code) → response contains `assignment: null` and `status = "active"`.
- Re-pair Cristina's phone in IDIA Pay → no longer reports "unassigned".

## Files touched

- `supabase/functions/hydrate-terminal/index.ts` (only file)

## Out of scope

- Pay UI changes — you've already routed both paths through `hydrateFromHub`.
- Locking pairing to the assigned user. Assignment stays informational; hydrate still succeeds for anyone entering the code (matches your earlier direction).
