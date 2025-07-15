-- Enable RLS on staged_health_data if not already enabled
ALTER TABLE staged_health_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "System can insert staged health data" ON staged_health_data;
DROP POLICY IF EXISTS "System can read staged health data" ON staged_health_data;

-- Create comprehensive policies for staged_health_data
CREATE POLICY "Allow all operations for service role" 
ON staged_health_data 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow authenticated read access" 
ON staged_health_data 
FOR SELECT 
USING (true);