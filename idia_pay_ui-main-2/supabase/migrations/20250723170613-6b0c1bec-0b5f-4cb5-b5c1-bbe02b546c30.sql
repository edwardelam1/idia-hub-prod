-- Comprehensive Warehouse Management System Database Schema

-- Purchase Orders for Receiving Module
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  location_id UUID NOT NULL,
  po_number TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_contact JSONB DEFAULT '{}',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'partially_received', 'received', 'cancelled')),
  total_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Purchase Order Line Items
CREATE TABLE IF NOT EXISTS public.purchase_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id),
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  ordered_quantity INTEGER NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  unit_cost NUMERIC(10,2),
  lot_number TEXT,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Warehouse Physical Bins/Locations
CREATE TABLE IF NOT EXISTS public.warehouse_bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  location_id UUID NOT NULL,
  bin_code TEXT NOT NULL,
  zone TEXT NOT NULL,
  aisle TEXT,
  shelf TEXT,
  level TEXT,
  bin_type TEXT DEFAULT 'standard' CHECK (bin_type IN ('standard', 'bulk', 'pick', 'reserve', 'staging')),
  capacity_cubic_feet NUMERIC(8,2),
  weight_capacity_lbs NUMERIC(8,2),
  temperature_controlled BOOLEAN DEFAULT false,
  coordinates JSONB, -- {x, y, z} for warehouse mapping
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, location_id, bin_code)
);

-- Bin Assignments (Item locations)
CREATE TABLE IF NOT EXISTS public.bin_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_bin_id UUID NOT NULL REFERENCES public.warehouse_bins(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  last_movement_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_primary_location BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pick Lists for Order Fulfillment
CREATE TABLE IF NOT EXISTS public.pick_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  location_id UUID NOT NULL,
  pick_list_number TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID,
  pick_method TEXT DEFAULT 'single_order' CHECK (pick_method IN ('single_order', 'batch', 'zone')),
  estimated_pick_time INTEGER, -- minutes
  actual_pick_time INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Individual items to pick
CREATE TABLE IF NOT EXISTS public.pick_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_list_id UUID NOT NULL REFERENCES public.pick_lists(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  warehouse_bin_id UUID REFERENCES public.warehouse_bins(id),
  quantity_requested INTEGER NOT NULL,
  quantity_picked INTEGER DEFAULT 0,
  pick_sequence INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'picked', 'short_pick', 'substituted')),
  lot_number TEXT,
  expiry_date DATE,
  notes TEXT,
  picked_at TIMESTAMP WITH TIME ZONE,
  picked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shipments for Outbound Management
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  location_id UUID NOT NULL,
  shipment_number TEXT NOT NULL,
  customer_name TEXT,
  customer_address JSONB,
  carrier TEXT,
  tracking_number TEXT,
  service_type TEXT,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'ready_to_ship', 'shipped', 'in_transit', 'delivered', 'exception')),
  estimated_weight NUMERIC(8,2),
  actual_weight NUMERIC(8,2),
  shipping_cost NUMERIC(10,2),
  scheduled_pickup_date DATE,
  actual_pickup_date DATE,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  delivery_instructions TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shipment Line Items
CREATE TABLE IF NOT EXISTS public.shipment_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity INTEGER NOT NULL,
  lot_number TEXT,
  expiry_date DATE,
  package_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cycle Counts for Inventory Accuracy
