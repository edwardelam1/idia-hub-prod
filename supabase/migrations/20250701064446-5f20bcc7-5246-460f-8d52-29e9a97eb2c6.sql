
-- Phase 1: Database Schema Setup

-- Create enhanced staged_health_data table
CREATE TABLE public.staged_health_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pseudo_user_id TEXT NOT NULL,
  raw_data_id UUID REFERENCES public.raw_strava_data(id),
  activity_type TEXT NOT NULL,
  duration_seconds INTEGER,
  distance_meters NUMERIC,
  elevation_gain_meters NUMERIC,
  average_heartrate INTEGER,
  max_heartrate INTEGER,
  resting_heart_rate INTEGER,
  average_speed_mps NUMERIC,
  max_speed_mps NUMERIC,
  calories_burned INTEGER,
  sleep_duration INTEGER,
  sleep_quality_score INTEGER,
  stress_level INTEGER,
  workout_intensity INTEGER,
  recovery_score INTEGER,
  steps_count INTEGER,
  anonymized_location_hash TEXT,
  anonymized_location_zone TEXT,
  device_type TEXT,
  weather_conditions JSONB,
  effort_score INTEGER,
  data_quality_score NUMERIC DEFAULT 1.0,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on staged_health_data
ALTER TABLE public.staged_health_data ENABLE ROW LEVEL SECURITY;

-- Create marketplace_bundles table
CREATE TABLE public.marketplace_bundles (
  bundle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data_json JSONB NOT NULL,
  key_insights TEXT[] DEFAULT '{}',
  data_points TEXT[] DEFAULT '{}',
  suggested_filters TEXT[] DEFAULT '{}',
  price INTEGER NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('Analyst', 'Professional', 'Enterprise')),
  category TEXT NOT NULL,
  contacts_count INTEGER DEFAULT 0,
  match_percentage INTEGER DEFAULT 85,
  features TEXT[] DEFAULT '{}',
  bundle_version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on marketplace_bundles
ALTER TABLE public.marketplace_bundles ENABLE ROW LEVEL SECURITY;

-- Create policy for marketplace_bundles (public read access)
CREATE POLICY "Public can view active bundles"
  ON public.marketplace_bundles
  FOR SELECT
  USING (is_active = true);

-- Create bundle_generation_logs table to track automated bundle creation
CREATE TABLE public.bundle_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES public.marketplace_bundles(bundle_id),
  generation_type TEXT NOT NULL, -- 'nightly', 'real-time', 'ai-generated'
  data_source_count INTEGER,
  processing_duration INTERVAL,
  quality_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create data_processing_queue table for async processing
CREATE TABLE public.data_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_data_id UUID REFERENCES public.raw_strava_data(id),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_stage TEXT DEFAULT 'anonymization' CHECK (processing_stage IN ('anonymization', 'staging', 'bundling', 'marketplace')),
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_staged_health_data_pseudo_user ON public.staged_health_data(pseudo_user_id);
CREATE INDEX idx_staged_health_data_activity_type ON public.staged_health_data(activity_type);
CREATE INDEX idx_staged_health_data_location_zone ON public.staged_health_data(anonymized_location_zone);
CREATE INDEX idx_staged_health_data_processed_at ON public.staged_health_data(processed_at);
CREATE INDEX idx_marketplace_bundles_category ON public.marketplace_bundles(category);
CREATE INDEX idx_marketplace_bundles_tier ON public.marketplace_bundles(tier);
CREATE INDEX idx_marketplace_bundles_active ON public.marketplace_bundles(is_active);
CREATE INDEX idx_data_processing_queue_status ON public.data_processing_queue(processing_status);

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to generate cryptographic pseudonyms
CREATE OR REPLACE FUNCTION public.generate_pseudonym(input_text TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT encode(digest(input_text || 'IDIA_SALT_2024', 'sha256'), 'hex');
$$;

-- Create function to anonymize location data
CREATE OR REPLACE FUNCTION public.anonymize_location(lat NUMERIC, lng NUMERIC)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT 'ZONE_' || encode(digest(ROUND(lat, 1)::TEXT || '_' || ROUND(lng, 1)::TEXT, 'sha256'), 'hex')::CHAR(8);
$$;

-- Create data quality scoring function
CREATE OR REPLACE FUNCTION public.calculate_data_quality_score(
  p_heartrate INTEGER,
  p_elevation INTEGER,
  p_duration INTEGER,
  p_distance NUMERIC
)
RETURNS NUMERIC
LANGUAGE PLPGSQL
IMMUTABLE
AS $$
DECLARE
  quality_score NUMERIC := 0.5; -- Base score
BEGIN
  -- Completeness scoring
  IF p_heartrate IS NOT NULL THEN quality_score := quality_score + 0.2; END IF;
  IF p_elevation IS NOT NULL THEN quality_score := quality_score + 0.1; END IF;
  IF p_duration IS NOT NULL AND p_duration > 300 THEN quality_score := quality_score + 0.1; END IF;
  IF p_distance IS NOT NULL AND p_distance > 0 THEN quality_score := quality_score + 0.1; END IF;
  
  -- Cap at 1.0
  IF quality_score > 1.0 THEN quality_score := 1.0; END IF;
  
  RETURN quality_score;
END;
$$;
