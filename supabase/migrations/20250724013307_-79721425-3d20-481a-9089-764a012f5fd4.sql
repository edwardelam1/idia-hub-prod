-- Phase 1: Enhanced IDIA Life Data Pipeline
-- Create staging table for lifestyle data from device_events
CREATE TABLE public.staged_lifestyle_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pseudo_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'lifestyle',
  session_duration INTEGER,
  location_zone TEXT, -- anonymized location
  activity_context JSONB DEFAULT '{}',
  social_interactions JSONB DEFAULT '{}',
  app_usage_patterns JSONB DEFAULT '{}',
  device_usage_metrics JSONB DEFAULT '{}',
  data_quality_score NUMERIC DEFAULT 0.5,
  data_completeness_score NUMERIC DEFAULT 0.5,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  anonymized_from_event_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phase 2: IDIA Pay Business Data Pipeline
-- Create staging table for business data
CREATE TABLE public.staged_business_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pseudo_business_id TEXT NOT NULL,
  business_category TEXT NOT NULL,
  transaction_patterns JSONB DEFAULT '{}',
  operational_metrics JSONB DEFAULT '{}',
  employee_analytics JSONB DEFAULT '{}',
  ar_engagement_data JSONB DEFAULT '{}',
  location_performance JSONB DEFAULT '{}',
  seasonal_trends JSONB DEFAULT '{}',
  data_quality_score NUMERIC DEFAULT 0.5,
  data_completeness_score NUMERIC DEFAULT 0.5,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  anonymized_from_business_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enhanced marketplace bundles with new categories
ALTER TABLE marketplace_bundles 
ADD COLUMN IF NOT EXISTS bundle_category TEXT DEFAULT 'health',
ADD COLUMN IF NOT EXISTS data_fusion_level TEXT DEFAULT 'single_source',
ADD COLUMN IF NOT EXISTS cross_platform_insights JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS predictive_analytics JSONB DEFAULT '{}';

-- Create data processing queue entries for lifestyle and business data
CREATE TABLE public.lifestyle_processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_event_id BIGINT NOT NULL,
  processing_status TEXT DEFAULT 'pending',
  processing_stage TEXT DEFAULT 'anonymization',
  data_category TEXT DEFAULT 'lifestyle',
  retry_count INTEGER DEFAULT 0,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.business_processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  processing_status TEXT DEFAULT 'pending',
  processing_stage TEXT DEFAULT 'anonymization',
  data_category TEXT DEFAULT 'business_intelligence',
  retry_count INTEGER DEFAULT 0,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cross-platform analytics table
CREATE TABLE public.cross_platform_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type TEXT NOT NULL,
  geographic_region TEXT,
  health_lifestyle_correlation JSONB DEFAULT '{}',
  business_health_impact JSONB DEFAULT '{}',
  economic_indicators JSONB DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0.0,
  sample_size INTEGER DEFAULT 0,
  analysis_period JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE staged_lifestyle_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE staged_business_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifestyle_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_platform_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read access to staged lifestyle data" 
ON staged_lifestyle_data FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read access to staged business data" 
ON staged_business_data FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read access to processing queues" 
ON lifestyle_processing_queue FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read access to business processing queues" 
ON business_processing_queue FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read access to cross-platform insights" 
ON cross_platform_insights FOR SELECT USING (true);

-- Create service role policies for processing
CREATE POLICY "Allow all operations for service role on staged lifestyle data" 
ON staged_lifestyle_data FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for service role on staged business data" 
ON staged_business_data FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for service role on lifestyle processing queue" 
ON lifestyle_processing_queue FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for service role on business processing queue" 
ON business_processing_queue FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for service role on cross-platform insights" 
ON cross_platform_insights FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for automatic processing
CREATE OR REPLACE FUNCTION queue_lifestyle_data_for_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue device events for lifestyle processing
  IF NEW.data_category IN ('lifestyle', 'social', 'behavioral', 'location') THEN
    INSERT INTO lifestyle_processing_queue (
      device_event_id,
      processing_status,
      processing_stage,
      data_category
    ) VALUES (
      NEW.id,
      'pending',
      'anonymization',
      NEW.data_category
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_lifestyle_processing_trigger
  AFTER INSERT ON device_events
  FOR EACH ROW
  EXECUTE FUNCTION queue_lifestyle_data_for_processing();

-- Create trigger for business data processing
CREATE OR REPLACE FUNCTION queue_business_data_for_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue new businesses for analytics processing
  INSERT INTO business_processing_queue (
    business_id,
    processing_status,
    processing_stage,
    data_category
  ) VALUES (
    NEW.id,
    'pending',
    'business_analytics',
    'business_intelligence'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_business_processing_trigger
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION queue_business_data_for_processing();

-- Add tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE staged_lifestyle_data;
ALTER PUBLICATION supabase_realtime ADD TABLE staged_business_data;
ALTER PUBLICATION supabase_realtime ADD TABLE lifestyle_processing_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE business_processing_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE cross_platform_insights;