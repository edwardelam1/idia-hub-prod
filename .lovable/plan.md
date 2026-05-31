## Plan

### 1. Fix the empty Notifications Center

**Diagnosis**: `hub_notifications` table is wired correctly (read hook, realtime subscription, bell UI all work), but the table has 0 rows because **nothing in the app actually inserts notifications**. `recordHubNotification()` exists in `src/lib/hub-notifications.ts` but is never called.

**Fix**: Wire notification producers to the events that already drive toasts/realtime updates so the bell stops being empty.

- Add a small global subscriber component (mounted once inside `AppLayout`) that listens to the same Postgres realtime channels already used in `SystemHealthDashboard` and `ProvenanceAuditLog`, and for the current user inserts a row into `hub_notifications` for:
  - **Egress / Liability Shield events** (`egress_logs` INSERT scoped to `user_id`) → category `shield`, severity `success`, title "Liability Shield minted", body = truncated token hash, link `/trading` (Provenance tab).
  - **Synapse credit movements** (`synapse_credit_ledger` INSERT scoped to `user_id`) → category `credits`, severity `info` for `PURCHASE`/`ROYALTY`, `warning` for `USAGE`, title/body from `description` + amount.
  - **Settlement queue completions** (`settlement_queue` UPDATE where `status='completed'` and `payload.user_id = current user`) → category `settlement`, severity `success`.
- Add a tiny helper `notifyAndToast(...)` in `src/lib/hub-notifications.ts` that fires a `sonner` toast AND inserts the notification row, then swap the existing toast calls inside `PayAppBlueprint.tsx` (blueprint created, generation errors) over to it so user-driven actions also show up in the bell.
- No schema change, no new tables. RLS on `hub_notifications` is assumed already in place (table is read by the hook today); if INSERT fails silently, we'll log and surface that during verification.

### 2. Show Synapse Credit Spend in Egress Logs

Add a new "Credits Spent" column to `ProvenanceAuditLog.tsx` next to each row.

- Extend the `egress_logs` select to include `synapse_ledger_entry_id` and `consumption_weight`.
- After the egress logs query resolves, run a secondary `useQuery` that fetches matching rows from `synapse_credit_ledger` by `id IN (...)` and builds a `Map<ledgerId, amount>`.
- New `<TableHead>` "Credits Spent" + `<TableCell>` rendering `{amount.toFixed(2)} CR` in primary color, with em-dash fallback when no linked ledger entry exists. Fix the empty-state `colSpan` from 5 → 6.
- Realtime subscription stays as-is; the new column updates on next refetch (we already `invalidateQueries` on insert).

### Technical notes

- Files touched:
  - `src/lib/hub-notifications.ts` — add `notifyAndToast` helper.
  - `src/components/notifications/NotificationsBridge.tsx` — NEW, realtime → DB inserts. Mounted once in `AppLayout`.
  - `src/components/layout/AppLayout.tsx` — mount `<NotificationsBridge />`.
  - `src/components/trading/PayAppBlueprint.tsx` — swap a few toasts to `notifyAndToast`.
  - `src/components/trading/ProvenanceAuditLog.tsx` — add Credits Spent column + ledger join query.
- No edge function, migration, or backend change required.
- Verification: open the bell after triggering a purchase / blueprint create; confirm rows appear in `hub_notifications` and the Egress Logs table renders a CR amount.
