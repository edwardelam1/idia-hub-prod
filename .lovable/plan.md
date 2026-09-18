# Retire card checkout, and stop the repeating background error

## 1. Remove the card (Wix) payment path entirely

Fiat is suspended, so every credit purchase goes through the on-chain USDC rail that already exists.

- Purchase screens (`SynapsePurchaseModal.tsx`, `SynapseTopUp.tsx`, `UniversalPurchaseScreen.tsx`): drop the payment-rail selector and every card branch, so the screen opens straight into the USDC flow. Remove the return-from-checkout verification banner, the `success=true&paymentId=...` handling, and the Wix domain constant.
- Delete the two server pieces that only served card payments: `confirm-wix-payment` and `wix-payment-webhook`. These are the only places writing `funding_source: "FIAT_FBO"`, so that label disappears with them.
- Billing history views keep rendering any historical card rows already recorded; nothing existing is rewritten.

After this, purchases are recorded exactly like today's USDC top-ups (deposit entry, `internal_deposit`, dispatch then confirm, ledger polling), and consumption charges keep flowing through the Synapse controller receipt path unchanged.

## 2. Turn off the failing five-minute job

A scheduled job runs every five minutes and asks the ledger for rows of a payout type spelled in capitals, which the database does not accept — hence the repeating `invalid input value for enum idia_transaction_type: "DATA_SALE_PAYOUT"` entries. Its code is not in this project, so it cannot be corrected here.

- Unschedule the five-minute recovery job so the errors stop.
- Confirm no further occurrences appear in the database logs after the next few minutes. If any remain, unschedule the other five-minute job on the same cadence and re-check.

No ledger rows currently sit in a pending-payout state, so nothing is stranded by switching the job off.

## Technical notes

- Failing statement identified from Postgres logs: a PostgREST `SELECT id, user_id, amount, description FROM public.synapse_credit_ledger WHERE status = $1 AND transaction_type = $2` with the uppercase enum literal, fired at the `*/5` cron ticks. Candidate jobs: `pending-wallet-recovery` (primary), `mint-liability-receipt`.
- Removal via `cron.unschedule('pending-wallet-recovery')`; the deployed function stays but is no longer invoked.
- `FIAT_FBO` remains only in an old migration file (historical) — no live code path after the two functions are deleted.
- Deletions of the two edge functions use the delete tool, not file removal.
