-- CORRECTED COMPREHENSIVE WAREHOUSE SIMULATION DATA MIGRATION
-- Phase 1: Schema Corrections
ALTER TABLE purchase_order_line_items ADD COLUMN IF NOT EXISTS line_total NUMERIC DEFAULT 0;

-- Phase 2: Foundation Data - Suppliers (using correct column names)
INSERT INTO suppliers (id, business_id, name, contact_name, email, phone, address, payment_terms, tax_id, is_active, rating) VALUES
-- IDIA Cafe Chain Suppliers
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'Premium Coffee Roasters', 'Sarah Johnson', 'orders@premiumroasters.com', '555-0101', '100 Roaster Ave, Coffee City', 'Net 30', 'TR-001', true, 5),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'Fresh Dairy Co', 'Mike Chen', 'supply@freshdairy.com', '555-0102', '200 Farm Road, Dairy Valley', 'Net 15', 'TR-002', true, 5),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 'Artisan Bakery Supply', 'Lisa Martinez', 'wholesale@artisanbakery.com', '555-0103', '300 Baker Street, Flour Town', 'Net 30', 'TR-003', true, 5),

-- QuickMart Stores Suppliers
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'Global Electronics Dist', 'James Wilson', 'orders@globalelec.com', '555-0201', '400 Tech Park, Silicon Valley', 'Net 45', 'TR-004', true, 4),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'Household Essentials Inc', 'Amanda Brown', 'sales@householdess.com', '555-0202', '500 Industrial Blvd, Supply City', 'Net 30', 'TR-005', true, 4),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', 'Snack Foods Distribution', 'Robert Davis', 'orders@snackfoods.com', '555-0203', '600 Warehouse Row, Food District', 'Net 21', 'TR-006', true, 4);

-- Phase 3: Inventory Items with Supplier References
INSERT INTO inventory_items (id, business_id, supplier_id, name, category, unit_of_measure, current_cost, par_level, barcode, vendor_sku, storage_requirements, shelf_life_days, is_active, minimum_order_quantity, lead_time_days) 
SELECT 
  gen_random_uuid() as id,
  '550e8400-e29b-41d4-a716-446655440001' as business_id,
  s.id as supplier_id,
  item_data.name,
  item_data.category,
  item_data.unit_of_measure,
  item_data.current_cost,
  item_data.par_level,
  item_data.barcode,
  item_data.vendor_sku,
  item_data.storage_requirements,
  item_data.shelf_life_days,
  true as is_active,
  item_data.minimum_order_quantity,
  item_data.lead_time_days
FROM suppliers s
CROSS JOIN (
  VALUES 
    ('Premium Arabica Beans', 'Coffee', 'lb', 12.50, 50, 'PCR-001', 'ARAB-001', 'Cool, dry place', 365, 25, 3),
    ('Organic Whole Milk', 'Dairy', 'gallon', 4.25, 20, 'FDC-002', 'MILK-001', 'Refrigerated', 7, 10, 1),
    ('Artisan Sourdough Bread', 'Bakery', 'loaf', 3.75, 15, 'ABS-003', 'SOUR-001', 'Room temperature', 3, 5, 2),
    ('House Blend Coffee', 'Coffee', 'lb', 10.00, 40, 'PCR-004', 'HOUS-001', 'Cool, dry place', 365, 20, 3),
    ('Fresh Cream', 'Dairy', 'quart', 2.80, 12, 'FDC-005', 'CREA-001', 'Refrigerated', 5, 8, 1),
    ('Croissant Mix', 'Bakery', 'bag', 8.50, 25, 'ABS-006', 'CROI-001', 'Cool, dry place', 180, 10, 2)
) AS item_data(name, category, unit_of_measure, current_cost, par_level, barcode, vendor_sku, storage_requirements, shelf_life_days, minimum_order_quantity, lead_time_days)
WHERE (s.name = 'Premium Coffee Roasters' AND item_data.category = 'Coffee')
   OR (s.name = 'Fresh Dairy Co' AND item_data.category = 'Dairy')
   OR (s.name = 'Artisan Bakery Supply' AND item_data.category = 'Bakery');

