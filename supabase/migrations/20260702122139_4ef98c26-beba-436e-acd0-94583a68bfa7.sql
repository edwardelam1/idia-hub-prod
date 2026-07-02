-- Grant Data API access so authenticated users can read (and thus subscribe to realtime events on) the pipeline tables the Synapse Visualizer listens to.
GRANT SELECT ON public.raw_health_data TO authenticated;
GRANT SELECT ON public.egress_logs TO authenticated;
GRANT SELECT ON public.synapse_credit_ledger TO authenticated;
GRANT SELECT ON public.delt_transfers TO authenticated;
GRANT ALL ON public.raw_health_data TO service_role;
GRANT ALL ON public.egress_logs TO service_role;
GRANT ALL ON public.synapse_credit_ledger TO service_role;
GRANT ALL ON public.delt_transfers TO service_role;

-- delt_transfers had RLS with no policies, so authenticated received zero rows / zero realtime events.
-- Allow a signed-in user to see their own transfers, keeping row-level scoping.
ALTER TABLE public.delt_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own delt transfers" ON public.delt_transfers;
CREATE POLICY "Users can view own delt transfers"
  ON public.delt_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service_role manages delt_transfers" ON public.delt_transfers;
CREATE POLICY "service_role manages delt_transfers"
  ON public.delt_transfers FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Ensure all four tables are members of the realtime publication so events actually broadcast.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='raw_health_data') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.raw_health_data';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='egress_logs') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.egress_logs';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='synapse_credit_ledger') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.synapse_credit_ledger';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='delt_transfers') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.delt_transfers';
  END IF;
END $$;