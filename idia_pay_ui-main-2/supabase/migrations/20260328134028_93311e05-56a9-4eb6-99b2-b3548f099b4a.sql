
-- ====================================
-- UOM Dimensions (Mass, Volume, Count, Length, Time)
-- ====================================
CREATE TABLE public.uom_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_name text NOT NULL UNIQUE
);

ALTER TABLE public.uom_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_uom_dimensions" ON public.uom_dimensions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_uom_dimensions" ON public.uom_dimensions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================
-- UOM Master (individual units linked to dimensions)
-- ====================================
CREATE TABLE public.uom_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id uuid NOT NULL REFERENCES public.uom_dimensions(id) ON DELETE CASCADE,
  unit_name text NOT NULL,
  unit_abbrev text NOT NULL,
  is_base_unit boolean NOT NULL DEFAULT false,
  UNIQUE(unit_name),
  UNIQUE(unit_abbrev)
);

ALTER TABLE public.uom_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_uom_master" ON public.uom_master FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_uom_master" ON public.uom_master FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================
-- UOM Conversions (intra-dimensional multipliers)
-- ====================================
CREATE TABLE public.uom_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_uom_id uuid NOT NULL REFERENCES public.uom_master(id) ON DELETE CASCADE,
  to_uom_id uuid NOT NULL REFERENCES public.uom_master(id) ON DELETE CASCADE,
  multiplier decimal(18,8) NOT NULL,
  UNIQUE(from_uom_id, to_uom_id)
);

ALTER TABLE public.uom_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_uom_conversions" ON public.uom_conversions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_uom_conversions" ON public.uom_conversions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================
-- Product Density Coefficients (cross-dimensional conversion per product)
-- ====================================
CREATE TABLE public.product_density_coefficients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  from_dimension_id uuid NOT NULL REFERENCES public.uom_dimensions(id),
  to_dimension_id uuid NOT NULL REFERENCES public.uom_dimensions(id),
  coefficient_value decimal(18,8) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, from_dimension_id, to_dimension_id)
);

ALTER TABLE public.product_density_coefficients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_product_density" ON public.product_density_coefficients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_product_density" ON public.product_density_coefficients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================
-- Recipe Hierarchy (DAG enforcement for sub-recipes)
-- ====================================
CREATE TABLE public.recipe_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  child_recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  quantity decimal(10,4) NOT NULL DEFAULT 1,
  depth_level integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_recipe_id, child_recipe_id),
  CHECK (parent_recipe_id != child_recipe_id)
);

ALTER TABLE public.recipe_hierarchy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_recipe_hierarchy" ON public.recipe_hierarchy FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_recipe_hierarchy" ON public.recipe_hierarchy FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================
-- GL Journal Entries (native general ledger)
-- ====================================
CREATE TABLE public.gl_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  transaction_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  debit_account text NOT NULL,
  credit_account text NOT NULL,
  amount decimal(14,2) NOT NULL,
  reference_id uuid,
  reference_type text,
  product_id uuid REFERENCES public.inventory_items(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gl_journal_business ON public.gl_journal_entries(business_id, created_at DESC);

ALTER TABLE public.gl_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_gl_journal" ON public.gl_journal_entries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_gl_journal" ON public.gl_journal_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================
-- Yield Records (actual vs expected output per production run)
-- ====================================
CREATE TABLE public.yield_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  expected_output decimal(10,4) NOT NULL,
  actual_output decimal(10,4) NOT NULL,
  yield_percentage decimal(6,2) GENERATED ALWAYS AS (
    CASE WHEN expected_output > 0 THEN (actual_output / expected_output) * 100 ELSE 0 END
  ) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.yield_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_yield_records" ON public.yield_records FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_yield_records" ON public.yield_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================
-- Add yield coefficient fields to recipe_ingredients
-- ====================================
ALTER TABLE public.recipe_ingredients 
  ADD COLUMN IF NOT EXISTS gross_quantity decimal(10,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS yield_percentage decimal(6,2) DEFAULT 100.00;

-- ====================================
-- Add inventory state column to inventory_items
-- ====================================
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS inventory_state text NOT NULL DEFAULT 'Available';
