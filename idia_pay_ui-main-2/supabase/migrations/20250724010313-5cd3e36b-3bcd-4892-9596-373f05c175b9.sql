-- Comprehensive Warehouse Management Simulation Data
-- Using the correct business ID and column names

-- First, let's add more inventory items to support warehouse operations
INSERT INTO inventory_items (id, business_id, name, category, unit_of_measure, current_cost, par_level, is_active)
VALUES 
  ('880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Organic Tomatoes', 'Produce', 'lbs', 4.50, 25, true),
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Fresh Bread', 'Bakery', 'loaves', 3.25, 15, true),
  ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Craft Beer 6-Pack', 'Beverages', 'packs', 12.99, 30, true),
  ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Paper Cups', 'Supplies', 'sleeves', 8.50, 20, true),
  ('880e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Napkins', 'Supplies', 'packs', 5.75, 25, true),
  ('880e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Sparkling Water Case', 'Beverages', 'cases', 18.99, 12, true),
  ('880e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', 'Energy Drinks', 'Beverages', 'cases', 24.99, 8, true),
  ('880e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', 'Cleaning Supplies', 'Supplies', 'bottles', 15.25, 10, true),
  ('880e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', 'Fresh Lettuce', 'Produce', 'heads', 2.75, 20, true),
  ('880e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440001', 'Sandwich Wraps', 'Bakery', 'packs', 6.50, 15, true)
ON CONFLICT (id) DO NOTHING;

