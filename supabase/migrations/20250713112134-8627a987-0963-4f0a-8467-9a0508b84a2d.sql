-- Create remediation_plans table for security response management
CREATE TABLE public.remediation_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  security_event_id UUID REFERENCES public.security_events(id),
  title TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  explanation TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on remediation_plans
ALTER TABLE public.remediation_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for remediation_plans
CREATE POLICY "Authenticated users can view remediation plans" 
ON public.remediation_plans 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage remediation plans" 
ON public.remediation_plans 
FOR ALL 
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_remediation_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_remediation_plans_updated_at
  BEFORE UPDATE ON public.remediation_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_remediation_plans_updated_at();