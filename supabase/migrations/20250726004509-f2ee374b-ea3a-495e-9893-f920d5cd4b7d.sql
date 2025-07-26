-- Create diverse sample data for marketplace bundles
-- Insert sample health data with different categories
INSERT INTO staged_health_data (
  pseudo_user_id, activity_type, device_type, steps_count, average_heartrate, 
  distance_meters, calories_burned, duration_seconds, data_quality_score,
  height_cm, weight_kg, body_mass_index, vo2_max, sleep_duration,
  dietary_energy_kcal, protein_g, fiber_g, vitamin_c_mg, calcium_mg
) VALUES 
-- Fitness enthusiast data
('user_001_fitness', 'Run', 'Apple Watch', 12500, 165, 8500, 650, 3600, 0.95, 175, 72, 23.5, 55, NULL, NULL, NULL, NULL, NULL, NULL),
('user_001_fitness', 'Bike', 'Garmin', 2500, 145, 25000, 890, 5400, 0.92, 175, 72, 23.5, 55, NULL, NULL, NULL, NULL, NULL, NULL),
('user_001_fitness', 'Swim', 'Apple Watch', 800, 140, 2000, 420, 2400, 0.88, 175, 72, 23.5, 55, NULL, NULL, NULL, NULL, NULL, NULL),

-- Health tracker data  
('user_002_health', 'daily_activity', 'iPhone Health', 8500, 78, 6200, 320, NULL, 0.75, 165, 58, 21.3, NULL, 480, 1850, 85, 28, 120, 900),
('user_002_health', 'Walk', 'iPhone Health', 6200, 85, 4500, 280, 3000, 0.80, 165, 58, 21.3, NULL, 510, 1650, 75, 22, 95, 850),

-- Nutrition focused data
('user_003_nutrition', 'daily_activity', 'iPhone Health', 7200, 72, 5500, 300, NULL, 0.70, 170, 65, 22.5, NULL, NULL, 2100, 120, 35, 150, 1200),
('user_003_nutrition', 'Workout', 'Apple Watch', 1200, 155, 800, 450, 2700, 0.85, 170, 65, 22.5, NULL, NULL, 2300, 130, 40, 180, 1100),

-- Sleep focused data
('user_004_sleep', 'daily_activity', 'iPhone Health', 6800, 68, 4200, 250, NULL, 0.65, 168, 62, 22.0, NULL, 420, NULL, NULL, NULL, NULL, NULL),
('user_004_sleep', 'health_metrics', 'Sleep Tracker', NULL, 55, NULL, NULL, NULL, 0.90, 168, 62, 22.0, NULL, 465, NULL, NULL, NULL, NULL, NULL);

-- Insert sample lifestyle data  
INSERT INTO staged_lifestyle_data (
  pseudo_user_id, event_category, event_type, device_type, data_quality_score, 
  duration_minutes, location_zone, social_context, activity_intensity
) VALUES 
('user_005_social', 'social', 'social_gathering', 'iPhone', 0.85, 180, 'ZONE_downtown', 'friends', 'moderate'),
('user_005_social', 'social', 'dining_out', 'iPhone', 0.80, 90, 'ZONE_restaurant', 'family', 'low'),
('user_006_digital', 'digital', 'screen_time', 'iPhone', 0.75, 420, 'ZONE_home', 'alone', 'low'),
('user_006_digital', 'behavioral', 'commute', 'iPhone', 0.70, 45, 'ZONE_transit', 'alone', 'low'),
('user_007_location', 'location', 'travel', 'iPhone', 0.90, 240, 'ZONE_airport', 'business', 'moderate');

-- Insert sample business data
INSERT INTO staged_business_data (
  business_category, transaction_amount, transaction_type, payment_method,
  customer_age_range, location_type, data_quality_score, processing_time_ms
) VALUES 
('Restaurant', 45.50, 'pos_transaction', 'idia_pay', '25-34', 'urban', 0.95, 1200),
('Restaurant', 78.25, 'pos_transaction', 'credit_card', '35-44', 'suburban', 0.90, 850),
('Retail', 124.99, 'pos_transaction', 'idia_pay', '18-24', 'mall', 0.88, 1100),
('Retail', 89.75, 'pos_transaction', 'debit_card', '45-54', 'urban', 0.85, 950),
('AR Experience', 15.00, 'ar_purchase', 'idia_pay', '25-34', 'entertainment', 0.92, 750),
('Service Business', 250.00, 'service_booking', 'credit_card', '35-44', 'professional', 0.90, 1300);