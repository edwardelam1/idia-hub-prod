-- Add public read access to raw_health_data for dashboard display
-- This allows the health dashboard to show aggregated data without authentication

-- Add policy to allow public read access to raw_health_data
CREATE POLICY "Allow public read access to raw health data for dashboard"
ON raw_health_data
FOR SELECT
USING (true);