-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.buyer_role_type AS ENUM ('TRADING_DESK', 'ORG_ADMIN', 'COMPLIANCE_OFFICER', 'INDIVIDUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.buyer_jurisdiction_type AS ENUM ('USA', 'SGP', 'IND', 'NGA_ZAF', 'UAE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.buyer_latency_type AS ENUM ('STREAMING', 'INTRADAY', 'BATCH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Current state table
CREATE TABLE IF NOT EXISTS public.buyer_profile_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    role public.buyer_role_type NOT NULL DEFAULT 'INDIVIDUAL',
    jurisdiction public.buyer_jurisdiction_type NOT NULL DEFAULT 'USA',
    latency_requirement public.buyer_latency_type NOT NULL DEFAULT 'BATCH',
    weights JSONB NOT NULL DEFAULT '{
        "realtimeSentiment": 0.50,
        "consumerTransactions": 0.50,
        "geospatialSar": 0.50,
        "b2bFirmographics": 0.50,
        "identityGraphs": 0.50,
        "consentArtifacts": 0.50
    }'::jsonb,
    level0_completed_at TIMESTAMPTZ,
    level1_completed_at TIMESTAMPTZ,
    level1_battery TEXT,
    tier_at_completion TEXT,
    raw_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Audit log table
CREATE TABLE IF NOT EXISTS public.buyer_diagnostic_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    battery_level TEXT NOT NULL,
    role_battery TEXT,
    question_id TEXT NOT NULL,
    selected_choice TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_buyer_diag_user ON public.buyer_diagnostic_responses(user_id, recorded_at DESC);

-- 4. Grants
GRANT SELECT, INSERT, UPDATE ON public.buyer_profile_vectors TO authenticated;
GRANT ALL ON public.buyer_profile_vectors TO service_role;
GRANT SELECT, INSERT ON public.buyer_diagnostic_responses TO authenticated;
GRANT ALL ON public.buyer_diagnostic_responses TO service_role;

-- 5. RLS
ALTER TABLE public.buyer_profile_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_diagnostic_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own vector" ON public.buyer_profile_vectors;
CREATE POLICY "Users can read own vector"
  ON public.buyer_profile_vectors FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own vector" ON public.buyer_profile_vectors;
CREATE POLICY "Users can insert own vector"
  ON public.buyer_profile_vectors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own vector" ON public.buyer_profile_vectors;
CREATE POLICY "Users can update own vector"
  ON public.buyer_profile_vectors FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on vectors" ON public.buyer_profile_vectors;
CREATE POLICY "Service role full access on vectors"
  ON public.buyer_profile_vectors FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can log diagnostic responses" ON public.buyer_diagnostic_responses;
CREATE POLICY "Users can log diagnostic responses"
  ON public.buyer_diagnostic_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own diagnostic responses" ON public.buyer_diagnostic_responses;
CREATE POLICY "Users can read own diagnostic responses"
  ON public.buyer_diagnostic_responses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on responses" ON public.buyer_diagnostic_responses;
CREATE POLICY "Service role full access on responses"
  ON public.buyer_diagnostic_responses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 6. Tamper-proof server-side weight calculation
CREATE OR REPLACE FUNCTION public.recalculate_buyer_weights()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    role_weights JSONB;
    ans JSONB := COALESCE(NEW.raw_answers, '{}'::jsonb);
BEGIN
    IF NEW.role = 'TRADING_DESK' THEN
        role_weights := '{"realtimeSentiment":1.00,"consumerTransactions":0.95,"geospatialSar":0.70,"b2bFirmographics":0.35,"identityGraphs":0.10,"consentArtifacts":0.30}'::jsonb;
    ELSIF NEW.role = 'ORG_ADMIN' THEN
        role_weights := '{"realtimeSentiment":0.25,"consumerTransactions":0.90,"geospatialSar":0.85,"b2bFirmographics":1.00,"identityGraphs":0.75,"consentArtifacts":0.60}'::jsonb;
    ELSIF NEW.role = 'COMPLIANCE_OFFICER' THEN
        role_weights := '{"realtimeSentiment":0.15,"consumerTransactions":0.40,"geospatialSar":0.30,"b2bFirmographics":0.60,"identityGraphs":0.20,"consentArtifacts":1.00}'::jsonb;
    ELSE
        role_weights := '{"realtimeSentiment":0.30,"consumerTransactions":0.80,"geospatialSar":0.40,"b2bFirmographics":0.10,"identityGraphs":1.00,"consentArtifacts":0.50}'::jsonb;
    END IF;

    -- Level 1 answer refinements (server-side only)
    IF ans ? 'Q2' THEN
      CASE ans->>'Q2'
        WHEN 'A' THEN role_weights := jsonb_set(role_weights, '{realtimeSentiment}', '1.00');
        WHEN 'B' THEN role_weights := jsonb_set(role_weights, '{consumerTransactions}', '1.00');
        WHEN 'C' THEN role_weights := jsonb_set(role_weights, '{geospatialSar}', '1.00');
        WHEN 'D' THEN role_weights := jsonb_set(role_weights, '{b2bFirmographics}', '1.00');
        ELSE NULL;
      END CASE;
    END IF;

    IF ans ? 'E1' THEN
      CASE ans->>'E1'
        WHEN 'B' THEN role_weights := jsonb_set(role_weights, '{b2bFirmographics}', '1.00');
        WHEN 'C' THEN role_weights := jsonb_set(role_weights, '{identityGraphs}', '0.95');
        WHEN 'D' THEN role_weights := jsonb_set(role_weights, '{geospatialSar}', '0.95');
        ELSE NULL;
      END CASE;
    END IF;

    IF ans ? 'C2' THEN
      CASE ans->>'C2'
        WHEN 'B' THEN role_weights := jsonb_set(role_weights, '{consentArtifacts}', '1.00');
        WHEN 'C' THEN role_weights := jsonb_set(role_weights, '{consumerTransactions}', '0.90');
        ELSE NULL;
      END CASE;
    END IF;

    IF ans ? 'I1' THEN
      CASE ans->>'I1'
        WHEN 'B' THEN role_weights := jsonb_set(role_weights, '{consumerTransactions}', '0.80');
        WHEN 'C' THEN role_weights := jsonb_set(role_weights, '{consentArtifacts}', '0.90');
        ELSE NULL;
      END CASE;
    END IF;

    NEW.weights := role_weights;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_recalculate_buyer_weights ON public.buyer_profile_vectors;
CREATE TRIGGER tr_recalculate_buyer_weights
    BEFORE INSERT OR UPDATE ON public.buyer_profile_vectors
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_buyer_weights();