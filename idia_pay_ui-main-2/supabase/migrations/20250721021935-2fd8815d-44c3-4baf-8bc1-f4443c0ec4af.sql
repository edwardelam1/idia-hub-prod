
-- Create market intelligence tables
CREATE TABLE IF NOT EXISTS public.market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_category TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  percentile_25 NUMERIC,
  percentile_50 NUMERIC,
  percentile_75 NUMERIC,
  percentile_90 NUMERIC,
  data_period DATE NOT NULL,
  geographic_region TEXT DEFAULT 'national',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competitive_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  metric_category TEXT NOT NULL,
  business_value NUMERIC NOT NULL,
  industry_average NUMERIC NOT NULL,
  percentile_rank INTEGER NOT NULL,
  competitive_gap NUMERIC NOT NULL,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.market_intelligence_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  bundle_id UUID NOT NULL,
  subscription_type TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhance AR tables for campaign management
ALTER TABLE public.ar_experiences 
ADD COLUMN IF NOT EXISTS campaign_id UUID,
ADD COLUMN IF NOT EXISTS creator_id UUID,
ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue_attributed NUMERIC DEFAULT 0;

-- Create AR campaign performance tracking
CREATE TABLE IF NOT EXISTS public.ar_campaign_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  business_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_interactions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  engagement_duration_avg INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE public.market_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitive_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_campaign_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public can view market benchmarks" 
ON public.market_benchmarks FOR SELECT USING (true);

CREATE POLICY "Business users can view their competitive analysis" 
ON public.competitive_analysis FOR ALL 
USING (business_id IN (
  SELECT business_id FROM business_users 
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Business users can manage their market intelligence subscriptions" 
ON public.market_intelligence_subscriptions FOR ALL 
USING (business_id IN (
  SELECT business_id FROM business_users 
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Business users can view their AR campaign performance" 
ON public.ar_campaign_performance FOR ALL 
USING (business_id IN (
  SELECT business_id FROM business_users 
  WHERE user_id = auth.uid() AND is_active = true
));
