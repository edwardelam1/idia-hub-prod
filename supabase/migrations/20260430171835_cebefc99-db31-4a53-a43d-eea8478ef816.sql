
-- ============================================================================
-- 1. Helper: has_business_access(business_id) using the existing definer fn
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_business_access(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_user_business_access(auth.uid()) b
    WHERE b.business_id = p_business_id
  );
$$;

-- ============================================================================
-- 2. employees (canonical staff table; replaces "team_members")
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'employee',
  status text NOT NULL DEFAULT 'pending',
  hourly_rate numeric DEFAULT 0,
  overtime_rate numeric DEFAULT 0,
  salary_type text DEFAULT 'hourly',
  pay_frequency text DEFAULT 'biweekly',
  tax_filing_status text,
  direct_deposit_enabled boolean DEFAULT false,
  assigned_locations uuid[] DEFAULT '{}',
  permissions jsonb DEFAULT '{}'::jsonb,
  permission_template_id uuid,
  hire_date date,
  emergency_contact_name text,
  emergency_contact_phone text,
  address text,
  city text,
  state text,
  zip text,
  notes text,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employees_business ON public.employees(business_id);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_business_access"
  ON public.employees FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

CREATE TRIGGER trg_employees_updated
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. permission_templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.permission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_perm_templates_business ON public.permission_templates(business_id);

ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perm_templates_business_access"
  ON public.permission_templates FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

CREATE TRIGGER trg_perm_templates_updated
  BEFORE UPDATE ON public.permission_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. business_hours
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time time NOT NULL DEFAULT '09:00',
  close_time time NOT NULL DEFAULT '17:00',
  is_closed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, day_of_week)
);
CREATE INDEX IF NOT EXISTS idx_business_hours_business ON public.business_hours(business_id);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_hours_access"
  ON public.business_hours FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

-- ============================================================================
-- 5. affiliate_campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.affiliate_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  campaign_type text DEFAULT 'commission',
  status text DEFAULT 'pending',
  commission_rate numeric DEFAULT 0,
  budget numeric DEFAULT 0,
  start_date date,
  end_date date,
  target_audience jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aff_campaigns_business ON public.affiliate_campaigns(business_id);

ALTER TABLE public.affiliate_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_campaigns_access"
  ON public.affiliate_campaigns FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

CREATE TRIGGER trg_aff_campaigns_updated
  BEFORE UPDATE ON public.affiliate_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. affiliate_transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.affiliate_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.affiliate_campaigns(id) ON DELETE SET NULL,
  creator_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  customer_reference text,
  transaction_date timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aff_tx_business ON public.affiliate_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_aff_tx_campaign ON public.affiliate_transactions(campaign_id);

ALTER TABLE public.affiliate_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aff_tx_access"
  ON public.affiliate_transactions FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

-- ============================================================================
-- 7. ar_experiences
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ar_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  experience_type text DEFAULT 'product_view',
  status text DEFAULT 'draft',
  total_views integer DEFAULT 0,
  total_interactions integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_exp_business ON public.ar_experiences(business_id);

ALTER TABLE public.ar_experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_exp_access"
  ON public.ar_experiences FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

CREATE TRIGGER trg_ar_exp_updated
  BEFORE UPDATE ON public.ar_experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. ar_campaign_performance
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ar_campaign_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  experience_id uuid REFERENCES public.ar_experiences(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_interactions integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  revenue_attributed numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_perf_business ON public.ar_campaign_performance(business_id);
CREATE INDEX IF NOT EXISTS idx_ar_perf_date ON public.ar_campaign_performance(date);

ALTER TABLE public.ar_campaign_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_perf_access"
  ON public.ar_campaign_performance FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

-- ============================================================================
-- 9. inventory_history (append-only audit log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  inventory_item_id uuid,
  item_name text NOT NULL,
  action text NOT NULL,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'units',
  note text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_hist_business ON public.inventory_history(business_id);
CREATE INDEX IF NOT EXISTS idx_inv_hist_created ON public.inventory_history(created_at DESC);

ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_hist_select"
  ON public.inventory_history FOR SELECT
  USING (public.has_business_access(business_id));
CREATE POLICY "inv_hist_insert"
  ON public.inventory_history FOR INSERT
  WITH CHECK (public.has_business_access(business_id));

-- ============================================================================
-- 10. menu_history (append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.menu_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  menu_item_id uuid,
  item_name text NOT NULL,
  action text NOT NULL,
  note text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_menu_hist_business ON public.menu_history(business_id);

ALTER TABLE public.menu_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_hist_select"
  ON public.menu_history FOR SELECT
  USING (public.has_business_access(business_id));
CREATE POLICY "menu_hist_insert"
  ON public.menu_history FOR INSERT
  WITH CHECK (public.has_business_access(business_id));

-- ============================================================================
-- 11. recipe_history (append-only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipe_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  recipe_id uuid,
  recipe_name text NOT NULL,
  action text NOT NULL,
  note text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipe_hist_business ON public.recipe_history(business_id);

ALTER TABLE public.recipe_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipe_hist_select"
  ON public.recipe_history FOR SELECT
  USING (public.has_business_access(business_id));
CREATE POLICY "recipe_hist_insert"
  ON public.recipe_history FOR INSERT
  WITH CHECK (public.has_business_access(business_id));

-- ============================================================================
-- 12. Column additions referenced by imported modules
-- ============================================================================
ALTER TABLE public.recipe_ingredients
  ADD COLUMN IF NOT EXISTS gross_quantity numeric,
  ADD COLUMN IF NOT EXISTS yield_percentage numeric DEFAULT 100;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS individual_unit_uom text;
