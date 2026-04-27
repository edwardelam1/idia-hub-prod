-- Create marketplace_bundles table for data marketplace functionality
CREATE TABLE IF NOT EXISTS public.marketplace_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data_json JSONB NOT NULL DEFAULT '{}',
  key_insights TEXT[] NOT NULL DEFAULT '{}',
  data_points TEXT[] NOT NULL DEFAULT '{}',
  suggested_filters TEXT[] NOT NULL DEFAULT '{}',
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tier TEXT NOT NULL DEFAULT 'standard',
  category TEXT NOT NULL DEFAULT 'general',
  contacts_count INTEGER NOT NULL DEFAULT 0,
  match_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  features TEXT[] NOT NULL DEFAULT '{}',
  bundle_version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security_events table for security monitoring
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  result_data JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create data_processing_queue table for pipeline management
CREATE TABLE IF NOT EXISTS public.data_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_data JSONB NOT NULL DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  priority INTEGER NOT NULL DEFAULT 5,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.marketplace_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_processing_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for marketplace_bundles
CREATE POLICY "Everyone can view active marketplace bundles"
ON public.marketplace_bundles
FOR SELECT
USING (is_active = true);

CREATE POLICY "System can manage marketplace bundles"
ON public.marketplace_bundles
FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for security_events
CREATE POLICY "Authenticated users can view security events"
ON public.security_events
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (true);

-- Create RLS policies for data_processing_queue
CREATE POLICY "Users can view their own processing jobs"
ON public.data_processing_queue
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing jobs"
ON public.data_processing_queue
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage all processing jobs"
ON public.data_processing_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_marketplace_bundles_bundle_id ON public.marketplace_bundles(bundle_id);
CREATE INDEX idx_marketplace_bundles_active ON public.marketplace_bundles(is_active) WHERE is_active = true;
CREATE INDEX idx_marketplace_bundles_category ON public.marketplace_bundles(category);
CREATE INDEX idx_security_events_timestamp ON public.security_events(timestamp DESC);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
CREATE INDEX idx_security_events_agent ON public.security_events(agent_name);
CREATE INDEX idx_data_processing_queue_user_id ON public.data_processing_queue(user_id);
CREATE INDEX idx_data_processing_queue_status ON public.data_processing_queue(status);
CREATE INDEX idx_data_processing_queue_scheduled ON public.data_processing_queue(scheduled_at);

-- Fix the digest function issues in existing functions
CREATE OR REPLACE FUNCTION public.generate_pseudonym()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 'ANON_' || substr(encode(digest(random()::text, 'md5'), 'hex'), 1, 12);
END;
$$;

CREATE OR REPLACE FUNCTION public.anonymize_location()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  zones TEXT[] := ARRAY['ZONE_A', 'ZONE_B', 'ZONE_C', 'ZONE_D', 'ZONE_E'];
BEGIN
  RETURN zones[floor(random() * array_length(zones, 1) + 1)];
END;
$$;

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_marketplace_bundles_updated_at
BEFORE UPDATE ON public.marketplace_bundles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_processing_queue_updated_at
BEFORE UPDATE ON public.data_processing_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample marketplace bundles
INSERT INTO public.marketplace_bundles (bundle_id, title, description, data_json, key_insights, data_points, suggested_filters, price, tier, category, contacts_count, match_percentage, features) VALUES
('health-fitness-premium', 'Premium Health & Fitness Data', 'Comprehensive health and fitness data including step counts, heart rate, sleep patterns, and workout analytics from wearable devices.', 
 '{"data_types": ["steps", "heart_rate", "sleep", "workouts"], "time_range": "2023-2024", "device_compatibility": ["apple_watch", "fitbit", "garmin"]}',
 ARRAY['Average 12,000 steps per day', 'Peak fitness hours: 6-8 AM', '68% users meet daily activity goals', 'Sleep quality correlation with activity'],
 ARRAY['Daily step counts', 'Heart rate zones', 'Sleep duration & quality', 'Workout frequency', 'Calorie burn rates'],
 ARRAY['age_range', 'activity_level', 'device_type', 'location', 'fitness_goals'],
 299.99, 'premium', 'health', 150000, 94.5,
 ARRAY['Real-time sync', 'Historical data', 'Anonymized', 'GDPR compliant']),
 
('lifestyle-consumer-standard', 'Consumer Lifestyle Insights', 'Retail and lifestyle behavior data including shopping patterns, brand preferences, and seasonal trends.',
 '{"categories": ["retail", "entertainment", "travel", "dining"], "demographics": "18-65", "geographic_scope": "US, EU"}',
 ARRAY['Peak shopping: Black Friday +340%', 'Sustainable brands +45% preference', 'Mobile commerce 78% of purchases'],
 ARRAY['Purchase frequency', 'Brand loyalty scores', 'Seasonal preferences', 'Price sensitivity', 'Channel preferences'],
 ARRAY['income_bracket', 'age_group', 'location', 'lifestyle_category'],
 149.99, 'standard', 'lifestyle', 89000, 87.2,
 ARRAY['Market segmentation', 'Trend analysis', 'Behavioral insights']);

-- Insert sample security events
INSERT INTO public.security_events (agent_name, action_type, result_data, severity) VALUES
('crazy_sentinel', 'anomaly_detection', '{"anomalies_detected": false, "risk_level": "low", "confidence_score": 0.95}', 'low'),
('crazy_gatekeeper', 'access_monitoring', '{"access_violation": false, "risk_assessment": "low", "compliance_status": "compliant"}', 'low'),
('crazy_shield', 'data_protection', '{"data_leak_risk": "low", "sensitive_data_detected": false, "egress_analysis": "authorized"}', 'low'),
('crazy_oracle', 'threat_prediction', '{"threat_predictions": ["No immediate threats"], "risk_forecast": "stable", "confidence_level": 0.87}', 'low');