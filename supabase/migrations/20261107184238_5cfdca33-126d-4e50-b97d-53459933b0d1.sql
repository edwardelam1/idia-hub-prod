DROP POLICY IF EXISTS "Authenticated read api_metrics" ON public.api_metrics;
CREATE POLICY "Owners read their api_metrics" ON public.api_metrics FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
GRANT SELECT ON public.api_metrics TO authenticated;
CREATE INDEX IF NOT EXISTS api_metrics_user_ts_idx ON public.api_metrics (user_id, "timestamp" DESC);

GRANT SELECT ON public.api_webhook_deliveries TO authenticated;
ALTER TABLE public.api_webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners read their webhook deliveries" ON public.api_webhook_deliveries;
CREATE POLICY "Owners read their webhook deliveries" ON public.api_webhook_deliveries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_webhooks w WHERE w.id = webhook_id AND w.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS lidd_events_extractor_cursor_idx ON public.lidd_extraction_events (extractor_id, created_at DESC, id DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.api_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_webhook_deliveries;