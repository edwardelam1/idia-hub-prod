
-- Phase 1: Add enterprise columns to inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS sku text DEFAULT '',
  ADD COLUMN IF NOT EXISTS gtin text DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS requires_batch_tracking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_serialization boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS minimum_shelf_life_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tolerance_variance_pct numeric DEFAULT 5.0;

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  location_id uuid REFERENCES public.business_locations(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  po_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  expected_delivery_date date,
  total_amount numeric DEFAULT 0,
  invoice_amount numeric DEFAULT 0,
  invoice_status text NOT NULL DEFAULT 'uninvoiced',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_purchase_orders" ON public.purchase_orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create purchase_order_line_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id),
  sku text DEFAULT '',
  gtin text DEFAULT '',
  item_name text NOT NULL DEFAULT '',
  ordered_quantity numeric NOT NULL DEFAULT 0,
  received_quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  invoice_unit_cost numeric DEFAULT 0,
  received_uom text DEFAULT '',
  lot_number text DEFAULT '',
  expiration_date date,
  ppv_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_po_line_items" ON public.purchase_order_line_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_po_line_items" ON public.purchase_order_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create receiving_discrepancies table
CREATE TABLE IF NOT EXISTS public.receiving_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES public.purchase_orders(id),
  purchase_order_line_item_id uuid REFERENCES public.purchase_order_line_items(id),
  discrepancy_type text NOT NULL DEFAULT 'damage',
  description text DEFAULT '',
  quantity_variance numeric DEFAULT 0,
  cost_variance numeric DEFAULT 0,
  resolution_status text NOT NULL DEFAULT 'open',
  resolved_by text DEFAULT '',
  resolved_at timestamptz,
  created_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receiving_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_receiving_discrepancies" ON public.receiving_discrepancies FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_receiving_discrepancies" ON public.receiving_discrepancies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create receiving_sessions table
CREATE TABLE IF NOT EXISTS public.receiving_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  location_id uuid REFERENCES public.business_locations(id),
  receiving_mode text NOT NULL DEFAULT 'blind',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  received_by text DEFAULT '',
  status text NOT NULL DEFAULT 'in_progress',
  gl_accrual_posted boolean NOT NULL DEFAULT false
);

ALTER TABLE public.receiving_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_receiving_sessions" ON public.receiving_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_receiving_sessions" ON public.receiving_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime on purchase_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
