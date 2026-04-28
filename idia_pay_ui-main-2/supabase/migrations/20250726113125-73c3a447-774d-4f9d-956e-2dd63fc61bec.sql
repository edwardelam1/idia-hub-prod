-- Comprehensive Warehouse Management Simulation Data Migration
-- Phase 1-4: Complete implementation without disrupting Synapse flow

-- Phase 1: Data Foundation
-- Add comprehensive inventory items for both businesses
INSERT INTO inventory_items (id, business_id, name, category, sku, unit_of_measure, current_cost, par_level, reorder_point, max_level, current_stock, is_active)
VALUES 
  -- Business 1 inventory (Restaurant/Food Service)
  ('11111111-1111-1111-1111-111111111001', '550e8400-e29b-41d4-a716-446655440001', 'Organic Tomatoes', 'Produce', 'PROD-TOM-001', 'lbs', 4.50, 25, 15, 50, 12, true),
  ('11111111-1111-1111-1111-111111111002', '550e8400-e29b-41d4-a716-446655440001', 'Fresh Bread Loaves', 'Bakery', 'BAKE-BRD-001', 'each', 3.25, 20, 10, 40, 8, true),
  ('11111111-1111-1111-1111-111111111003', '550e8400-e29b-41d4-a716-446655440001', 'Craft Beer 6-Pack', 'Beverages', 'BEV-BEER-001', 'packs', 12.99, 30, 20, 60, 18, true),
  ('11111111-1111-1111-1111-111111111004', '550e8400-e29b-41d4-a716-446655440001', 'Paper Cups', 'Supplies', 'SUP-CUP-001', 'sleeves', 8.50, 25, 15, 50, 22, true),
  ('11111111-1111-1111-1111-111111111005', '550e8400-e29b-41d4-a716-446655440001', 'Napkins', 'Supplies', 'SUP-NAP-001', 'packs', 5.75, 30, 20, 60, 28, true),
  ('11111111-1111-1111-1111-111111111006', '550e8400-e29b-41d4-a716-446655440001', 'Sparkling Water Case', 'Beverages', 'BEV-SPAR-001', 'cases', 18.99, 15, 10, 30, 6, true),
  ('11111111-1111-1111-1111-111111111007', '550e8400-e29b-41d4-a716-446655440001', 'Energy Drinks', 'Beverages', 'BEV-ENRG-001', 'cases', 24.99, 10, 5, 20, 3, true),
  ('11111111-1111-1111-1111-111111111008', '550e8400-e29b-41d4-a716-446655440001', 'Cleaning Supplies', 'Supplies', 'SUP-CLN-001', 'bottles', 15.25, 12, 8, 25, 11, true),
  ('11111111-1111-1111-1111-111111111009', '550e8400-e29b-41d4-a716-446655440001', 'Fresh Lettuce', 'Produce', 'PROD-LET-001', 'heads', 2.75, 25, 15, 50, 14, true),
  ('11111111-1111-1111-1111-111111111010', '550e8400-e29b-41d4-a716-446655440001', 'Sandwich Wraps', 'Bakery', 'BAKE-WRP-001', 'packs', 6.50, 20, 12, 40, 9, true),
  
  -- Business 2 inventory (Retail/Market)  
  ('22222222-2222-2222-2222-222222222001', '550e8400-e29b-41d4-a716-446655440002', 'Premium Coffee Beans', 'Beverages', 'BEV-COF-001', 'lbs', 16.99, 15, 10, 30, 7, true),
  ('22222222-2222-2222-2222-222222222002', '550e8400-e29b-41d4-a716-446655440002', 'Artisan Chocolates', 'Confectionery', 'CONF-CHO-001', 'boxes', 24.50, 12, 8, 25, 5, true),
  ('22222222-2222-2222-2222-222222222003', '550e8400-e29b-41d4-a716-446655440002', 'Local Honey', 'Condiments', 'COND-HON-001', 'jars', 12.75, 20, 12, 40, 16, true),
  ('22222222-2222-2222-2222-222222222004', '550e8400-e29b-41d4-a716-446655440002', 'Gift Bags', 'Packaging', 'PKG-BAG-001', 'units', 2.99, 50, 30, 100, 45, true),
  ('22222222-2222-2222-2222-222222222005', '550e8400-e29b-41d4-a716-446655440002', 'Promotional Stickers', 'Marketing', 'MKT-STK-001', 'sheets', 1.50, 100, 60, 200, 85, true)
