# Receipts: simpler consent label, and all consent references captured

## 1. Label change

In the Provenance Audit Logs, the consent button reads "52 rec · 52 ref". It becomes just the reference count: "52 Ref" (singular "1 Ref"). Nothing else about the viewer changes.

## 2. Why only 52 of 99 consent references were captured

Confirmed by querying the live data:

- `staged_health_data` holds 46,822 rows across **99** distinct consent hashes, and all 99 resolve to a known owner.
- The assistant's marketplace scan does page through every staged row, so it does hand the full set forward.
- The loss happens in the Synapse Controller's verification step. To confirm the hashes are backed by real vault data, it asks the vault for rows matching the 99 hashes. That request returns **rows**, not hashes, and the database caps a single response at 1,000 rows. Those first 1,000 rows only happen to cover about 52 of the 99 hashes, so the other 47 are silently treated as "unverified" and dropped from the receipt.

This also means the charge is computed from an undercounted record volume.

## 3. The fix

Verification stops fetching rows and starts asking the database directly which of the supplied hashes exist in the vaults. A small database function takes the list of hashes and returns the distinct ones present in health, lifestyle, or vehicle staged data — one set-based answer, no row cap, no paging.

The controller keeps its existing per-vault phase logging and its "no verified lineage" rejection; only the lookup mechanism changes. Record counts, the consent list on the receipt, and the weighted charge then all reflect the true set.

Historical receipts are left untouched.

## Technical notes

- `src/components/trading/AcaReferenceViewer.tsx`: trigger label becomes `${total} Ref`; the `recordCount` prop and the "rec ·" segment are removed from the trigger (the dialog description may keep the record context). Remove the now-unused `recordCount` pass-through in `ProvenanceAuditLog.tsx` if it is only used for that label.
- New migration: `public.verify_aca_hashes(_hashes text[])` returning `table(aca_hash_key text, vault text)`, `security definer`, `set search_path = public`, `stable`, selecting `distinct` matches from `staged_health_data`, `staged_lifestyle_data`, `staged_ford_data`. `grant execute` to `service_role` (and `authenticated` only if needed).
- `supabase/functions/synapse-controller/index.ts` → `resolveAcaLineage`: replace the three `.from(vault).select("aca_hash_key").in(...)` calls with a single `rpc("verify_aca_hashes", { _hashes: lineageHashes })`; keep `[PHASE_START]`/`[PHASE_END]` logs per vault using the returned `vault` column, keep the `PROTOCOL_INTEGRITY_VIOLATION` guard, and keep every catch logging message + stack.
- Deploy `synapse-controller`; typecheck and build.
