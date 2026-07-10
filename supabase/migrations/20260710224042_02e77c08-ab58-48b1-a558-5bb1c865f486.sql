
ALTER TABLE public.settlement_queue
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS skipped_contributors jsonb;

CREATE TABLE IF NOT EXISTS public.settlement_ledger_repair_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id text NOT NULL,
  user_id uuid NOT NULL,
  phase text NOT NULL,
  blockchain_tx_hash text,
  error text,
  payload jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.settlement_ledger_repair_queue TO service_role;

ALTER TABLE public.settlement_ledger_repair_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only" ON public.settlement_ledger_repair_queue;
CREATE POLICY "service role only"
  ON public.settlement_ledger_repair_queue
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS settlement_ledger_repair_queue_ref_idx
  ON public.settlement_ledger_repair_queue (reference_id);

CREATE INDEX IF NOT EXISTS synapse_credit_ledger_tx_user_type_idx
  ON public.synapse_credit_ledger (blockchain_tx_hash, user_id, transaction_type)
  WHERE blockchain_tx_hash IS NOT NULL;
