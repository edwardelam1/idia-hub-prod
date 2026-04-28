-- Comprehensive Warehouse Management Simulation Data Migration
-- Corrected for actual table schemas without disrupting Synapse flow

-- Phase 1: Data Foundation
-- Add comprehensive inventory items for both businesses (using correct schema)
INSERT INTO inventory_items (id, business_id, name, category, unit_of_measure, current_cost, par_level, vendor_sku, barcode, is_active)
VALUES 
  -- Business 1 inventory (Restaurant/Food Service)
  ('11111111-1111-1111-1111-111111111001', '550e8400-e29b-41d4-a716-446655440001', 'Organic Tomatoes', 'Produce', 'lbs', 4.50, 25, 'PROD-TOM-001', '123456789001', true),
  ('11111111-1111-1111-1111-111111111002', '550e8400-e29b-41d4-a716-446655440001', 'Fresh Bread Loaves', 'Bakery', 'each', 3.25, 20, 'BAKE-BRD-001', '123456789002', true),
  ('11111111-1111-1111-1111-111111111003', '550e8400-e29b-41d4-a716-446655440001', 'Craft Beer 6-Pack', 'Beverages', 'packs', 12.99, 30, 'BEV-BEER-001', '123456789003', true),
  ('11111111-1111-1111-1111-111111111004', '550e8400-e29b-41d4-a716-446655440001', 'Paper Cups', 'Supplies', 'sleeves', 8.50, 25, 'SUP-CUP-001', '123456789004', true),
  ('11111111-1111-1111-1111-111111111005', '550e8400-e29b-41d4-a716-446655440001', 'Napkins', 'Supplies', 'packs', 5.75, 30, 'SUP-NAP-001', '123456789005', true),
  ('11111111-1111-1111-1111-111111111006', '550e8400-e29b-41d4-a716-446655440001', 'Sparkling Water Case', 'Beverages', 'cases', 18.99, 15, 'BEV-SPAR-001', '123456789006', true),
  ('11111111-1111-1111-1111-111111111007', '550e8400-e29b-41d4-a716-446655440001', 'Energy Drinks', 'Beverages', 'cases', 24.99, 10, 'BEV-ENRG-001', '123456789007', true),
  ('11111111-1111-1111-1111-111111111008', '550e8400-e29b-41d4-a716-446655440001', 'Cleaning Supplies', 'Supplies', 'bottles', 15.25, 12, 'SUP-CLN-001', '123456789008', true),
  ('11111111-1111-1111-1111-111111111009', '550e8400-e29b-41d4-a716-446655440001', 'Fresh Lettuce', 'Produce', 'heads', 2.75, 25, 'PROD-LET-001', '123456789009', true),
  ('11111111-1111-1111-1111-111111111010', '550e8400-e29b-41d4-a716-446655440001', 'Sandwich Wraps', 'Bakery', 'packs', 6.50, 20, 'BAKE-WRP-001', '123456789010', true),
  
  -- Business 2 inventory (Retail/Market)  
  ('22222222-2222-2222-2222-222222222001', '550e8400-e29b-41d4-a716-446655440002', 'Premium Coffee Beans', 'Beverages', 'lbs', 16.99, 15, 'BEV-COF-001', '223456789001', true),
  ('22222222-2222-2222-2222-222222222002', '550e8400-e29b-41d4-a716-446655440002', 'Artisan Chocolates', 'Confectionery', 'boxes', 24.50, 12, 'CONF-CHO-001', '223456789002', true),
  ('22222222-2222-2222-2222-222222222003', '550e8400-e29b-41d4-a716-446655440002', 'Local Honey', 'Condiments', 'jars', 12.75, 20, 'COND-HON-001', '223456789003', true),
  ('22222222-2222-2222-2222-222222222004', '550e8400-e29b-41d4-a716-446655440002', 'Gift Bags', 'Packaging', 'units', 2.99, 50, 'PKG-BAG-001', '223456789004', true),
  ('22222222-2222-2222-2222-222222222005', '550e8400-e29b-41d4-a716-446655440002', 'Promotional Stickers', 'Marketing', 'sheets', 1.50, 100, 'MKT-STK-001', '223456789005', true)
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

-- Create purchase order line items (using correct schema without sku column)
INSERT INTO purchase_order_line_items (id, purchase_order_id, inventory_item_id, item_name, ordered_quantity, received_quantity, unit_cost, line_total)
VALUES 
  -- PO-2024-001 line items (Fresh Foods - in_transit)
  ('11111111-jjjj-kkkk-llll-111111111001', '11111111-gggg-hhhh-iiii-111111111001', '11111111-1111-1111-1111-111111111001', 'Organic Tomatoes', 20, 0, 4.50, 90.00),
  ('11111111-jjjj-kkkk-llll-111111111002', '11111111-gggg-hhhh-iiii-111111111001', '11111111-1111-1111-1111-111111111009', 'Fresh Lettuce', 25, 0, 2.75, 68.75),
  ('11111111-jjjj-kkkk-llll-111111111003', '11111111-gggg-hhhh-iiii-111111111001', '11111111-1111-1111-1111-111111111002', 'Fresh Bread Loaves', 20, 0, 3.25, 65.00),
  
  -- PO-2024-002 line items (Beverage Distributors - pending)
  ('11111111-jjjj-kkkk-llll-111111111004', '11111111-gggg-hhhh-iiii-111111111002', '11111111-1111-1111-1111-111111111003', 'Craft Beer 6-Pack', 8, 0, 12.99, 103.92),
  ('11111111-jjjj-kkkk-llll-111111111005', '11111111-gggg-hhhh-iiii-111111111002', '11111111-1111-1111-1111-111111111006', 'Sparkling Water Case', 6, 0, 18.99, 113.94),
  
  -- PO-2024-003 line items (Restaurant Supply - partially_received)
  ('11111111-jjjj-kkkk-llll-111111111006', '11111111-gggg-hhhh-iiii-111111111003', '11111111-1111-1111-1111-111111111004', 'Paper Cups', 15, 12, 8.50, 127.50),
  ('11111111-jjjj-kkkk-llll-111111111007', '11111111-gggg-hhhh-iiii-111111111003', '11111111-1111-1111-1111-111111111005', 'Napkins', 10, 10, 5.75, 57.50),
  
  -- Business 2 purchase order line items
  ('22222222-jjjj-kkkk-llll-222222222001', '22222222-gggg-hhhh-iiii-222222222001', '22222222-2222-2222-2222-222222222001', 'Premium Coffee Beans', 12, 0, 16.99, 203.88),
  ('22222222-jjjj-kkkk-llll-222222222002', '22222222-gggg-hhhh-iiii-222222222001', '22222222-2222-2222-2222-222222222002', 'Artisan Chocolates', 8, 0, 24.50, 196.00),
  ('22222222-jjjj-kkkk-llll-222222222003', '22222222-gggg-hhhh-iiii-222222222002', '22222222-2222-2222-2222-222222222003', 'Local Honey', 10, 0, 12.75, 127.50)
ON CONFLICT (id) DO NOTHING;

-- Continue with remaining warehouse simulation data in the next part...