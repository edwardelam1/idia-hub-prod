
-- First, let's add some sample data to help with testing and ensure the app works properly

-- Insert sample businesses (these will be used for testing)
INSERT INTO businesses (id, name, business_type, email, phone, address, subscription_tier, data_coop_enabled, business_health_score)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Downtown Bistro', 'restaurant', 'contact@downtownbistro.com', '(555) 123-4567', '123 Main St, Downtown City, ST 12345', 'premium', true, 0.85),
  ('550e8400-e29b-41d4-a716-446655440001', 'Uptown Cafe', 'restaurant', 'info@uptowncafe.com', '(555) 987-6543', '456 Oak Ave, Uptown City, ST 67890', 'basic', false, 0.72)
ON CONFLICT (id) DO NOTHING;

-- Insert sample business locations
INSERT INTO business_locations (id, business_id, name, address, phone, manager_name, is_active)
VALUES 
  ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Downtown Bistro Main', '123 Main St, Downtown City, ST 12345', '(555) 123-4567', 'John Manager', true),
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Uptown Cafe Central', '456 Oak Ave, Uptown City, ST 67890', '(555) 987-6543', 'Jane Smith', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample inventory items
INSERT INTO inventory_items (id, business_id, name, category, unit_of_measure, current_cost, par_level, is_active)
VALUES 
  ('770e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Premium Coffee Beans', 'Beverages', 'lbs', 12.50, 20, true),
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Organic Milk', 'Dairy', 'gallons', 4.25, 15, true),
  ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Fresh Tomatoes', 'Produce', 'lbs', 3.75, 10, true),
  ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Mozzarella Cheese', 'Dairy', 'lbs', 8.99, 12, true),
  ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Flour', 'Baking', 'lbs', 2.50, 25, true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample recipes
INSERT INTO recipes (id, business_id, name, description, category, prep_time, cook_time, servings, difficulty, cost_per_serving, instructions, allergens)
VALUES 
  ('880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Classic Margherita Pizza', 'Traditional Italian pizza with fresh tomatoes, mozzarella, and basil', 'Main Course', 20, 15, 2, 'Medium', 8.50, '["Prepare pizza dough", "Spread tomato sauce", "Add mozzarella cheese", "Bake at 450°F for 12-15 minutes", "Garnish with fresh basil"]', '["gluten", "dairy"]'),
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Artisan Coffee Blend', 'Premium coffee made from our signature bean blend', 'Beverage', 5, 5, 1, 'Easy', 3.25, '["Grind coffee beans to medium coarseness", "Heat water to 195-205°F", "Pour water over grounds in circular motion", "Steep for 4 minutes", "Serve immediately"]', '["caffeine"]')
ON CONFLICT (id) DO NOTHING;

-- Insert sample recipe ingredients
INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, cost)
VALUES 
  ('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440002', 0.5, 'lbs', 1.88),
  ('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440003', 0.75, 'lbs', 6.74),
  ('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440004', 1.0, 'lbs', 2.50),
  ('990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440000', 0.25, 'lbs', 3.13)
ON CONFLICT (id) DO NOTHING;

-- Insert sample market benchmarks
INSERT INTO market_benchmarks (id, industry_category, metric_name, metric_value, percentile_25, percentile_50, percentile_75, percentile_90, data_period, geographic_region)
VALUES 
  ('aa0e8400-e29b-41d4-a716-446655440000', 'restaurant', 'average_ticket_size', 24.50, 18.75, 23.25, 28.50, 35.00, CURRENT_DATE, 'national'),
  ('aa0e8400-e29b-41d4-a716-446655440001', 'restaurant', 'customer_satisfaction', 4.2, 3.8, 4.1, 4.4, 4.7, CURRENT_DATE, 'national'),
  ('aa0e8400-e29b-41d4-a716-446655440002', 'restaurant', 'labor_cost_percentage', 28.5, 25.0, 28.0, 32.0, 38.0, CURRENT_DATE, 'national'),
  ('aa0e8400-e29b-41d4-a716-446655440003', 'restaurant', 'food_cost_percentage', 31.2, 28.0, 30.5, 34.0, 38.5, CURRENT_DATE, 'national')
ON CONFLICT (id) DO NOTHING;

-- Insert sample competitive analysis
INSERT INTO competitive_analysis (id, business_id, metric_category, business_value, industry_average, percentile_rank, competitive_gap, recommendations)
VALUES 
  ('bb0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'average_ticket_size', 26.75, 24.50, 68, 9.18, '["Focus on upselling premium items", "Implement combo meal offerings"]'),
  ('bb0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'customer_satisfaction', 4.3, 4.2, 72, 2.38, '["Maintain current service quality", "Consider loyalty program expansion"]'),
  ('bb0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'labor_cost_percentage', 26.8, 28.5, 78, -5.96, '["Optimize scheduling efficiency", "Cross-train staff for flexibility"]'),
  ('bb0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'food_cost_percentage', 29.4, 31.2, 65, -5.77, '["Negotiate better supplier rates", "Reduce food waste through better inventory management"]')
ON CONFLICT (id) DO NOTHING;

-- Create a function to get user's business ID (for easier testing)
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT business_id 
  FROM business_users 
  WHERE user_id = auth.uid() 
    AND is_active = true 
  LIMIT 1;
$$;

-- Insert sample business user associations (this will need to be updated with actual user IDs)
-- For now, we'll create a placeholder that can be updated when users sign up
CREATE TABLE IF NOT EXISTS temp_business_assignments (
  user_email TEXT PRIMARY KEY,
  business_id UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'owner'
);

INSERT INTO temp_business_assignments (user_email, business_id, role)
VALUES 
  ('demo@example.com', '550e8400-e29b-41d4-a716-446655440000', 'owner'),
  ('test@example.com', '550e8400-e29b-41d4-a716-446655440001', 'owner')
ON CONFLICT (user_email) DO NOTHING;
