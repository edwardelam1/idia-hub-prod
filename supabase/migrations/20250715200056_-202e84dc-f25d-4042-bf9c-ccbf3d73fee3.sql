-- Add RLS policy to allow system inserts to staged_health_data
CREATE POLICY "System can insert staged health data" 
ON staged_health_data 
FOR INSERT 
WITH CHECK (true);

-- Also allow reads for testing
CREATE POLICY "System can read staged health data" 
ON staged_health_data 
FOR SELECT 
USING (true);