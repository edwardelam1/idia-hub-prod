# What the 14 database errors mean

## 1. Repeating every 10 minutes: "invalid input syntax for type uuid: 3923…3590" (7 rows)
- Timing (:00, :10, :20 …) matches the `dao-proposal-tally-10min` scheduled job.
- The 77-digit number is an on-chain Governor proposal ID. The job is looking it up against `dao_proposals.id` (a UUID) instead of `dao_proposals.on_chain_id` (text), so Postgres rejects it and that proposal is never tallied.
- The function's code is not in this project (the other AI instance editing Supabase owns it).

Fix: change the lookup in `dao-proposal-tally` to match on `on_chain_id`, then confirm the error stops after the next two runs. If the code can't be brought into this project, hand this exact fix to the other instance.

## 2. 19:57: "permission denied to set role authenticated" + `get_security_event_detail` / `resolve_security_event` (4 rows)
- These came from my own verification checks while building the security pop-ups (testing that signed-out callers are refused). Harmless and expected.
- Signed-in users do have access to both functions (confirmed).

No action.

## 3. 20:21: permission denied for `profiles`, `dao_votes`, `liquidity_locks` (3 rows, same second)
- Signed-in users have read access to all three (confirmed), so this was a signed-out or expired-session page load (dashboard/governance) hitting tables that the security hardening closed to anonymous visitors. Working as intended, but the page should not fire those queries before sign-in finishes.

Fix: make those three queries wait for a ready session, so they stop producing log noise.

## 4. 20:26: "array_agg is an aggregate function" (1 row)
- A one-off malformed SQL query, most likely typed in the Marketplace SQL terminal or run by the other AI instance. Not a recurring job.

Fix: check the SQL terminal's error message is shown clearly to the user; no backend change needed.

## Summary
Nothing indicates an attack or data leak. Only item 1 is a real bug (a voting tally silently failing every 10 minutes).