ON CONFLICT (id) DO NOTHING;

-- Create warehouse bins infrastructure
INSERT INTO warehouse_bins (id, business_id, location_id, bin_code, zone, aisle, shelf, bin_type, capacity_cubic_feet, temperature_controlled, is_active)
VALUES 
  -- Business 1 warehouse layout
  ('11111111-aaaa-bbbb-cccc-111111111001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'A-01-01', 'A', '01', '01', 'pick', 50.0, false, true),
  ('11111111-aaaa-bbbb-cccc-111111111002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'A-01-02', 'A', '01', '02', 'pick', 50.0, false, true),
  ('11111111-aaaa-bbbb-cccc-111111111003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'A-02-01', 'A', '02', '01', 'standard', 40.0, true, true),
  ('11111111-aaaa-bbbb-cccc-111111111004', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'B-01-01', 'B', '01', '01', 'standard', 60.0, false, true),
  ('11111111-aaaa-bbbb-cccc-111111111005', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'B-01-02', 'B', '01', '02', 'bulk', 100.0, false, true),
  ('11111111-aaaa-bbbb-cccc-111111111006', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'B-02-01', 'B', '02', '01', 'standard', 50.0, false, true),
  ('11111111-aaaa-bbbb-cccc-111111111007', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'C-01-01', 'C', '01', '01', 'standard', 45.0, false, true),
  ('11111111-aaaa-bbbb-cccc-111111111008', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'C-01-02', 'C', '01', '02', 'reserve', 45.0, false, true),
  ('11111111-aaaa-bbbb-cccc-111111111009', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'RECV-01', 'RECEIVING', '01', '01', 'staging', 80.0, false, true),
  ('11111111-aaaa-bbbb-cccc-111111111010', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'SHIP-01', 'SHIPPING', '01', '01', 'staging', 80.0, false, true),
  
  -- Business 2 warehouse layout
  ('22222222-aaaa-bbbb-cccc-222222222001', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'X-01-01', 'X', '01', '01', 'pick', 30.0, false, true),
  ('22222222-aaaa-bbbb-cccc-222222222002', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'X-01-02', 'X', '01', '02', 'standard', 30.0, false, true),
  ('22222222-aaaa-bbbb-cccc-222222222003', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'Y-01-01', 'Y', '01', '01', 'bulk', 60.0, false, true),
  ('22222222-aaaa-bbbb-cccc-222222222004', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'RECV-01', 'RECEIVING', '01', '01', 'staging', 50.0, false, true),
  ('22222222-aaaa-bbbb-cccc-222222222005', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'SHIP-01', 'SHIPPING', '01', '01', 'staging', 50.0, false, true)
ON CONFLICT (id) DO NOTHING;

-- Phase 2: Operational Workflows
-- Create bin assignments for existing inventory
INSERT INTO bin_assignments (id, warehouse_bin_id, inventory_item_id, quantity, reserved_quantity, is_primary_location)
VALUES 
  -- Business 1 bin assignments
  ('11111111-dddd-eeee-ffff-111111111001', '11111111-aaaa-bbbb-cccc-111111111001', '11111111-1111-1111-1111-111111111001', 12, 3, true),
  ('11111111-dddd-eeee-ffff-111111111002', '11111111-aaaa-bbbb-cccc-111111111003', '11111111-1111-1111-1111-111111111002', 8, 2, true),
  ('11111111-dddd-eeee-ffff-111111111003', '11111111-aaaa-bbbb-cccc-111111111004', '11111111-1111-1111-1111-111111111003', 18, 5, true),
  ('11111111-dddd-eeee-ffff-111111111004', '11111111-aaaa-bbbb-cccc-111111111005', '11111111-1111-1111-1111-111111111004', 22, 0, true),
  ('11111111-dddd-eeee-ffff-111111111005', '11111111-aaaa-bbbb-cccc-111111111006', '11111111-1111-1111-1111-111111111005', 28, 4, true),
  ('11111111-dddd-eeee-ffff-111111111006', '11111111-aaaa-bbbb-cccc-111111111007', '11111111-1111-1111-1111-111111111006', 6, 2, true),
  ('11111111-dddd-eeee-ffff-111111111007', '11111111-aaaa-bbbb-cccc-111111111008', '11111111-1111-1111-1111-111111111007', 3, 1, true),
  ('11111111-dddd-eeee-ffff-111111111008', '11111111-aaaa-bbbb-cccc-111111111002', '11111111-1111-1111-1111-111111111008', 11, 0, true),
  ('11111111-dddd-eeee-ffff-111111111009', '11111111-aaaa-bbbb-cccc-111111111001', '11111111-1111-1111-1111-111111111009', 14, 3, true),
  ('11111111-dddd-eeee-ffff-111111111010', '11111111-aaaa-bbbb-cccc-111111111003', '11111111-1111-1111-1111-111111111010', 9, 1, true),
  
  -- Business 2 bin assignments
  ('22222222-dddd-eeee-ffff-222222222001', '22222222-aaaa-bbbb-cccc-222222222001', '22222222-2222-2222-2222-222222222001', 7, 2, true),
  ('22222222-dddd-eeee-ffff-222222222002', '22222222-aaaa-bbbb-cccc-222222222002', '22222222-2222-2222-2222-222222222002', 5, 1, true),
  ('22222222-dddd-eeee-ffff-222222222003', '22222222-aaaa-bbbb-cccc-222222222001', '22222222-2222-2222-2222-222222222003', 16, 0, true),
  ('22222222-dddd-eeee-ffff-222222222004', '22222222-aaaa-bbbb-cccc-222222222003', '22222222-2222-2222-2222-222222222004', 45, 5, true),
  ('22222222-dddd-eeee-ffff-222222222005', '22222222-aaaa-bbbb-cccc-222222222003', '22222222-2222-2222-2222-222222222005', 85, 10, true)
ON CONFLICT (id) DO NOTHING;

-- Create purchase orders
INSERT INTO purchase_orders (id, business_id, location_id, po_number, supplier_name, supplier_contact, order_date, expected_delivery_date, status, total_amount, notes)
VALUES 
  -- Business 1 purchase orders
  ('11111111-gggg-hhhh-iiii-111111111001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PO-2024-001', 'Fresh Foods Wholesale', '{"email": "orders@freshfoods.com", "phone": "(555) 123-4567"}', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE, 'in_transit', 245.75, 'Rush delivery for weekend special'),
  ('11111111-gggg-hhhh-iiii-111111111002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PO-2024-002', 'Beverage Distributors Co', '{"email": "supply@bevdist.com", "phone": "(555) 234-5678"}', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', 'pending', 189.50, 'Standard beverage restock'),
  ('11111111-gggg-hhhh-iiii-111111111003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PO-2024-003', 'Restaurant Supply Pro', '{"email": "sales@restsupply.com", "phone": "(555) 345-6789"}', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '1 day', 'partially_received', 156.25, 'Supplies and cleaning materials'),
  
  -- Business 2 purchase orders
  ('22222222-gggg-hhhh-iiii-222222222001', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'PO-2024-101', 'Artisan Goods Supplier', '{"email": "orders@artisangoods.com", "phone": "(555) 987-6543"}', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', 'pending', 312.80, 'Premium product restocking'),
  ('22222222-gggg-hhhh-iiii-222222222002', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'PO-2024-102', 'Local Producers Network', '{"email": "supply@localnet.com", "phone": "(555) 456-7890"}', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 'pending', 78.99, 'Local honey and seasonal items')
ON CONFLICT (id) DO NOTHING;

-- Create purchase order line items
INSERT INTO purchase_order_line_items (id, purchase_order_id, inventory_item_id, sku, item_name, ordered_quantity, received_quantity, unit_cost, line_total)
VALUES 
  -- PO-2024-001 line items (Fresh Foods - in_transit)
  ('11111111-jjjj-kkkk-llll-111111111001', '11111111-gggg-hhhh-iiii-111111111001', '11111111-1111-1111-1111-111111111001', 'PROD-TOM-001', 'Organic Tomatoes', 20, 0, 4.50, 90.00),
  ('11111111-jjjj-kkkk-llll-111111111002', '11111111-gggg-hhhh-iiii-111111111001', '11111111-1111-1111-1111-111111111009', 'PROD-LET-001', 'Fresh Lettuce', 25, 0, 2.75, 68.75),
  ('11111111-jjjj-kkkk-llll-111111111003', '11111111-gggg-hhhh-iiii-111111111001', '11111111-1111-1111-1111-111111111002', 'BAKE-BRD-001', 'Fresh Bread Loaves', 20, 0, 3.25, 65.00),
  
  -- PO-2024-002 line items (Beverage Distributors - pending)
  ('11111111-jjjj-kkkk-llll-111111111004', '11111111-gggg-hhhh-iiii-111111111002', '11111111-1111-1111-1111-111111111003', 'BEV-BEER-001', 'Craft Beer 6-Pack', 8, 0, 12.99, 103.92),
  ('11111111-jjjj-kkkk-llll-111111111005', '11111111-gggg-hhhh-iiii-111111111002', '11111111-1111-1111-1111-111111111006', 'BEV-SPAR-001', 'Sparkling Water Case', 6, 0, 18.99, 113.94),
  
  -- PO-2024-003 line items (Restaurant Supply - partially_received)
  ('11111111-jjjj-kkkk-llll-111111111006', '11111111-gggg-hhhh-iiii-111111111003', '11111111-1111-1111-1111-111111111004', 'SUP-CUP-001', 'Paper Cups', 15, 12, 8.50, 127.50),
  ('11111111-jjjj-kkkk-llll-111111111007', '11111111-gggg-hhhh-iiii-111111111003', '11111111-1111-1111-1111-111111111005', 'SUP-NAP-001', 'Napkins', 10, 10, 5.75, 57.50),
  
  -- Business 2 purchase order line items
  ('22222222-jjjj-kkkk-llll-222222222001', '22222222-gggg-hhhh-iiii-222222222001', '22222222-2222-2222-2222-222222222001', 'BEV-COF-001', 'Premium Coffee Beans', 12, 0, 16.99, 203.88),
  ('22222222-jjjj-kkkk-llll-222222222002', '22222222-gggg-hhhh-iiii-222222222001', '22222222-2222-2222-2222-222222222002', 'CONF-CHO-001', 'Artisan Chocolates', 8, 0, 24.50, 196.00),
  ('22222222-jjjj-kkkk-llll-222222222003', '22222222-gggg-hhhh-iiii-222222222002', '22222222-2222-2222-2222-222222222003', 'COND-HON-001', 'Local Honey', 10, 0, 12.75, 127.50)
ON CONFLICT (id) DO NOTHING;

-- Create pick lists for various scenarios
INSERT INTO pick_lists (id, business_id, location_id, pick_list_number, pick_method, priority, status, created_by, assigned_to, estimated_time_minutes, route_optimization)
VALUES 
  -- Business 1 pick lists
  ('11111111-mmmm-nnnn-oooo-111111111001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PICK-001', 'single_order', 'urgent', 'pending', NULL, NULL, 15, true),
  ('11111111-mmmm-nnnn-oooo-111111111002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PICK-002', 'batch', 'high', 'in_progress', NULL, NULL, 25, true),
  ('11111111-mmmm-nnnn-oooo-111111111003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PICK-003', 'wave', 'normal', 'pending', NULL, NULL, 35, true),
  
  -- Business 2 pick lists
  ('22222222-mmmm-nnnn-oooo-222222222001', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'PICK-101', 'single_order', 'high', 'pending', NULL, NULL, 12, true),
  ('22222222-mmmm-nnnn-oooo-222222222002', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'PICK-102', 'batch', 'normal', 'assigned', NULL, NULL, 18, false)
ON CONFLICT (id) DO NOTHING;

-- Create pick list items
INSERT INTO pick_list_items (id, pick_list_id, inventory_item_id, warehouse_bin_id, quantity_to_pick, quantity_picked, pick_sequence, pick_status)
VALUES 
  -- PICK-001 items (urgent single order)
  ('11111111-pppp-qqqq-rrrr-111111111001', '11111111-mmmm-nnnn-oooo-111111111001', '11111111-1111-1111-1111-111111111001', '11111111-aaaa-bbbb-cccc-111111111001', 5, 0, 1, 'pending'),
  ('11111111-pppp-qqqq-rrrr-111111111002', '11111111-mmmm-nnnn-oooo-111111111001', '11111111-1111-1111-1111-111111111003', '11111111-aaaa-bbbb-cccc-111111111004', 3, 0, 2, 'pending'),
  
  -- PICK-002 items (batch in progress)
  ('11111111-pppp-qqqq-rrrr-111111111003', '11111111-mmmm-nnnn-oooo-111111111002', '11111111-1111-1111-1111-111111111004', '11111111-aaaa-bbbb-cccc-111111111005', 10, 8, 1, 'partial'),
  ('11111111-pppp-qqqq-rrrr-111111111004', '11111111-mmmm-nnnn-oooo-111111111002', '11111111-1111-1111-1111-111111111005', '11111111-aaaa-bbbb-cccc-111111111006', 6, 6, 2, 'completed'),
  ('11111111-pppp-qqqq-rrrr-111111111005', '11111111-mmmm-nnnn-oooo-111111111002', '11111111-1111-1111-1111-111111111002', '11111111-aaaa-bbbb-cccc-111111111003', 4, 0, 3, 'pending'),
  
  -- Business 2 pick list items
  ('22222222-pppp-qqqq-rrrr-222222222001', '22222222-mmmm-nnnn-oooo-222222222001', '22222222-2222-2222-2222-222222222001', '22222222-aaaa-bbbb-cccc-222222222001', 3, 0, 1, 'pending'),
  ('22222222-pppp-qqqq-rrrr-222222222002', '22222222-mmmm-nnnn-oooo-222222222002', '22222222-2222-2222-2222-222222222003', '22222222-aaaa-bbbb-cccc-222222222001', 8, 2, 1, 'partial'),
  ('22222222-pppp-qqqq-rrrr-222222222003', '22222222-mmmm-nnnn-oooo-222222222002', '22222222-2222-2222-2222-222222222004', '22222222-aaaa-bbbb-cccc-222222222003', 15, 0, 2, 'pending')
ON CONFLICT (id) DO NOTHING;

-- Create warehouse tasks for put-away operations
INSERT INTO warehouse_tasks (id, business_id, location_id, task_type, priority, status, reference_type, reference_id, assigned_to, estimated_time_minutes, instructions)
VALUES 
  -- Business 1 warehouse tasks
  ('11111111-ssss-tttt-uuuu-111111111001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'put_away', 'high', 'pending', 'purchase_order_line_item', '11111111-jjjj-kkkk-llll-111111111006', NULL, 10, 'Put away 12 sleeves of paper cups to Zone A'),
  ('11111111-ssss-tttt-uuuu-111111111002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'put_away', 'normal', 'assigned', 'purchase_order_line_item', '11111111-jjjj-kkkk-llll-111111111007', NULL, 8, 'Put away 10 packs of napkins to Zone B'),
  ('11111111-ssss-tttt-uuuu-111111111003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'replenishment', 'low', 'pending', 'inventory_reorder', NULL, NULL, 15, 'Move items from bulk to picking locations'),
  ('11111111-ssss-tttt-uuuu-111111111004', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'pick_and_pack', 'urgent', 'completed', 'pick_list', '11111111-mmmm-nnnn-oooo-111111111002', NULL, 12, 'Complete picking for batch order'),
  
  -- Business 2 warehouse tasks
  ('22222222-ssss-tttt-uuuu-222222222001', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'put_away', 'normal', 'pending', 'cycle_count', NULL, NULL, 5, 'Put away counted inventory items'),
  ('22222222-ssss-tttt-uuuu-222222222002', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'quality_check', 'high', 'in_progress', 'purchase_order', '22222222-gggg-hhhh-iiii-222222222001', NULL, 20, 'Quality check artisan products')
ON CONFLICT (id) DO NOTHING;

-- Phase 3: Advanced Operations
-- Create shipments for shipping operations
INSERT INTO shipments (id, business_id, location_id, shipment_number, customer_name, customer_address, customer_phone, carrier, tracking_number, status, weight_lbs, shipping_cost, estimated_delivery_date)
VALUES 
  -- Business 1 shipments
  ('11111111-vvvv-wwww-xxxx-111111111001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'SHIP-001', 'Downtown Restaurant', '456 Business Ave, Downtown, ST 12345', '(555) 234-5678', 'FedEx', 'FDX789012345', 'preparing', 25.5, 18.50, CURRENT_DATE + INTERVAL '2 days'),
  ('11111111-vvvv-wwww-xxxx-111111111002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'SHIP-002', 'Uptown Cafe', '789 North St, Uptown, ST 67890', '(555) 345-6789', 'UPS', 'UPS456789012', 'ready_to_ship', 18.2, 15.75, CURRENT_DATE + INTERVAL '1 day'),
  ('11111111-vvvv-wwww-xxxx-111111111003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'SHIP-003', 'Local Deli', '321 Main Street, Local, ST 11111', '(555) 456-7890', 'Local Delivery', 'LD-2024-001', 'shipped', 12.8, 8.00, CURRENT_DATE),
  
  -- Business 2 shipments
  ('22222222-vvvv-wwww-xxxx-222222222001', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'SHIP-101', 'Coffee Shop Chain', '555 Coffee St, Metro, ST 44444', '(555) 777-8888', 'DHL', 'DHL345678901', 'preparing', 15.3, 22.25, CURRENT_DATE + INTERVAL '3 days'),
  ('22222222-vvvv-wwww-xxxx-222222222002', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'SHIP-102', 'Boutique Market', '123 Boutique Ave, Upscale, ST 55555', '(555) 888-9999', 'FedEx', 'FDX567890123', 'ready_to_ship', 8.7, 16.80, CURRENT_DATE + INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Create shipment line items
INSERT INTO shipment_line_items (id, shipment_id, inventory_item_id, quantity, weight_lbs, notes)
VALUES 
  -- Business 1 shipment items
  ('11111111-yyyy-zzzz-aaaa-111111111001', '11111111-vvvv-wwww-xxxx-111111111001', '11111111-1111-1111-1111-111111111001', 8, 12.0, 'Premium tomatoes for restaurant'),
  ('11111111-yyyy-zzzz-aaaa-111111111002', '11111111-vvvv-wwww-xxxx-111111111001', '11111111-1111-1111-1111-111111111003', 3, 13.5, 'Craft beer selection'),
  ('11111111-yyyy-zzzz-aaaa-111111111003', '11111111-vvvv-wwww-xxxx-111111111002', '11111111-1111-1111-1111-111111111002', 12, 9.0, 'Fresh bread delivery'),
  ('11111111-yyyy-zzzz-aaaa-111111111004', '11111111-vvvv-wwww-xxxx-111111111002', '11111111-1111-1111-1111-111111111010', 6, 9.2, 'Sandwich wraps'),
  ('11111111-yyyy-zzzz-aaaa-111111111005', '11111111-vvvv-wwww-xxxx-111111111003', '11111111-1111-1111-1111-111111111004', 5, 6.5, 'Paper supplies'),
  ('11111111-yyyy-zzzz-aaaa-111111111006', '11111111-vvvv-wwww-xxxx-111111111003', '11111111-1111-1111-1111-111111111005', 4, 6.3, 'Napkins'),
  
  -- Business 2 shipment items
  ('22222222-yyyy-zzzz-aaaa-222222222001', '22222222-vvvv-wwww-xxxx-222222222001', '22222222-2222-2222-2222-222222222001', 5, 8.5, 'Premium coffee beans'),
  ('22222222-yyyy-zzzz-aaaa-222222222002', '22222222-vvvv-wwww-xxxx-222222222001', '22222222-2222-2222-2222-222222222002', 3, 6.8, 'Artisan chocolates'),
  ('22222222-yyyy-zzzz-aaaa-222222222003', '22222222-vvvv-wwww-xxxx-222222222002', '22222222-2222-2222-2222-222222222003', 6, 4.5, 'Local honey jars'),
  ('22222222-yyyy-zzzz-aaaa-222222222004', '22222222-vvvv-wwww-xxxx-222222222002', '22222222-2222-2222-2222-222222222004', 10, 4.2, 'Gift packaging')
ON CONFLICT (id) DO NOTHING;

-- Create cycle counts for inventory management
INSERT INTO cycle_counts (id, business_id, location_id, count_number, count_type, status, scheduled_date, created_by, assigned_to, total_items, items_counted, discrepancies_found, accuracy_percentage)
VALUES 
  -- Business 1 cycle counts
  ('11111111-bbbb-cccc-dddd-111111111001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'CC-2024-001', 'cycle', 'scheduled', CURRENT_DATE, NULL, NULL, 8, 0, 0, NULL),
  ('11111111-bbbb-cccc-dddd-111111111002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'CC-2024-002', 'spot', 'in_progress', CURRENT_DATE, NULL, NULL, 5, 3, 1, 60.0),
  ('11111111-bbbb-cccc-dddd-111111111003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'CC-2024-003', 'abc_analysis', 'scheduled', CURRENT_DATE + INTERVAL '1 day', NULL, NULL, 10, 0, 0, NULL),
  
  -- Business 2 cycle counts
  ('22222222-bbbb-cccc-dddd-222222222001', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'CC-2024-101', 'cycle', 'scheduled', CURRENT_DATE + INTERVAL '1 day', NULL, NULL, 5, 0, 0, NULL),
  ('22222222-bbbb-cccc-dddd-222222222002', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', 'CC-2024-102', 'full', 'scheduled', CURRENT_DATE + INTERVAL '2 days', NULL, NULL, 5, 0, 0, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create cycle count items
INSERT INTO cycle_count_items (id, cycle_count_id, inventory_item_id, warehouse_bin_id, expected_quantity, counted_quantity, variance, variance_value, status, counted_at, counted_by, notes)
VALUES 
  -- Business 1 cycle count items
  ('11111111-eeee-ffff-gggg-111111111001', '11111111-bbbb-cccc-dddd-111111111001', '11111111-1111-1111-1111-111111111001', '11111111-aaaa-bbbb-cccc-111111111001', 12, NULL, NULL, NULL, 'pending', NULL, NULL, 'High-velocity produce item'),
  ('11111111-eeee-ffff-gggg-111111111002', '11111111-bbbb-cccc-dddd-111111111001', '11111111-1111-1111-1111-111111111003', '11111111-aaaa-bbbb-cccc-111111111004', 18, NULL, NULL, NULL, 'pending', NULL, NULL, 'Beverage inventory check'),
  ('11111111-eeee-ffff-gggg-111111111003', '11111111-bbbb-cccc-dddd-111111111002', '11111111-1111-1111-1111-111111111005', '11111111-aaaa-bbbb-cccc-111111111006', 28, 26, -2, -11.50, 'counted', CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL, 'Slight shortage in napkins'),
  ('11111111-eeee-ffff-gggg-111111111004', '11111111-bbbb-cccc-dddd-111111111002', '11111111-1111-1111-1111-111111111002', '11111111-aaaa-bbbb-cccc-111111111003', 8, 8, 0, 0.00, 'counted', CURRENT_TIMESTAMP - INTERVAL '30 minutes', NULL, 'Count matches expected'),
  ('11111111-eeee-ffff-gggg-111111111005', '11111111-bbbb-cccc-dddd-111111111002', '11111111-1111-1111-1111-111111111009', '11111111-aaaa-bbbb-cccc-111111111001', 14, 16, 2, 5.50, 'counted', CURRENT_TIMESTAMP - INTERVAL '15 minutes', NULL, 'Extra lettuce found'),
  
  -- Business 2 cycle count items
  ('22222222-eeee-ffff-gggg-222222222001', '22222222-bbbb-cccc-dddd-222222222001', '22222222-2222-2222-2222-222222222001', '22222222-aaaa-bbbb-cccc-222222222001', 7, NULL, NULL, NULL, 'pending', NULL, NULL, 'Premium coffee inventory'),
  ('22222222-eeee-ffff-gggg-222222222002', '22222222-bbbb-cccc-dddd-222222222001', '22222222-2222-2222-2222-222222222003', '22222222-aaaa-bbbb-cccc-222222222001', 16, NULL, NULL, NULL, 'pending', NULL, NULL, 'Local honey stock count')
ON CONFLICT (id) DO NOTHING;

-- Create some receiving discrepancies for realistic scenarios
INSERT INTO receiving_discrepancies (id, business_id, location_id, purchase_order_line_item_id, discrepancy_type, expected_quantity, received_quantity, variance_quantity, unit_cost, total_impact, description, reported_by)
VALUES 
  -- Business 1 discrepancies
  ('11111111-hhhh-iiii-jjjj-111111111001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', '11111111-jjjj-kkkk-llll-111111111006', 'shortage', 15, 12, -3, 8.50, -25.50, 'Missing 3 sleeves of cups from delivery', NULL),
  ('11111111-hhhh-iiii-jjjj-111111111002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', '11111111-jjjj-kkkk-llll-111111111007', 'overage', 10, 12, 2, 5.75, 11.50, 'Received extra napkin packs', NULL),
  
  -- Business 2 discrepancies  
  ('22222222-hhhh-iiii-jjjj-222222222001', '550e8400-e29b-41d4-a716-446655440002', '40b9c5d6-d248-588b-bdd5-5102f22346f2', '22222222-jjjj-kkkk-llll-222222222002', 'damage', 8, 7, -1, 24.50, -24.50, 'One chocolate box damaged in transit', NULL)
ON CONFLICT (id) DO NOTHING;

-- Phase 4: Performance metrics and analytics
-- Insert business health metrics (this will be calculated by existing functions)
SELECT calculate_business_health_index('550e8400-e29b-41d4-a716-446655440001'::uuid, '39a8b4c5-c137-477a-acc4-4091e11235e1'::uuid);
SELECT calculate_business_health_index('550e8400-e29b-41d4-a716-446655440002'::uuid, '40b9c5d6-d248-588b-bdd5-5102f22346f2'::uuid);

-- Create sample competitive analysis data
INSERT INTO competitive_analysis (id, business_id, metric_category, business_value, industry_average, percentile_rank, competitive_gap, analysis_date, recommendations)
VALUES 
  ('11111111-kkkk-llll-mmmm-111111111001', '550e8400-e29b-41d4-a716-446655440001', 'inventory_turnover', 8.5, 6.2, 75, 2.3, CURRENT_DATE, '["Maintain efficient inventory rotation", "Consider reducing slow-moving items"]'),
  ('11111111-kkkk-llll-mmmm-111111111002', '550e8400-e29b-41d4-a716-446655440001', 'order_fulfillment_speed', 24.5, 36.8, 85, -12.3, CURRENT_DATE, '["Excellent fulfillment speed", "Market this as competitive advantage"]'),
  ('22222222-kkkk-llll-mmmm-222222222001', '550e8400-e29b-41d4-a716-446655440002', 'inventory_accuracy', 97.8, 94.2, 78, 3.6, CURRENT_DATE, '["Above average accuracy", "Implement additional quality checks"]')
ON CONFLICT (id) DO NOTHING;

-- Create customer analytics data
INSERT INTO customer_analytics (id, business_id, customer_segment, total_visits, average_spend, lifetime_value, visit_frequency, last_visit_days, analysis_date)
VALUES 
  ('11111111-nnnn-oooo-pppp-111111111001', '550e8400-e29b-41d4-a716-446655440001', 'high_value', 45, 125.50, 2850.75, 3.2, 2, CURRENT_DATE),
  ('11111111-nnnn-oooo-pppp-111111111002', '550e8400-e29b-41d4-a716-446655440001', 'regular', 28, 67.25, 1480.30, 2.1, 5, CURRENT_DATE),
  ('11111111-nnnn-oooo-pppp-111111111003', '550e8400-e29b-41d4-a716-446655440001', 'occasional', 12, 34.75, 385.20, 0.8, 14, CURRENT_DATE),
  ('22222222-nnnn-oooo-pppp-222222222001', '550e8400-e29b-41d4-a716-446655440002', 'premium', 18, 89.90, 1680.50, 2.5, 3, CURRENT_DATE),
  ('22222222-nnnn-oooo-pppp-222222222002', '550e8400-e29b-41d4-a716-446655440002', 'standard', 22, 45.20, 892.50, 1.8, 7, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;