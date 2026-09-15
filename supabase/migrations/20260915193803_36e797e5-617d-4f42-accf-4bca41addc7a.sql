ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS buyer_role TEXT CHECK (buyer_role IN ('TRADING_DESK', 'ORG_ADMIN', 'COMPLIANCE_OFFICER', 'INDIVIDUAL')),
    ADD COLUMN IF NOT EXISTS buyer_jurisdiction TEXT CHECK (buyer_jurisdiction IN ('USA', 'SGP', 'IND', 'NGA_ZAF', 'UAE')),
    ADD COLUMN IF NOT EXISTS buyer_latency TEXT CHECK (buyer_latency IN ('STREAMING', 'INTRADAY', 'BATCH')),
    ADD COLUMN IF NOT EXISTS buyer_weights JSONB DEFAULT '{
        "realtimeSentiment": 0.50,
        "consumerTransactions": 0.50,
        "geospatialSar": 0.50,
        "b2bFirmographics": 0.50,
        "identityGraphs": 0.50,
        "consentArtifacts": 0.50
    }'::jsonb,
    ADD COLUMN IF NOT EXISTS diagnostic_level0_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS diagnostic_level1_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS diagnostic_level1_battery TEXT,
    ADD COLUMN IF NOT EXISTS diagnostic_tier_at_completion TEXT,
    ADD COLUMN IF NOT EXISTS diagnostic_raw_answers JSONB DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.recalculate_buyer_weights()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    role_weights JSONB;
BEGIN
    IF NEW.buyer_role = 'TRADING_DESK' THEN
        role_weights := '{"realtimeSentiment": 1.00, "consumerTransactions": 0.95, "geospatialSar": 0.70, "b2bFirmographics": 0.35, "identityGraphs": 0.20, "consentArtifacts": 0.30}'::jsonb;
    ELSIF NEW.buyer_role = 'ORG_ADMIN' THEN
        role_weights := '{"realtimeSentiment": 0.25, "consumerTransactions": 0.90, "geospatialSar": 0.85, "b2bFirmographics": 1.00, "identityGraphs": 0.75, "consentArtifacts": 0.60}'::jsonb;
    ELSIF NEW.buyer_role = 'COMPLIANCE_OFFICER' THEN
        role_weights := '{"realtimeSentiment": 0.15, "consumerTransactions": 0.40, "geospatialSar": 0.30, "b2bFirmographics": 0.60, "identityGraphs": 0.20, "consentArtifacts": 1.00}'::jsonb;
    ELSE
        role_weights := '{"realtimeSentiment": 0.30, "consumerTransactions": 0.70, "geospatialSar": 0.40, "b2bFirmographics": 0.20, "identityGraphs": 0.40, "consentArtifacts": 0.50}'::jsonb;
    END IF;

    NEW.buyer_weights := role_weights;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profiles_recalculate_weights ON public.profiles;
CREATE TRIGGER tr_profiles_recalculate_weights
    BEFORE INSERT OR UPDATE OF buyer_role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_buyer_weights();

CREATE TABLE IF NOT EXISTS public.lidd_extraction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    citizen_guid UUID NOT NULL REFERENCES public.profiles(platform_guid) ON DELETE CASCADE,
    synapse_credit_cost NUMERIC NOT NULL DEFAULT 2.50,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    extraction_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.lidd_extraction_events TO authenticated;
GRANT ALL ON public.lidd_extraction_events TO service_role;

ALTER TABLE public.lidd_extraction_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Extractors view own events" ON public.lidd_extraction_events;
CREATE POLICY "Extractors view own events"
    ON public.lidd_extraction_events FOR SELECT
    TO authenticated
    USING (auth.uid() = extractor_id);

DROP POLICY IF EXISTS "Extractors settle own events" ON public.lidd_extraction_events;
CREATE POLICY "Extractors settle own events"
    ON public.lidd_extraction_events FOR UPDATE
    TO authenticated
    USING (auth.uid() = extractor_id)
    WITH CHECK (auth.uid() = extractor_id);

DROP POLICY IF EXISTS "Service role full access on lidd" ON public.lidd_extraction_events;
CREATE POLICY "Service role full access on lidd"
    ON public.lidd_extraction_events FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lidd_extractor_status ON public.lidd_extraction_events (extractor_id, payment_status);