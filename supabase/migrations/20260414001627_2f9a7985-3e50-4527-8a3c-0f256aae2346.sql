
CREATE TABLE public.egress_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  liability_token_hash text NOT NULL,
  batch_checksum text NOT NULL,
  aca_record_references text[] NOT NULL DEFAULT '{}',
  country_of_origin text NOT NULL DEFAULT 'US',
  digiramp_anchor_id text NOT NULL,
  egress_type text NOT NULL DEFAULT 'api_query',
  data_payload_summary jsonb,
  synapse_ledger_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.egress_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own egress logs"
  ON public.egress_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_egress_logs_user_id ON public.egress_logs(user_id);
CREATE INDEX idx_egress_logs_created_at ON public.egress_logs(created_at DESC);
