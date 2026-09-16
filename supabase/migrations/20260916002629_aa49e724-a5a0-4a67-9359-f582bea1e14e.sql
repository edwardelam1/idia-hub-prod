CREATE TABLE public.activity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  action text NOT NULL,
  title text NOT NULL,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'completed',
  records_consumed integer NOT NULL DEFAULT 0,
  synapse_credit_cost numeric NOT NULL DEFAULT 0,
  egress_log_id uuid REFERENCES public.egress_logs(id) ON DELETE SET NULL,
  synapse_ledger_entry_id uuid REFERENCES public.synapse_credit_ledger(id) ON DELETE SET NULL,
  reference_id text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_history_source_valid CHECK (source IN ('trading_desk', 'best_friend', 'marketplace')),
  CONSTRAINT activity_history_records_nonnegative CHECK (records_consumed >= 0),
  CONSTRAINT activity_history_cost_nonnegative CHECK (synapse_credit_cost >= 0),
  CONSTRAINT activity_history_user_idempotency_unique UNIQUE (user_id, idempotency_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_history TO authenticated;
GRANT ALL ON public.activity_history TO service_role;

ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity history"
ON public.activity_history FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity history"
ON public.activity_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity history"
ON public.activity_history FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity history"
ON public.activity_history FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX activity_history_user_created_idx
ON public.activity_history (user_id, created_at DESC);

CREATE INDEX activity_history_user_source_created_idx
ON public.activity_history (user_id, source, created_at DESC);

CREATE INDEX activity_history_egress_log_idx
ON public.activity_history (egress_log_id)
WHERE egress_log_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_activity_history_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER activity_history_touch_updated_at
BEFORE UPDATE ON public.activity_history
FOR EACH ROW EXECUTE FUNCTION public.touch_activity_history_updated_at();