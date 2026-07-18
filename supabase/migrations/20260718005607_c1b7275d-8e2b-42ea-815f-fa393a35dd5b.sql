
ALTER TABLE public.taxonomy_verticals
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS naics text,
  ADD COLUMN IF NOT EXISTS gics text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='taxonomy_verticals'
      AND column_name='id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.taxonomy_verticals ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.taxonomy_verticals ALTER COLUMN id TYPE text USING id::text;
  END IF;
END $$;

ALTER TABLE public.taxonomy_submodules
  ADD COLUMN IF NOT EXISTS parent_id text,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS naics text,
  ADD COLUMN IF NOT EXISTS gics text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_production_method text,
  ADD COLUMN IF NOT EXISTS default_archetype text,
  ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='taxonomy_submodules'
      AND column_name='id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.taxonomy_submodules ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.taxonomy_submodules ALTER COLUMN id TYPE text USING id::text;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='taxonomy_submodules'
      AND column_name='vertical_id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.taxonomy_submodules ALTER COLUMN vertical_id TYPE text USING vertical_id::text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.taxonomy_nano_bites (
  id text PRIMARY KEY,
  industry_id text NOT NULL,
  value_chain_stage text NOT NULL,
  micro_element text NOT NULL,
  task text NOT NULL,
  cadence text,
  automatable boolean NOT NULL DEFAULT true,
  requires_tier text,
  sort_order int DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_nano_bites_industry ON public.taxonomy_nano_bites(industry_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_nano_bites_stage ON public.taxonomy_nano_bites(value_chain_stage);

GRANT SELECT ON public.taxonomy_nano_bites TO anon, authenticated;
GRANT ALL ON public.taxonomy_nano_bites TO service_role;

ALTER TABLE public.taxonomy_nano_bites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read taxonomy_nano_bites" ON public.taxonomy_nano_bites;
CREATE POLICY "Public read taxonomy_nano_bites"
  ON public.taxonomy_nano_bites FOR SELECT
  USING (is_active = true);

GRANT SELECT ON public.taxonomy_verticals TO anon, authenticated;
GRANT SELECT ON public.taxonomy_submodules TO anon, authenticated;
GRANT ALL ON public.taxonomy_verticals TO service_role;
GRANT ALL ON public.taxonomy_submodules TO service_role;

DROP TRIGGER IF EXISTS trg_taxonomy_nano_bites_updated_at ON public.taxonomy_nano_bites;
CREATE TRIGGER trg_taxonomy_nano_bites_updated_at
  BEFORE UPDATE ON public.taxonomy_nano_bites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
