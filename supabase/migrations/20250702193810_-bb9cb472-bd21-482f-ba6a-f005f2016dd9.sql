-- Create security events table for Crazy 8 agents
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  result_data JSONB NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view security events
CREATE POLICY "Authenticated users can view security events"
ON public.security_events
FOR SELECT
TO authenticated
USING (true);

-- Create policy for system to insert security events
CREATE POLICY "System can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_security_events_timestamp ON public.security_events(timestamp DESC);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
CREATE INDEX idx_security_events_agent ON public.security_events(agent_name);

-- Insert some sample security events to demonstrate the system
INSERT INTO public.security_events (agent_name, action_type, result_data, severity) VALUES
('crazy_sentinel', 'anomaly_detection', '{"anomalies_detected": false, "risk_level": "low", "confidence_score": 0.95}', 'low'),
('crazy_gatekeeper', 'access_monitoring', '{"access_violation": false, "risk_assessment": "low", "compliance_status": "compliant"}', 'low'),
('crazy_shield', 'data_protection', '{"data_leak_risk": "low", "sensitive_data_detected": false, "egress_analysis": "authorized"}', 'low'),
('crazy_oracle', 'threat_prediction', '{"threat_predictions": ["No immediate threats"], "risk_forecast": "stable", "confidence_level": 0.87}', 'low');