-- Retail inventory items
INSERT INTO inventory_items (id, business_id, supplier_id, name, category, unit_of_measure, current_cost, par_level, barcode, vendor_sku, storage_requirements, shelf_life_days, is_active, minimum_order_quantity, lead_time_days)
SELECT 
  gen_random_uuid() as id,
  '550e8400-e29b-41d4-a716-446655440002' as business_id,
  s.id as supplier_id,
  item_data.name,
  item_data.category,
  item_data.unit_of_measure,
  item_data.current_cost,
  item_data.par_level,
  item_data.barcode,
  item_data.vendor_sku,
  item_data.storage_requirements,
  item_data.shelf_life_days,
  true as is_active,
  item_data.minimum_order_quantity,
  item_data.lead_time_days
FROM suppliers s
CROSS JOIN (
  VALUES 
    ('Wireless Earbuds', 'Electronics', 'piece', 45.00, 30, 'GED-001', 'WIRE-001', 'Room temperature', NULL, 10, 7),
    ('Smartphone Charger', 'Electronics', 'piece', 15.50, 50, 'GED-002', 'CHAR-001', 'Room temperature', NULL, 20, 7),
    ('Paper Towels', 'Household', 'pack', 8.75, 40, 'HEI-003', 'TOWL-001', 'Dry place', NULL, 15, 5),
    ('All-Purpose Cleaner', 'Household', 'bottle', 4.25, 25, 'HEI-004', 'CLEA-001', 'Room temperature', NULL, 12, 5),
    ('Potato Chips', 'Snacks', 'bag', 2.50, 60, 'SFD-005', 'CHIP-001', 'Cool, dry place', 90, 24, 3),
    ('Energy Drinks', 'Beverages', 'can', 1.75, 80, 'SFD-006', 'ENER-001', 'Room temperature', 180, 36, 3)
) AS item_data(name, category, unit_of_measure, current_cost, par_level, barcode, vendor_sku, storage_requirements, shelf_life_days, minimum_order_quantity, lead_time_days)
WHERE (s.name = 'Global Electronics Dist' AND item_data.category = 'Electronics')
   OR (s.name = 'Household Essentials Inc' AND item_data.category = 'Household')
   OR (s.name = 'Snack Foods Distribution' AND item_data.category IN ('Snacks', 'Beverages'));

-- Phase 4: Warehouse Infrastructure
INSERT INTO warehouse_bins (id, business_id, location_id, bin_code, zone, aisle, shelf, level, capacity_cubic_feet, current_volume, bin_type, is_active, last_cycle_count) VALUES
-- Downtown Location (IDIA Cafe)
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'A01-01-01', 'A', 1, 1, 1, 8.0, 2.5, 'storage', true, CURRENT_DATE - 30),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'A01-01-02', 'A', 1, 1, 2, 8.0, 3.2, 'storage', true, CURRENT_DATE - 30),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'A01-02-01', 'A', 1, 2, 1, 8.0, 1.8, 'storage', true, CURRENT_DATE - 30),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'B01-01-01', 'B', 1, 1, 1, 12.0, 4.5, 'bulk', true, CURRENT_DATE - 25),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '39a8b4c5-c137-477a-acc4-4091e11235e1', 'C01-01-01', 'C', 1, 1, 1, 6.0, 0.0, 'picking', true, CURRENT_DATE - 20),

-- Mall Location (IDIA Cafe)
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '94ac8a09-7c55-42f3-a2c7-16336d6baee4', 'A01-01-01', 'A', 1, 1, 1, 8.0, 3.0, 'storage', true, CURRENT_DATE - 28),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '94ac8a09-7c55-42f3-a2c7-16336d6baee4', 'A01-02-01', 'A', 1, 2, 1, 8.0, 2.1, 'storage', true, CURRENT_DATE - 28),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '94ac8a09-7c55-42f3-a2c7-16336d6baee4', 'B01-01-01', 'B', 1, 1, 1, 12.0, 5.2, 'bulk', true, CURRENT_DATE - 22),

