CREATE INDEX IF NOT EXISTS idx_synapse_ledger_idempotency
  ON public.synapse_credit_ledger ((metadata->>'idempotency_key'))
  WHERE metadata ? 'idempotency_key';