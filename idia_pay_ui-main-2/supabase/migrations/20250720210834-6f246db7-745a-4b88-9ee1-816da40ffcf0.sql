
-- Insert sample inventory items for the business
INSERT INTO inventory_items (business_id, name, category, unit_of_measure, current_cost, par_level, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Premium Coffee Beans', 'Coffee', 'lbs', 12.50, 100, true),
('550e8400-e29b-41d4-a716-446655440001', 'Whole Milk', 'Dairy', 'gallons', 3.25, 20, true),
('550e8400-e29b-41d4-a716-446655440001', 'Sugar', 'Sweeteners', 'lbs', 2.50, 50, true),
('550e8400-e29b-41d4-a716-446655440001', 'Flour', 'Baking', 'lbs', 4.00, 75, true),
('550e8400-e29b-41d4-a716-446655440001', 'Eggs', 'Dairy', 'dozen', 3.50, 30, true),
('550e8400-e29b-41d4-a716-446655440001', 'Butter', 'Dairy', 'lbs', 5.25, 25, true),
('550e8400-e29b-41d4-a716-446655440001', 'Vanilla Extract', 'Flavorings', 'fl oz', 8.75, 10, true),
('550e8400-e29b-41d4-a716-446655440001', 'Chocolate Chips', 'Baking', 'lbs', 6.50, 40, true),
('550e8400-e29b-41d4-a716-446655440001', 'Fresh Basil', 'Herbs', 'bunches', 2.25, 15, true),
('550e8400-e29b-41d4-a716-446655440001', 'Olive Oil', 'Oils', 'liters', 12.00, 20, true)
ON CONFLICT (business_id, name) DO NOTHING;