CREATE TABLE IF NOT EXISTS public.cycle_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  location_id UUID NOT NULL,
  count_number TEXT NOT NULL,
  count_type TEXT NOT NULL DEFAULT 'cycle' CHECK (count_type IN ('cycle', 'physical', 'spot', 'abc')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_date DATE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  total_items INTEGER DEFAULT 0,
  items_counted INTEGER DEFAULT 0,
  discrepancies_found INTEGER DEFAULT 0,
  accuracy_percentage NUMERIC(5,2),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Individual count records
CREATE TABLE IF NOT EXISTS public.cycle_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_count_id UUID NOT NULL REFERENCES public.cycle_counts(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  warehouse_bin_id UUID REFERENCES public.warehouse_bins(id),
  expected_quantity INTEGER NOT NULL,
  counted_quantity INTEGER,
  variance INTEGER,
  variance_value NUMERIC(10,2),
  reason_code TEXT,
  notes TEXT,
  counted_at TIMESTAMP WITH TIME ZONE,
  counted_by UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'counted', 'recounted', 'adjusted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Unified Task Management
CREATE TABLE IF NOT EXISTS public.warehouse_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  location_id UUID NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('receiving', 'put_away', 'picking', 'packing', 'shipping', 'counting', 'replenishment')),
  task_number TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_to UUID,
  reference_id UUID, -- Links to PO, pick list, shipment, etc.
  reference_type TEXT,
  description TEXT NOT NULL,
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER,
  due_date TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inventory Adjustments
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  location_id UUID NOT NULL,
  adjustment_number TEXT NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  warehouse_bin_id UUID REFERENCES public.warehouse_bins(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('cycle_count', 'damage', 'theft', 'expired', 'found', 'transfer', 'correction')),
  quantity_before INTEGER NOT NULL,
  adjustment_quantity INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  unit_cost NUMERIC(10,2),
  total_value NUMERIC(10,2),
  reason TEXT NOT NULL,
  reference_document TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Receiving Discrepancies
CREATE TABLE IF NOT EXISTS public.receiving_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id),
  purchase_order_line_item_id UUID REFERENCES public.purchase_order_line_items(id),
  discrepancy_type TEXT NOT NULL CHECK (discrepancy_type IN ('shortage', 'overage', 'damage', 'wrong_item', 'quality_issue')),
  expected_quantity INTEGER,
  actual_quantity INTEGER,
  variance_quantity INTEGER,
  description TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]',
  supplier_notified BOOLEAN DEFAULT false,
  supplier_notified_at TIMESTAMP WITH TIME ZONE,
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'resolved', 'disputed')),
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_business_location ON public.purchase_orders(business_id, location_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_bins_location ON public.warehouse_bins(business_id, location_id);
CREATE INDEX IF NOT EXISTS idx_bin_assignments_item ON public.bin_assignments(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_status ON public.pick_lists(status);
CREATE INDEX IF NOT EXISTS idx_pick_lists_assigned ON public.pick_lists(assigned_to);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_cycle_counts_business_location ON public.cycle_counts(business_id, location_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_tasks_assigned ON public.warehouse_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_warehouse_tasks_status ON public.warehouse_tasks(status);

-- Enable RLS on all tables
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_discrepancies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business access
CREATE POLICY "Business users can manage purchase orders" ON public.purchase_orders FOR ALL USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));
CREATE POLICY "Business users can manage PO line items" ON public.purchase_order_line_items FOR ALL USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))));
CREATE POLICY "Business users can manage warehouse bins" ON public.warehouse_bins FOR ALL USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));
CREATE POLICY "Business users can manage bin assignments" ON public.bin_assignments FOR ALL USING (warehouse_bin_id IN (SELECT id FROM public.warehouse_bins WHERE business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))));
CREATE POLICY "Business users can manage pick lists" ON public.pick_lists FOR ALL USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));
CREATE POLICY "Business users can manage pick list items" ON public.pick_list_items FOR ALL USING (pick_list_id IN (SELECT id FROM public.pick_lists WHERE business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))));
CREATE POLICY "Business users can manage shipments" ON public.shipments FOR ALL USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));
CREATE POLICY "Business users can manage shipment items" ON public.shipment_line_items FOR ALL USING (shipment_id IN (SELECT id FROM public.shipments WHERE business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))));
CREATE POLICY "Business users can manage cycle counts" ON public.cycle_counts FOR ALL USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));
CREATE POLICY "Business users can manage cycle count items" ON public.cycle_count_items FOR ALL USING (cycle_count_id IN (SELECT id FROM public.cycle_counts WHERE business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))));
CREATE POLICY "Business users can manage warehouse tasks" ON public.warehouse_tasks FOR ALL USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));
CREATE POLICY "Business users can manage inventory adjustments" ON public.inventory_adjustments FOR ALL USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));
CREATE POLICY "Business users can manage receiving discrepancies" ON public.receiving_discrepancies FOR ALL USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bin_assignments_updated_at BEFORE UPDATE ON public.bin_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pick_lists_updated_at BEFORE UPDATE ON public.pick_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cycle_counts_updated_at BEFORE UPDATE ON public.cycle_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warehouse_tasks_updated_at BEFORE UPDATE ON public.warehouse_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();