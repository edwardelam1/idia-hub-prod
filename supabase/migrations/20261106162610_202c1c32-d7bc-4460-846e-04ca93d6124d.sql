CREATE TABLE public.protocol_api_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  endpoint text NOT NULL,
  idempotency_key text NOT NULL,
  status_code integer NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, endpoint, idempotency_key)
);
GRANT ALL ON public.protocol_api_requests TO service_role;
ALTER TABLE public.protocol_api_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their protocol API requests" ON public.protocol_api_requests
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
GRANT SELECT ON public.protocol_api_requests TO authenticated;