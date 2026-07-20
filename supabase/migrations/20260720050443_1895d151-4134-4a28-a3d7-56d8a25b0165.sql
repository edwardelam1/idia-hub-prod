
GRANT SELECT ON public.idia_pico_bites TO anon;
GRANT SELECT ON public.idia_pico_bites TO authenticated;
GRANT ALL ON public.idia_pico_bites TO service_role;

GRANT SELECT ON public.idia_nano_pico_relations TO anon;
GRANT SELECT ON public.idia_nano_pico_relations TO authenticated;
GRANT ALL ON public.idia_nano_pico_relations TO service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='idia_pico_bites' AND policyname='Pico bite catalog is public read') THEN
    CREATE POLICY "Pico bite catalog is public read" ON public.idia_pico_bites FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='idia_pico_bites' AND policyname='Service role manages pico bites') THEN
    CREATE POLICY "Service role manages pico bites" ON public.idia_pico_bites FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='idia_nano_pico_relations' AND policyname='Pico relations are public read') THEN
    CREATE POLICY "Pico relations are public read" ON public.idia_nano_pico_relations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='idia_nano_pico_relations' AND policyname='Service role manages pico relations') THEN
    CREATE POLICY "Service role manages pico relations" ON public.idia_nano_pico_relations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