-- Create warehouse bins across different zones
INSERT INTO warehouse_bins (id, business_id, location_id, bin_code, zone, aisle, shelf, bin_type, capacity_cubic_feet, temperature_controlled, is_active)
VALUES 
  ('990e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'A-01-01', 'A', '01', '01', 'standard', 50.0, false, true),
  ('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'A-01-02', 'A', '01', '02', 'standard', 50.0, false, true),
  ('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'A-02-01', 'A', '02', '01', 'refrigerated', 40.0, true, true),
  ('990e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'B-01-01', 'B', '01', '01', 'standard', 60.0, false, true),
  ('990e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'B-01-02', 'B', '01', '02', 'bulk', 100.0, false, true),
  ('990e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'B-02-01', 'B', '02', '01', 'standard', 50.0, false, true),
  ('990e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'C-01-01', 'C', '01', '01', 'standard', 45.0, false, true),
  ('990e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'C-01-02', 'C', '01', '02', 'standard', 45.0, false, true),
  ('990e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'C-02-01', 'C', '02', '01', 'refrigerated', 35.0, true, true),
  ('990e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'A-03-01', 'A', '03', '01', 'standard', 55.0, false, true)
ON CONFLICT (id) DO NOTHING;

-- Create bin assignments (existing inventory)
INSERT INTO bin_assignments (id, warehouse_bin_id, inventory_item_id, quantity, reserved_quantity, is_primary_location)
VALUES 
  ('aa0e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', 15, 5, true),
  ('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', 8, 2, true),
  ('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440002', 12, 4, true),
  ('aa0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440003', 25, 0, true),
  ('aa0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440004', 18, 3, true)
ON CONFLICT (id) DO NOTHING;

-- Create purchase orders for receiving module
INSERT INTO purchase_orders (id, business_id, location_id, po_number, supplier_name, supplier_contact, order_date, expected_delivery_date, status, total_amount, priority, notes)
VALUES 
  ('bb0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PO-2024-001', 'Fresh Foods Inc', 'orders@freshfoods.com', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE, 'in_transit', 245.75, 'high', 'Rush delivery for weekend special'),
  ('bb0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PO-2024-002', 'Beverage Distributors', 'supply@bevdist.com', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', 'pending', 189.50, 'normal', 'Standard beverage restock'),
  ('bb0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PO-2024-003', 'Equipment Supply Co', 'sales@equipsupply.com', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '1 day', 'partially_received', 156.25, 'low', 'Cleaning and paper supplies'),
  ('bb0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PO-2024-004', 'Fresh Foods Inc', 'orders@freshfoods.com', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 'pending', 312.80, 'urgent', 'Emergency restock - low inventory'),
  ('bb0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PO-2024-005', 'Local Bakery Supply', 'orders@localbakery.com', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE, 'in_transit', 78.99, 'normal', 'Fresh bread and wrap delivery')
ON CONFLICT (id) DO NOTHING;

-- Create purchase order line items
INSERT INTO purchase_order_line_items (id, purchase_order_id, inventory_item_id, sku, item_name, ordered_quantity, received_quantity, unit_cost, line_total)
VALUES 
  -- PO-2024-001 (Fresh Foods Inc - in_transit)
  ('cc0e8400-e29b-41d4-a716-446655440000', 'bb0e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', 'PROD-TOM-001', 'Organic Tomatoes', 20, 0, 4.50, 90.00),
  ('cc0e8400-e29b-41d4-a716-446655440001', 'bb0e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440008', 'PROD-LET-001', 'Fresh Lettuce', 25, 0, 2.75, 68.75),
  
  -- PO-2024-002 (Beverage Distributors - pending)
  ('cc0e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002', 'BEV-BEER-001', 'Craft Beer 6-Pack', 8, 0, 12.99, 103.92),
  ('cc0e8400-e29b-41d4-a716-446655440004', 'bb0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440005', 'BEV-SPAR-001', 'Sparkling Water Case', 6, 0, 18.99, 113.94),
  
  -- PO-2024-003 (Equipment Supply Co - partially_received)
  ('cc0e8400-e29b-41d4-a716-446655440005', 'bb0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440003', 'SUP-CUP-001', 'Paper Cups', 10, 7, 8.50, 85.00),
  ('cc0e8400-e29b-41d4-a716-446655440006', 'bb0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440004', 'SUP-NAP-001', 'Napkins', 12, 12, 5.75, 69.00),
  
  -- PO-2024-004 (Fresh Foods Inc - pending urgent)
  ('cc0e8400-e29b-41d4-a716-446655440007', 'bb0e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440006', 'BEV-ENRG-001', 'Energy Drinks', 4, 0, 24.99, 99.96),
  
  -- PO-2024-005 (Local Bakery Supply - in_transit)
  ('cc0e8400-e29b-41d4-a716-446655440009', 'bb0e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440001', 'BAKE-BRD-001', 'Fresh Bread', 15, 0, 3.25, 48.75),
  ('cc0e8400-e29b-41d4-a716-446655440010', 'bb0e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440009', 'BAKE-WRP-001', 'Sandwich Wraps', 8, 0, 6.50, 52.00)
ON CONFLICT (id) DO NOTHING;

-- Create pick lists for picking module
INSERT INTO pick_lists (id, business_id, location_id, pick_list_number, pick_method, priority, status, created_by, assigned_to, estimated_time_minutes, route_optimization)
VALUES 
  ('dd0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PICK-001', 'single_order', 'urgent', 'pending', NULL, NULL, 15, true),
  ('dd0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PICK-002', 'batch', 'high', 'in_progress', NULL, NULL, 25, true),
  ('dd0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PICK-003', 'wave', 'normal', 'pending', NULL, NULL, 35, true),
  ('dd0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PICK-004', 'single_order', 'low', 'pending', NULL, NULL, 20, false),
  ('dd0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'PICK-005', 'batch', 'high', 'in_progress', NULL, NULL, 30, true)
ON CONFLICT (id) DO NOTHING;

-- Create pick list items
INSERT INTO pick_list_items (id, pick_list_id, inventory_item_id, warehouse_bin_id, quantity_to_pick, quantity_picked, pick_sequence, pick_status)
VALUES 
  -- PICK-001 (urgent, single order)
  ('ee0e8400-e29b-41d4-a716-446655440000', 'dd0e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440000', 5, 0, 1, 'pending'),
  ('ee0e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440003', 2, 0, 2, 'pending'),
  
  -- PICK-002 (high priority, batch - in progress)
  ('ee0e8400-e29b-41d4-a716-446655440002', 'dd0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440004', 10, 6, 1, 'partial'),
  ('ee0e8400-e29b-41d4-a716-446655440003', 'dd0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440005', 8, 8, 2, 'completed'),
  ('ee0e8400-e29b-41d4-a716-446655440004', 'dd0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440002', 3, 0, 3, 'pending'),
  
  -- PICK-003 (normal priority, wave)
  ('ee0e8400-e29b-41d4-a716-446655440005', 'dd0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440006', 6, 0, 1, 'pending'),
  ('ee0e8400-e29b-41d4-a716-446655440006', 'dd0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440009', '990e8400-e29b-41d4-a716-446655440007', 4, 0, 2, 'pending'),
  
  -- PICK-004 (low priority)
  ('ee0e8400-e29b-41d4-a716-446655440007', 'dd0e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440007', '990e8400-e29b-41d4-a716-446655440008', 2, 0, 1, 'pending'),
  
  -- PICK-005 (high priority batch - in progress)
  ('ee0e8400-e29b-41d4-a716-446655440008', 'dd0e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440009', 12, 5, 1, 'partial'),
  ('ee0e8400-e29b-41d4-a716-446655440009', 'dd0e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440008', '990e8400-e29b-41d4-a716-446655440001', 7, 0, 2, 'pending')
ON CONFLICT (id) DO NOTHING;

-- Create warehouse tasks for put-away module
INSERT INTO warehouse_tasks (id, business_id, location_id, task_type, priority, status, reference_type, reference_id, assigned_to, estimated_time_minutes, instructions)
VALUES 
  ('ff0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'put_away', 'high', 'pending', 'purchase_order_line_item', 'cc0e8400-e29b-41d4-a716-446655440005', NULL, 10, 'Put away 7 sleeves of paper cups to bin A-01-01'),
  ('ff0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'put_away', 'normal', 'assigned', 'purchase_order_line_item', 'cc0e8400-e29b-41d4-a716-446655440006', NULL, 8, 'Put away 12 packs of napkins to bin B-01-02'),
  ('ff0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'put_away', 'urgent', 'pending', 'cycle_count', 'ii0e8400-e29b-41d4-a716-446655440000', NULL, 5, 'Urgent restocking based on cycle count discrepancy'),
  ('ff0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'replenishment', 'low', 'pending', 'inventory_reorder', NULL, NULL, 15, 'Move items from bulk storage to picking locations'),
  ('ff0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'put_away', 'normal', 'completed', 'manual_adjustment', NULL, NULL, 12, 'Put away returned items')
ON CONFLICT (id) DO NOTHING;

-- Create shipments for shipping module
INSERT INTO shipments (id, business_id, location_id, shipment_number, customer_name, customer_address, customer_phone, carrier, tracking_number, status, weight_lbs, shipping_cost, estimated_delivery_date)
VALUES 
  ('gg0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'SHIP-001', 'Downtown Restaurant', '456 Business Ave, Downtown, ST 12345', '(555) 234-5678', 'FedEx', 'FDX789012345', 'preparing', 25.5, 18.50, CURRENT_DATE + INTERVAL '2 days'),
  ('gg0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'SHIP-002', 'Uptown Cafe', '789 North St, Uptown, ST 67890', '(555) 345-6789', 'UPS', 'UPS456789012', 'ready_to_ship', 18.2, 15.75, CURRENT_DATE + INTERVAL '1 day'),
  ('gg0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'SHIP-003', 'Local Deli', '321 Main Street, Local, ST 11111', '(555) 456-7890', 'Local Delivery', 'LD-2024-001', 'shipped', 12.8, 8.00, CURRENT_DATE),
  ('gg0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'SHIP-004', 'Metro Grill', '654 Metro Blvd, Metro, ST 22222', '(555) 567-8901', 'DHL', 'DHL345678901', 'preparing', 31.7, 22.25, CURRENT_DATE + INTERVAL '3 days'),
  ('gg0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'SHIP-005', 'Corner Bistro', '987 Corner Ave, Corner, ST 33333', '(555) 678-9012', 'FedEx', 'FDX234567890', 'ready_to_ship', 22.1, 16.80, CURRENT_DATE + INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Create shipment line items
INSERT INTO shipment_line_items (id, shipment_id, inventory_item_id, quantity, weight_lbs, notes)
VALUES 
  -- SHIP-001 (preparing)
  ('hh0e8400-e29b-41d4-a716-446655440000', 'gg0e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', 8, 12.0, 'Premium items for restaurant'),
  ('hh0e8400-e29b-41d4-a716-446655440001', 'gg0e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440002', 3, 13.5, 'Craft beer selection'),
  
  -- SHIP-002 (ready to ship)
  ('hh0e8400-e29b-41d4-a716-446655440002', 'gg0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 12, 9.0, 'Fresh bread delivery'),
  ('hh0e8400-e29b-41d4-a716-446655440003', 'gg0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440009', 6, 9.2, 'Sandwich wraps'),
  
  -- SHIP-003 (shipped)
  ('hh0e8400-e29b-41d4-a716-446655440004', 'gg0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440003', 5, 6.5, 'Paper supplies'),
  ('hh0e8400-e29b-41d4-a716-446655440005', 'gg0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440004', 4, 6.3, 'Napkins'),
  
  -- SHIP-004 (preparing)
  ('hh0e8400-e29b-41d4-a716-446655440006', 'gg0e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440005', 4, 18.2, 'Sparkling water cases'),
  ('hh0e8400-e29b-41d4-a716-446655440007', 'gg0e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440006', 2, 13.5, 'Energy drinks'),
  
  -- SHIP-005 (ready to ship)
  ('hh0e8400-e29b-41d4-a716-446655440008', 'gg0e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440000', 15, 11.2, 'Organic tomatoes'),
  ('hh0e8400-e29b-41d4-a716-446655440009', 'gg0e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440008', 20, 10.9, 'Fresh lettuce')
ON CONFLICT (id) DO NOTHING;

-- Create cycle counts for counting module
INSERT INTO cycle_counts (id, business_id, location_id, count_number, count_type, status, scheduled_date, created_by, assigned_to, total_items, items_counted, discrepancies_found, accuracy_percentage)
VALUES 
  ('ii0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'CC-2024-001', 'cycle', 'scheduled', CURRENT_DATE, NULL, NULL, 8, 0, 0, NULL),
  ('ii0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'CC-2024-002', 'spot', 'in_progress', CURRENT_DATE, NULL, NULL, 5, 3, 1, 60.0),
  ('ii0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'CC-2024-003', 'abc_analysis', 'scheduled', CURRENT_DATE + INTERVAL '1 day', NULL, NULL, 12, 0, 0, NULL),
  ('ii0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'CC-2024-004', 'full', 'scheduled', CURRENT_DATE + INTERVAL '2 days', NULL, NULL, 15, 0, 0, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create cycle count items
INSERT INTO cycle_count_items (id, cycle_count_id, inventory_item_id, warehouse_bin_id, expected_quantity, counted_quantity, variance, variance_value, status, counted_at, counted_by, notes)
VALUES 
  -- CC-2024-001 (scheduled)
  ('jj0e8400-e29b-41d4-a716-446655440000', 'ii0e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440000', 15, NULL, NULL, NULL, 'pending', NULL, NULL, 'High-velocity item for weekly count'),
  ('jj0e8400-e29b-41d4-a716-446655440001', 'ii0e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440003', 12, NULL, NULL, NULL, 'pending', NULL, NULL, 'Beverage inventory check'),
  ('jj0e8400-e29b-41d4-a716-446655440002', 'ii0e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440004', 25, NULL, NULL, NULL, 'pending', NULL, NULL, 'Supply count verification'),
  
  -- CC-2024-002 (in_progress with some counted)
  ('jj0e8400-e29b-41d4-a716-446655440003', 'ii0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440005', 18, 16, -2, -11.50, 'counted', CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL, 'Slight shortage found'),
  ('jj0e8400-e29b-41d4-a716-446655440004', 'ii0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440002', 8, 8, 0, 0.00, 'counted', CURRENT_TIMESTAMP - INTERVAL '30 minutes', NULL, 'Count matches expected'),
  ('jj0e8400-e29b-41d4-a716-446655440005', 'ii0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440006', 6, 7, 1, 3.25, 'counted', CURRENT_TIMESTAMP - INTERVAL '15 minutes', NULL, 'Extra item found'),
  ('jj0e8400-e29b-41d4-a716-446655440006', 'ii0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440008', '990e8400-e29b-41d4-a716-446655440001', 10, NULL, NULL, NULL, 'pending', NULL, NULL, 'Awaiting count'),
  ('jj0e8400-e29b-41d4-a716-446655440007', 'ii0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440009', '990e8400-e29b-41d4-a716-446655440007', 4, NULL, NULL, NULL, 'pending', NULL, NULL, 'Awaiting count'),
  
  -- CC-2024-003 (scheduled for tomorrow)
  ('jj0e8400-e29b-41d4-a716-446655440008', 'ii0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440009', 12, NULL, NULL, NULL, 'pending', NULL, NULL, 'ABC analysis - A category items'),
  ('jj0e8400-e29b-41d4-a716-446655440009', 'ii0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440008', 8, NULL, NULL, NULL, 'pending', NULL, NULL, 'ABC analysis - B category items')
ON CONFLICT (id) DO NOTHING;

-- Create some receiving discrepancies for demo
INSERT INTO receiving_discrepancies (id, business_id, location_id, purchase_order_line_item_id, discrepancy_type, expected_quantity, received_quantity, variance_quantity, unit_cost, total_impact, description, reported_by)
VALUES 
  ('kk0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'cc0e8400-e29b-41d4-a716-446655440005', 'shortage', 10, 7, -3, 8.50, -25.50, 'Missing 3 sleeves of cups from delivery', NULL),
  ('kk0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'cc0e8400-e29b-41d4-a716-446655440006', 'damage', 12, 11, -1, 5.75, -5.75, 'One pack of napkins damaged in transit', NULL)
ON CONFLICT (id) DO NOTHING;