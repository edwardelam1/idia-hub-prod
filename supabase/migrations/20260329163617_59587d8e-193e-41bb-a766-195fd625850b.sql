
-- Create the synapse_credit_ledger table
CREATE TABLE public.synapse_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('deposit', 'deduction', 'refund', 'subscription_purchase')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  description text,
  reference_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.synapse_credit_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users manage own ledger" ON public.synapse_credit_ledger
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Index for fast balance lookups
CREATE INDEX idx_credit_ledger_user ON public.synapse_credit_ledger(user_id, created_at DESC);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.synapse_credit_ledger;