-- North Store (QuickMart)
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '59c23cff-3606-4ea7-805b-b3f58dbefacb', 'A01-01-01', 'A', 1, 1, 1, 10.0, 4.2, 'storage', true, CURRENT_DATE - 35),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '59c23cff-3606-4ea7-805b-b3f58dbefacb', 'A01-01-02', 'A', 1, 1, 2, 10.0, 3.8, 'storage', true, CURRENT_DATE - 35),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '59c23cff-3606-4ea7-805b-b3f58dbefacb', 'A02-01-01', 'A', 2, 1, 1, 10.0, 2.5, 'storage', true, CURRENT_DATE - 35),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '59c23cff-3606-4ea7-805b-b3f58dbefacb', 'B01-01-01', 'B', 1, 1, 1, 15.0, 6.8, 'bulk', true, CURRENT_DATE - 30),
(gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '59c23cff-3606-4ea7-805b-b3f58dbefacb', 'C01-01-01', 'C', 1, 1, 1, 8.0, 1.2, 'picking', true, CURRENT_DATE - 25);

-- Phase 5: Bin Assignments (matching inventory to bins)
INSERT INTO bin_assignments (id, warehouse_bin_id, inventory_item_id, quantity, reserved_quantity, is_primary_location, last_movement_date)
SELECT 
  gen_random_uuid(),
  wb.id,
  ii.id,
  CASE 
    WHEN wb.bin_type = 'bulk' THEN (ii.par_level * 2)
    WHEN wb.bin_type = 'storage' THEN ii.par_level
    ELSE (ii.par_level / 2)
  END as quantity,
  CASE WHEN wb.bin_type = 'picking' THEN 5 ELSE 0 END as reserved_quantity,
  true as is_primary_location,
  CURRENT_DATE - (RANDOM() * 10)::integer as last_movement_date
FROM warehouse_bins wb
JOIN inventory_items ii ON ii.business_id = wb.business_id
WHERE ROW_NUMBER() OVER (PARTITION BY ii.id ORDER BY wb.bin_code) = 1;

