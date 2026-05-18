# Fix App Builder provisioning + IDIA Life hydration

Two distinct bugs, one shared symptom (IDIA Pay can't hydrate).

## Issue 1 — Wrong provisioning code format

`src/components/trading/PayAppBlueprint.tsx` line 572 `generateProvisioningCode()` emits **4 groups** (`IDIA-XXXX-XXXX-XXXX-XXXX`) instead of the canonical **2 groups** (`IDIA-XXXX-XXXX`) used by the DB function `public.generate_business_provisioning_code()` and by `businesses.provisioning_code`. This generator is called from `handleNewSchema` (L1260) and as the insert fallback (L1219), so every schema created via the "+ New Schema" button gets a malformed code that IDIA Pay rejects.

**Fix:** rewrite `generateProvisioningCode()` to emit `IDIA-XXXX-XXXX` (one hyphen, two 4-char groups), matching the SQL generator exactly. No DB change required.

## Issue 2 — Existing schemas have "no manifest available" on hydrate

`hydrate-terminal` edge function reads from `idia_schema_manifest_vault` keyed by `pairing_code`. But the App Builder writes schemas to **two different tables**:

- `device_provisioning_blueprints` — written by Save / + New Schema (the everyday flow).
- `idia_schema_manifest_vault` — written **only** by the separate "Vault" button (`handleVaultBlueprint`, L1109), and it upserts `onConflict: "business_id"` against a `UNIQUE(business_id)` constraint — so a business can have at most one vaulted manifest, and any new code for the same business silently overwrites the previous one.

Net effect: schemas saved via the normal Save flow never reach the vault, and even when a user clicks "Vault", a second code for the same business clobbers the first. IDIA Life's `hydrate-terminal` then can't find the pairing code.

**Fix (frontend only, no schema change required to unblock):**
1. In `handleSendToDevice`, `handleSaveSchema` (both update + insert branches), and `handleNewSchema`, mirror the write into `idia_schema_manifest_vault` upserting `onConflict: "pairing_code"` instead of `business_id`. This requires the vault to allow multiple rows per business — see migration below.
2. Keep the existing "Vault" button working as an explicit re-sync action.

**Required migration** (`idia_schema_manifest_vault`):
- Drop `UNIQUE` on `business_id`.
- Add `UNIQUE` on `pairing_code` so `onConflict: "pairing_code"` works.
- Existing rows are preserved; the change only loosens the per-business constraint and tightens the per-code one.

## Files touched

- `src/components/trading/PayAppBlueprint.tsx` — rewrite `generateProvisioningCode()`; add vault mirror upsert to `handleSendToDevice`, `handleSaveSchema` (both branches), and `handleNewSchema`; update `handleVaultBlueprint` to use `onConflict: "pairing_code"`.
- New migration — alter `idia_schema_manifest_vault` unique constraints as above.

## Out of scope

- No changes to `hydrate-terminal` edge function (already correct).
- No changes to `provisioning-engine.ts` (Life-side cache layer is fine).
- No changes to the DB `generate_business_provisioning_code()` function (already correct format).
