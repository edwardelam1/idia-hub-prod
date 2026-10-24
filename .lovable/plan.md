# IDIA Protocol Security Review (Hub, Crazy Friend, Supabase)

## Summary
Latest database scan: **44 critical, 10 warnings, 13 info**. The main risk is the database access rules on many tables, not the app screens. Several critical items are on purpose (ecosystem-wide staged data you asked for) and must be marked "accepted" instead of changed.

## 1. Hub app
Strong already:
- Raw API and node keys are stored only as SHA-256 hashes and shown once.
- Payment cards are never stored; purchases run in USDC to the relayer wallet; the Safe is refused as a receiver.
- The Vulture ledger cannot be changed after writing; personal Best Friend mode only sees the owner's own data.
- Provider music logins stay on the server.

Gaps:
- The hardware consent check fills in a fake "DEV_MOCK" tag whenever the app runs inside a frame. Anyone who puts the live site inside a frame gets past the hardware check. Limit this shortcut to the preview address.
- 17 backend functions skip the standard sign-in check. Each one needs its own key, secret or sign-in check in code (the issue-extractor, mesh and music functions have this; the rest are unchecked).
- Most functions accept requests from any website. Limit that to hub.thebigidia.com and the preview.

## 2. Crazy Friend protocol
- The crazy-8-security function never checks who is calling. It runs with full database rights and spends AI budget for anyone who calls it. Highest-priority code fix.
- Its 8 agents only give AI opinions. Nothing automatically blocks, flags or locks accounts. The security page reads AI text, not enforced rules.
- It calls Gemini with a separate key instead of the built-in AI gateway, which means one more secret to manage.

## 3. Supabase platform
Critical: exposed to anyone, signed in or not:
- profiles (everyone's profile can be read: Zero-PII rule at risk), liquidity_locks, localized_pools, interests, dao_pending_actions, dao_msa_metrics; ar_user_interactions accepts writes from anyone.

Critical: any signed-in user can read or change data:
- Governance: dao_votes (any user can **delete** votes), dao_proposals (anyone can add), proposals, signatures, petitions, ledger.
- Team money: team_distributions, team_forfeitures, team_vesting_pushes, synapse_controller.
- Operations: daily_prep_list (read and change), production_queue, distribution_jobs, mesh_gateway_state, user_aca_records, user_votes.
- Intentional (accept, don't change): staged_health/ford/lifestyle/business data, universal_data_bundles, mesh_telemetry_events read access for trading and marketplace.

Warnings:
- Anyone can write to raw_ford_data, raw_strava_data and urban_flow_events (fake data could be injected, which breaks the Golden Rule). feature_feeds can be changed by anyone.
- 2 privileged database functions (increment_pool_balance, distribution.trigger_processor) don't lock which tables and functions they look up, so a planted table or function could run with full rights.
- Leaked-password protection is off. You turn it on in the Supabase dashboard (requires a paid plan).
- Avatar and logo storage lets anyone list every file.

## Proposed fix order
1. Lock profiles to the owner only, and close the other tables anyone can read or write.
2. Add caller checks to crazy-8-security and review the other 16 functions that skip the sign-in check.
3. Governance: only the owner can change or delete a vote, and adding proposals requires a role check. Team money and synapse_controller: admin or owner only.
4. Raw intake tables: writes only from the server.
5. Pin lookups for the 2 flagged functions; stop public file listing for avatars and logos.
6. Limit the fake hardware tag to the preview, and limit which websites can call the functions.
7. Mark the intentional ecosystem-wide findings as accepted, with the reason.
8. Run the scan again and report.

## Technical notes
- RLS migrations that use auth.uid() scoping and has_role / is_business_* helpers, plus GRANT review per table.
- Edge functions: getClaims() check, or a shared secret header for functions that triggers call.
- `ALTER FUNCTION ... SET search_path = ''`.
- In hardware-identifier.ts, the bypass is limited to hostnames ending in lovable.app or lovableproject.com.
- Before step 1 changes profiles, check which pages read other users' profiles.