-- Phase 6: Purchase Orders
INSERT INTO purchase_orders (id, business_id, supplier_id, location_id, po_number, status, order_date, expected_delivery_date, actual_delivery_date, notes, subtotal, tax_amount, total_amount, created_by, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  b.id,
  s.id,
  bl.id,
  'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER ())::text, 4, '0'),
  CASE (ROW_NUMBER() OVER ()) % 4
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'in_transit'
    WHEN 2 THEN 'partially_received'
    ELSE 'delivered'
  END,
  CURRENT_DATE - (RANDOM() * 30)::integer,
  CURRENT_DATE + (RANDOM() * 7)::integer,
  CASE WHEN (ROW_NUMBER() OVER ()) % 4 = 3 THEN CURRENT_DATE - (RANDOM() * 5)::integer ELSE NULL END,
  'Standard delivery order',
  1000.00 + (RANDOM() * 2000),
  100.00 + (RANDOM() * 200),
  1100.00 + (RANDOM() * 2200),
  NULL,
  CURRENT_DATE - (RANDOM() * 30)::integer,
  CURRENT_DATE - (RANDOM() * 10)::integer
FROM businesses b
CROSS JOIN suppliers s
JOIN business_locations bl ON bl.business_id = b.id
WHERE s.business_id = b.id
AND ROW_NUMBER() OVER (PARTITION BY b.id) <= 3;

-- Phase 7: Purchase Order Line Items with calculated line_total
INSERT INTO purchase_order_line_items (id, purchase_order_id, inventory_item_id, sku, item_name, ordered_quantity, received_quantity, unit_cost, line_total, lot_number, expiry_date)
SELECT 
  gen_random_uuid(),
  po.id,
  ii.id,
  ii.barcode,
  ii.name,
  (ii.minimum_order_quantity + (RANDOM() * ii.minimum_order_quantity)::integer),
  CASE 
    WHEN po.status = 'delivered' THEN (ii.minimum_order_quantity + (RANDOM() * ii.minimum_order_quantity)::integer)
    WHEN po.status = 'partially_received' THEN ((ii.minimum_order_quantity + (RANDOM() * ii.minimum_order_quantity)::integer) / 2)
    ELSE 0
  END,
  ii.current_cost,
  (ii.minimum_order_quantity + (RANDOM() * ii.minimum_order_quantity)::integer) * ii.current_cost,
  'LOT-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((RANDOM() * 1000)::integer::text, 3, '0'),
  CASE WHEN ii.shelf_life_days IS NOT NULL THEN CURRENT_DATE + ii.shelf_life_days ELSE NULL END
FROM purchase_orders po
JOIN inventory_items ii ON ii.business_id = po.business_id
WHERE ROW_NUMBER() OVER (PARTITION BY po.id ORDER BY ii.name) <= 3;

-- Phase 8: Pick Lists
INSERT INTO pick_lists (id, business_id, location_id, pick_list_number, status, priority, assigned_to, created_by, estimated_pick_time, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  bl.business_id,
  bl.id,
  'PL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER ())::text, 4, '0'),
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'in_progress'
    ELSE 'completed'
  END,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'high'
    WHEN 1 THEN 'medium'
    ELSE 'low'
  END,
  NULL,
  NULL,
  30 + (RANDOM() * 60)::integer,
  CURRENT_DATE - (RANDOM() * 7)::integer,
  CURRENT_DATE - (RANDOM() * 3)::integer
FROM business_locations bl
WHERE ROW_NUMBER() OVER (PARTITION BY bl.business_id) <= 2;

-- Phase 9: Pick List Items
INSERT INTO pick_list_items (id, pick_list_id, inventory_item_id, warehouse_bin_id, quantity_to_pick, quantity_picked, status, sequence_number)
SELECT 
  gen_random_uuid(),
  pl.id,
  ba.inventory_item_id,
  ba.warehouse_bin_id,
  LEAST(ba.quantity, 10 + (RANDOM() * 20)::integer),
  CASE 
    WHEN pl.status = 'completed' THEN LEAST(ba.quantity, 10 + (RANDOM() * 20)::integer)
    WHEN pl.status = 'in_progress' THEN LEAST(ba.quantity, 5 + (RANDOM() * 10)::integer)
    ELSE 0
  END,
  CASE 
    WHEN pl.status = 'completed' THEN 'picked'
    WHEN pl.status = 'in_progress' THEN 'pending'
    ELSE 'pending'
  END,
  ROW_NUMBER() OVER (PARTITION BY pl.id ORDER BY ba.warehouse_bin_id)
FROM pick_lists pl
JOIN bin_assignments ba ON ba.warehouse_bin_id IN (
  SELECT wb.id FROM warehouse_bins wb WHERE wb.location_id = pl.location_id
)
WHERE ba.quantity > 0
AND ROW_NUMBER() OVER (PARTITION BY pl.id) <= 5;

-- Phase 10: Warehouse Tasks for Put-Away and Shipping
INSERT INTO warehouse_tasks (id, business_id, location_id, task_type, status, priority, inventory_item_id, quantity, assigned_to, created_by, created_at, updated_at, due_date, instructions)
SELECT 
  gen_random_uuid(),
  ii.business_id,
  bl.id,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'put_away'
    WHEN 1 THEN 'replenishment'
    ELSE 'transfer'
  END,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'in_progress'
    ELSE 'completed'
  END,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'high'
    WHEN 1 THEN 'medium'
    ELSE 'low'
  END,
  ii.id,
  10 + (RANDOM() * 20)::integer,
  NULL,
  NULL,
  CURRENT_DATE - (RANDOM() * 5)::integer,
  CURRENT_DATE - (RANDOM() * 2)::integer,
  CURRENT_DATE + (RANDOM() * 3)::integer,
  'Standard warehouse task - handle with care'
FROM inventory_items ii
JOIN business_locations bl ON bl.business_id = ii.business_id
WHERE ROW_NUMBER() OVER (PARTITION BY ii.business_id) <= 10;

-- Phase 11: Shipments
INSERT INTO shipments (id, business_id, location_id, shipment_number, customer_name, carrier, tracking_number, status, estimated_weight, shipping_cost, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  bl.business_id,
  bl.id,
  'SH-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER ())::text, 4, '0'),
  CASE (ROW_NUMBER() OVER ()) % 4
    WHEN 0 THEN 'ABC Corp'
    WHEN 1 THEN 'XYZ Industries'
    WHEN 2 THEN 'Local Restaurant'
    ELSE 'Regional Distributor'
  END,
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'FedEx'
    WHEN 1 THEN 'UPS'
    ELSE 'DHL'
  END,
  'TR' || LPAD((RANDOM() * 999999999)::bigint::text, 9, '0'),
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'preparing'
    WHEN 1 THEN 'ready_to_ship'
    ELSE 'shipped'
  END,
  25.0 + (RANDOM() * 75),
  15.00 + (RANDOM() * 50),
  CURRENT_DATE - (RANDOM() * 14)::integer,
  CURRENT_DATE - (RANDOM() * 7)::integer
FROM business_locations bl
WHERE ROW_NUMBER() OVER (PARTITION BY bl.business_id) <= 6;

-- Phase 12: Shipment Line Items
INSERT INTO shipment_line_items (id, shipment_id, inventory_item_id, quantity)
SELECT 
  gen_random_uuid(),
  sh.id,
  ii.id,
  5 + (RANDOM() * 15)::integer
FROM shipments sh
JOIN inventory_items ii ON ii.business_id = sh.business_id
WHERE ROW_NUMBER() OVER (PARTITION BY sh.id ORDER BY ii.name) <= 3;

-- Phase 13: Cycle Counts
INSERT INTO cycle_counts (id, business_id, location_id, count_number, count_type, status, scheduled_date, started_at, completed_at, assigned_to, total_items, items_counted, discrepancies_found, accuracy_percentage, created_by, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  bl.business_id,
  bl.id,
  'CC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER ())::text, 4, '0'),
  'cycle',
  CASE (ROW_NUMBER() OVER ()) % 3
    WHEN 0 THEN 'scheduled'
    WHEN 1 THEN 'in_progress'
    ELSE 'completed'
  END,
  CURRENT_DATE + (RANDOM() * 30)::integer,
  CASE WHEN (ROW_NUMBER() OVER ()) % 3 > 0 THEN CURRENT_DATE - (RANDOM() * 5)::integer ELSE NULL END,
  CASE WHEN (ROW_NUMBER() OVER ()) % 3 = 2 THEN CURRENT_DATE - (RANDOM() * 2)::integer ELSE NULL END,
  NULL,
  50 + (RANDOM() * 100)::integer,
  CASE WHEN (ROW_NUMBER() OVER ()) % 3 = 2 THEN 50 + (RANDOM() * 100)::integer ELSE 0 END,
  CASE WHEN (ROW_NUMBER() OVER ()) % 3 = 2 THEN (RANDOM() * 5)::integer ELSE 0 END,
  CASE WHEN (ROW_NUMBER() OVER ()) % 3 = 2 THEN 95.0 + (RANDOM() * 5) ELSE NULL END,
  NULL,
  CURRENT_DATE - (RANDOM() * 10)::integer,
  CURRENT_DATE - (RANDOM() * 5)::integer
FROM business_locations bl
WHERE ROW_NUMBER() OVER (PARTITION BY bl.business_id) <= 4;

-- Verify the migration completed successfully
SELECT 
  'Migration completed successfully' as status,
  (SELECT COUNT(*) FROM suppliers) as suppliers_created,
  (SELECT COUNT(*) FROM inventory_items) as inventory_items_created,
  (SELECT COUNT(*) FROM warehouse_bins) as warehouse_bins_created,
  (SELECT COUNT(*) FROM bin_assignments) as bin_assignments_created,
  (SELECT COUNT(*) FROM purchase_orders) as purchase_orders_created,
  (SELECT COUNT(*) FROM purchase_order_line_items) as po_line_items_created,
  (SELECT COUNT(*) FROM pick_lists) as pick_lists_created,
  (SELECT COUNT(*) FROM pick_list_items) as pick_list_items_created,
  (SELECT COUNT(*) FROM warehouse_tasks) as warehouse_tasks_created,
  (SELECT COUNT(*) FROM shipments) as shipments_created,
  (SELECT COUNT(*) FROM shipment_line_items) as shipment_line_items_created,
  (SELECT COUNT(*) FROM cycle_counts) as cycle_counts_created;