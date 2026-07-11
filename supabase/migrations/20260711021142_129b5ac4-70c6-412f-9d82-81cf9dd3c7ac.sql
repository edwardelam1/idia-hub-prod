-- Grant Data API access + RLS for feature_feeds and api_metrics
GRANT SELECT ON public.feature_feeds TO anon, authenticated;
GRANT ALL ON public.feature_feeds TO service_role;
ALTER TABLE public.feature_feeds ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feature_feeds' AND policyname='Public read feature_feeds') THEN
    CREATE POLICY "Public read feature_feeds" ON public.feature_feeds FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feature_feeds' AND policyname='service_role manages feature_feeds') THEN
    CREATE POLICY "service_role manages feature_feeds" ON public.feature_feeds FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT ON public.api_metrics TO authenticated;
GRANT ALL ON public.api_metrics TO service_role;