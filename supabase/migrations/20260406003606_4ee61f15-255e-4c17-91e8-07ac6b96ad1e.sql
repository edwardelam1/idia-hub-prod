CREATE TABLE IF NOT EXISTS public.synapse_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_credits DECIMAL(10,4) NOT NULL DEFAULT 0,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('TOP_UP', 'CONSUMPTION', 'SETTLEMENT')),
  status TEXT NOT NULL DEFAULT 'SETTLED' CHECK (status IN ('PENDING', 'SETTLED', 'FAILED')),
  reference_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_synapse_credit_ledger_user_created 
  ON public.synapse_credit_ledger (user_id, created_at DESC);

ALTER TABLE public.synapse_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger entries"
  ON public.synapse_credit_ledger
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "No updates allowed"
  ON public.synapse_credit_ledger
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No deletes allowed"
  ON public.synapse_credit_ledger
  FOR DELETE
  TO authenticated
  USING (false);

CREATE OR REPLACE FUNCTION public.get_hub_balance(uid UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount_credits), 0)
  FROM public.synapse_credit_ledger
  WHERE user_id = uid AND status != 'FAILED';
$$;