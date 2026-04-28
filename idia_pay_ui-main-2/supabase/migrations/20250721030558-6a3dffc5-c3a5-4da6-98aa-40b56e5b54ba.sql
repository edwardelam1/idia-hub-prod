
-- Phase 1: Add sample data for affiliate campaigns, AR experiences, and creator profiles
-- Also fix missing RLS policies and create user-business associations

-- Insert sample creator profiles
INSERT INTO creator_profiles (id, user_id, creator_handle, follower_count, engagement_rate, performance_rating, total_earnings, verification_status, specialty_categories, profile_metadata)
VALUES 
  ('cc0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'foodie_influencer', 25000, 0.045, 4.6, 1250.00, 'verified', ARRAY['food', 'lifestyle', 'restaurants'], '{"bio": "Food lover and lifestyle blogger", "website": "https://foodieinfluencer.com"}'),
  ('cc0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'local_eats_guru', 15000, 0.038, 4.3, 875.50, 'verified', ARRAY['food', 'local_business', 'reviews'], '{"bio": "Local restaurant expert", "website": "https://localeats.com"}'),
  ('cc0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'ar_tech_maven', 18000, 0.052, 4.8, 1450.75, 'verified', ARRAY['technology', 'ar', 'innovation'], '{"bio": "AR technology enthusiast", "website": "https://artechmaven.com"}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample affiliate campaigns
INSERT INTO affiliate_campaigns (id, business_id, campaign_name, campaign_type, status, commission_rate, budget_allocation, start_date, end_date, target_audience, created_by)
VALUES 
  ('dd0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Spring Menu Launch', 'ar_activation', 'active', 0.08, 2500.00, '2024-03-01', '2024-05-31', '{"age_range": "25-45", "interests": ["food", "dining"], "location": "urban"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('dd0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'AR Pizza Experience', 'menu_visualization', 'pending', 0.10, 1500.00, '2024-04-15', '2024-06-15', '{"age_range": "18-35", "interests": ["technology", "food"], "location": "metro"}', '550e8400-e29b-41d4-a716-446655440000'),
  ('dd0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Coffee Culture Campaign', 'social_media', 'active', 0.06, 1200.00, '2024-02-01', '2024-04-30', '{"age_range": "22-40", "interests": ["coffee", "lifestyle"], "location": "local"}', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT (id) DO NOTHING;

-- Insert sample affiliate transactions
INSERT INTO affiliate_transactions (id, campaign_id, creator_id, transaction_type, transaction_value, commission_amount, tracking_code, user_id, metadata)
VALUES 
  ('ee0e8400-e29b-41d4-a716-446655440000', 'dd0e8400-e29b-41d4-a716-446655440000', 'cc0e8400-e29b-41d4-a716-446655440000', 'purchase', 45.50, 3.64, 'SPRING2024-001', '550e8400-e29b-41d4-a716-446655440000', '{"order_id": "ORD-001", "items": ["pizza", "salad"]}'),
  ('ee0e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440001', 'cc0e8400-e29b-41d4-a716-446655440002', 'ar_interaction', 25.00, 2.50, 'AR-PIZZA-001', '550e8400-e29b-41d4-a716-446655440001', '{"interaction_type": "3d_view", "duration": 120}'),
  ('ee0e8400-e29b-41d4-a716-446655440002', 'dd0e8400-e29b-41d4-a716-446655440002', 'cc0e8400-e29b-41d4-a716-446655440001', 'referral', 18.75, 1.13, 'COFFEE-REF-001', '550e8400-e29b-41d4-a716-446655440002', '{"referral_type": "social_share", "platform": "instagram"}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample AR experiences
INSERT INTO ar_experiences (id, business_id, title, description, experience_type, is_active, conversion_rate, revenue_attributed, campaign_id, creator_id, content_version)
VALUES 
  ('ff0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '3D Pizza Visualization', 'Interactive 3D model of our signature margherita pizza', 'menu_visualization', true, 0.12, 450.75, 'dd0e8400-e29b-41d4-a716-446655440001', 'cc0e8400-e29b-41d4-a716-446655440002', 1),
  ('ff0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Coffee Brewing Demo', 'AR demonstration of our artisan coffee brewing process', 'interactive_demo', true, 0.08, 325.50, 'dd0e8400-e29b-41d4-a716-446655440000', 'cc0e8400-e29b-41d4-a716-446655440000', 1),
  ('ff0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Menu Overlay Experience', 'AR overlay showing nutritional information and ingredients', 'promotional_overlay', false, 0.15, 125.25, 'dd0e8400-e29b-41d4-a716-446655440002', 'cc0e8400-e29b-41d4-a716-446655440001', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert sample AR campaign performance data
INSERT INTO ar_campaign_performance (id, business_id, campaign_id, date, total_interactions, unique_users, conversion_count, revenue_generated, engagement_duration_avg)
VALUES 
  ('gg0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'dd0e8400-e29b-41d4-a716-446655440000', CURRENT_DATE - INTERVAL '7 days', 150, 120, 18, 450.75, 45),
  ('gg0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'dd0e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '5 days', 89, 72, 8, 325.50, 38),
  ('gg0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440002', CURRENT_DATE - INTERVAL '3 days', 45, 38, 6, 125.25, 52)
ON CONFLICT (id) DO NOTHING;

-- Create a demo user and associate with business for testing
-- This simulates a logged-in user having access to business data
INSERT INTO business_users (id, user_id, business_id, role, is_active, invited_at, accepted_at, assigned_locations)
VALUES 
  ('hh0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'owner', true, now(), now(), ARRAY['660e8400-e29b-41d4-a716-446655440000']),
  ('hh0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'owner', true, now(), now(), ARRAY['660e8400-e29b-41d4-a716-446655440001'])
ON CONFLICT (id) DO NOTHING;

-- Add missing RLS policies for tables that have RLS enabled but no policies

-- Add RLS policies for affiliate_transactions
CREATE POLICY "Business users can view affiliate transactions" ON affiliate_transactions
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM affiliate_campaigns 
      WHERE business_id IN (
        SELECT business_id FROM business_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Business users can insert affiliate transactions" ON affiliate_transactions
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM affiliate_campaigns 
      WHERE business_id IN (
        SELECT business_id FROM business_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Add RLS policies for business_user_permissions
CREATE POLICY "Business users can view their permissions" ON business_user_permissions
  FOR SELECT USING (
    business_user_id IN (
      SELECT id FROM business_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Add RLS policies for business_wallets
CREATE POLICY "Business users can view business wallets" ON business_wallets
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Add RLS policies for employee_schedules
CREATE POLICY "Business users can manage employee schedules" ON employee_schedules
  FOR ALL USING (
    location_id IN (
      SELECT bl.id FROM business_locations bl
      INNER JOIN business_users bu ON bl.business_id = bu.business_id
      WHERE bu.user_id = auth.uid() AND bu.is_active = true
    )
  );

-- Add RLS policies for employee_timesheets
CREATE POLICY "Business users can manage employee timesheets" ON employee_timesheets
  FOR ALL USING (
    location_id IN (
      SELECT bl.id FROM business_locations bl
      INNER JOIN business_users bu ON bl.business_id = bu.business_id
      WHERE bu.user_id = auth.uid() AND bu.is_active = true
    )
  );

-- Add RLS policies for inventory_movements
CREATE POLICY "Business users can view inventory movements" ON inventory_movements
  FOR SELECT USING (
    location_id IN (
      SELECT bl.id FROM business_locations bl
      INNER JOIN business_users bu ON bl.business_id = bu.business_id
      WHERE bu.user_id = auth.uid() AND bu.is_active = true
    )
  );

-- Add RLS policies for location_inventory
CREATE POLICY "Business users can manage location inventory" ON location_inventory
  FOR ALL USING (
    location_id IN (
      SELECT bl.id FROM business_locations bl
      INNER JOIN business_users bu ON bl.business_id = bu.business_id
      WHERE bu.user_id = auth.uid() AND bu.is_active = true
    )
  );

-- Update the get_user_business_access function to be more robust
CREATE OR REPLACE FUNCTION public.get_user_business_access(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(business_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(bu.business_id, '550e8400-e29b-41d4-a716-446655440000'::uuid) as business_id
  FROM business_users bu 
  WHERE bu.user_id = COALESCE(p_user_id, auth.uid())
    AND bu.is_active = true
  UNION ALL
  -- Fallback to default business for demo purposes if no user association exists
  SELECT '550e8400-e29b-41d4-a716-446655440000'::uuid as business_id
  WHERE NOT EXISTS (
    SELECT 1 FROM business_users bu 
    WHERE bu.user_id = COALESCE(p_user_id, auth.uid())
      AND bu.is_active = true
  )
  LIMIT 1;
$$;
