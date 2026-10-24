# Security Remediation (your rules)

Goal: nobody who is signed out can reach any data. Signed-in users can still read governance, profiles and protocol reporting. Every write is locked to its owner, its organization or the server.

## 1. Logging
Every file and backend function I touch gets STEP_START / STEP_END / ERROR logs around each sign-in check, database query, outside call and try/catch.

## 2. Database access rules
- **Signed-out visitors:** remove all access to profiles, liquidity_locks, localized_pools, interests, dao_pending_actions, dao_msa_metrics, ar_user_interactions, and every governance and financial table.
- **Profiles:** any signed-in user can read them. Only the owner can create or edit their own profile. Nobody can delete one.
- **Governance** (dao_proposals, proposals, dao_votes, signatures, petitions, dao_pending_actions, dao_msa_metrics): any signed-in user can read. People can only cast votes and signatures as themselves, including in user_votes. A vote can't be edited or deleted after it is cast. Only the author can add a proposal, and only the author or a super_admin can edit or delete it.
- **Financial reporting** (liquidity_locks, localized_pools, team_distributions, team_forfeitures, team_vesting_pushes): any signed-in user can read. Only the server or a super_admin can write.
- **Ledger and user_aca_records:** each person sees their own rows. Hardcoded account bypasses are removed. Signed-in users can still read protocol-level receipts where the audit screen needs them.
- **Merchant back-office** (daily_prep_list, production_queue, distribution_jobs, mesh_gateway_state): only members of the business can read or write.
- **Marketplace and Trading Desk** (staged_* tables, universal_data_bundles, mesh_telemetry_events): any signed-in user can still read. Only the server can write.
- **Raw intake** (raw_ford_data, raw_strava_data, urban_flow_events): only the server can write.
- **Balance and mint functions** (increment_pool_balance, increment_wallet_balance): I'll first check whether the app calls them directly. Then only the server can run them. Any legitimate caller moves to a checked backend function or a database trigger.
- Pin the lookup path on every flagged privileged function. Switch the 16 flagged views so they follow the reader's own permissions, and confirm the tables underneath still allow the reads governance and reporting need.

## 3. Hardware consent bypass
The fake hardware tag only works on preview addresses (*.lovable.app, *.lovableproject.com). It is refused on hub.thebigidia.com and thebigidia.com.

## 4. Backend functions
- Only these sites can call Hub functions: hub.thebigidia.com, life.thebigidia.com, pay.thebigidia.com, thebigidia.com and *.lovable.app.
- crazy-8-security, synapse-controller and security-event-generator only accept one of three callers: the server key, an internal webhook secret, or a signed-in super_admin or security_operator. Users see a general error message instead of raw error details.

## Order of work
1. Read-only checks first: the real column names (author_id, created_by, voter_id), whether super_admin and security_operator roles exist, the hardcoded bypass account IDs, which balance functions the app calls directly, and the 16 flagged views.
2. One database migration with all of the access rules above.
3. A shared site and caller check for backend functions, then the three locked-down functions, then redeploy.
4. The hardware consent fix.
5. Run the scan again and mark the intentional marketplace read access as accepted.
6. Signed-in check of the Marketplace, governance screens and the Best Friend chat.

## Technical notes
- In migrations: `REVOKE ALL ... FROM anon`, then policies with `TO authenticated` and checks on `auth.uid()`, `has_role` / `is_business_member`.
- Function changes: `ALTER FUNCTION ... SET search_path = public`, `REVOKE EXECUTE ... FROM anon, authenticated`, `ALTER VIEW ... SET (security_invoker = true)`.
- If the super_admin or security_operator role doesn't exist yet, it gets added to the existing protected roles table, never to profiles.
- Trigger and cron callers of synapse-controller (settle-utility-balance, the security generator) already send the server key, so they keep working.
