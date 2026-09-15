# Utilities Panel → Full Integration Portal

Turn the Utilities tab from a key generator into a complete developer spec for commercial operators: where to send data, how to authenticate, and exactly what the data must look like.

## What the operator will see

The existing header, "Pending Data Dividend Balance" card and settlement flow stay exactly as they are. Below them, a new full-width "Commercial Ingestion Integration" card with four numbered steps, each with its own copy button:

1. **Franchise API Key** — unchanged behaviour: generate once, shown in full once, copy action, "store this securely" notice.
2. **Ingestion Endpoint** — method and URL:
   `POST https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/surveillance-api-intake`
3. **Required Headers** — the piece currently missing. The intake gateway authenticates on the franchise key header, not on a user login:
   - `x-api-key: <franchise key>`
   - `Content-Type: application/json`
4. **JSON Payload Schema** — the batch shape the gateway actually accepts, with the operator's own extractor ID filled in:
   ```
   { "extractor_id": "<their id>",
     "infractions": [ { "license_plate": "ABC1234", "timestamp": "2026-09-15T14:30:00Z" } ] }
   ```

Plus two additions the pasted draft was missing, because an integrator cannot go live without them:

5. **Ready-to-run example** — a complete `curl` command combining endpoint, headers and payload, in one copy action.
6. **Response and error reference** — the success body (`status`, `records_processed`, `matches_found`, `debt_staged`) and what each rejection means: 401 missing/unknown/revoked key, 403 extractor ID does not match the key, 400 empty batch.

Everything is mobile-first: code blocks scroll horizontally rather than being cut off, copy buttons are icon-only and sit beside each block.

## Corrections to the pasted code

The pasted snippet lost its markup in transit and also targets contracts this project does not use. It will be rebuilt faithfully to the described design, with these corrected against the live backend:

- Key generation posts `{ action: "create", name: "LIDD Franchise Key" }` and reads `data.key` — the deployed issuer's actual contract. The draft's `{ extractor_id }` / `data.apiKey` would return nothing.
- Checkout keeps `prefillUsd` + `onPurchaseComplete` and the settle-on-success step that clears the balance. The draft's `prefillAmount` / `purchaseType` props do not exist on the checkout modal and would break settlement.
- Identity reads `user.user_id` (this project's shape), not `user.id`.
- The spec card documents `x-api-key`; the draft omitted headers entirely, which is the actual thing blocking an operator from transmitting.

All `[PHASE_START]` / `[PHASE_END]` logging is retained, and copy actions get their own bracketed logs.

## Technical notes

- Single file changed: `src/components/marketplace/utilities/UtilitiesIngestionPanel.tsx`. No backend, schema or edge function changes.
- Endpoint URL derived from `import.meta.env.VITE_SUPABASE_URL` rather than hardcoded, so it stays correct per environment.
- Card layout shifts to: balance card on top, integration card full width beneath it, so the code blocks have room to breathe.
