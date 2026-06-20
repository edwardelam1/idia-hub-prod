CREATE TABLE public.mcp_relay_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  trace_id TEXT,
  parent_span_id TEXT,
  duration_ms INTEGER,
  status TEXT NOT NULL,
  sanitized_args JSONB,
  error_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mcp_relay_events TO authenticated;
GRANT ALL ON public.mcp_relay_events TO service_role;
ALTER TABLE public.mcp_relay_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read own relay events" ON public.mcp_relay_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX mcp_relay_events_user_created_idx ON public.mcp_relay_events (user_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.mcp_relay_events;