
-- Add synapse_weight_coefficient to staged_health_data
ALTER TABLE public.staged_health_data 
ADD COLUMN IF NOT EXISTS synapse_weight_coefficient NUMERIC DEFAULT NULL;

-- Add synapse_weight_coefficient to staged_lifestyle_data
ALTER TABLE public.staged_lifestyle_data 
ADD COLUMN IF NOT EXISTS synapse_weight_coefficient NUMERIC DEFAULT NULL;
