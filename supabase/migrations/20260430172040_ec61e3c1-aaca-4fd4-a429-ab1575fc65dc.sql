
-- ============================================================================
-- employee_shift_schedules (planned shifts; matches imported module shape)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employee_shift_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  team_member_id uuid NOT NULL,
  schedule_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes integer DEFAULT 0,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emp_sched_business ON public.employee_shift_schedules(business_id);
CREATE INDEX IF NOT EXISTS idx_emp_sched_member ON public.employee_shift_schedules(team_member_id);
CREATE INDEX IF NOT EXISTS idx_emp_sched_date ON public.employee_shift_schedules(schedule_date);

ALTER TABLE public.employee_shift_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_sched_access"
  ON public.employee_shift_schedules FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

-- ============================================================================
-- employee_time_entries (clock-in/out)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employee_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  team_member_id uuid NOT NULL,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  break_minutes integer DEFAULT 0,
  total_hours numeric,
  overtime_hours numeric,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emp_time_business ON public.employee_time_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_emp_time_member ON public.employee_time_entries(team_member_id);
CREATE INDEX IF NOT EXISTS idx_emp_time_clockin ON public.employee_time_entries(clock_in DESC);

ALTER TABLE public.employee_time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_time_access"
  ON public.employee_time_entries FOR ALL
  USING (public.has_business_access(business_id))
  WITH CHECK (public.has_business_access(business_id));

-- ============================================================================
-- inventory_items missing columns
-- ============================================================================
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS current_stock numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_batch_tracking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS minimum_shelf_life_days integer,
  ADD COLUMN IF NOT EXISTS tolerance_variance_pct numeric;

-- ============================================================================
-- affiliate_campaigns aliases (campaign_name, budget_allocation)
-- ============================================================================
ALTER TABLE public.affiliate_campaigns
  ADD COLUMN IF NOT EXISTS campaign_name text,
  ADD COLUMN IF NOT EXISTS budget_allocation numeric DEFAULT 0;

-- Backfill aliases from the canonical columns
UPDATE public.affiliate_campaigns SET campaign_name = name WHERE campaign_name IS NULL;
UPDATE public.affiliate_campaigns SET budget_allocation = budget WHERE budget_allocation IS NULL OR budget_allocation = 0;

-- ============================================================================
-- affiliate_transactions aliases
-- ============================================================================
ALTER TABLE public.affiliate_transactions
  ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'commission',
  ADD COLUMN IF NOT EXISTS transaction_value numeric DEFAULT 0;

UPDATE public.affiliate_transactions SET transaction_value = amount WHERE transaction_value IS NULL OR transaction_value = 0;

-- ============================================================================
-- ar_experiences additional columns
-- ============================================================================
ALTER TABLE public.ar_experiences
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS conversion_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_attributed numeric DEFAULT 0;

-- ============================================================================
-- ar_campaign_performance additional columns
-- ============================================================================
ALTER TABLE public.ar_campaign_performance
  ADD COLUMN IF NOT EXISTS revenue_generated numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_duration_avg numeric DEFAULT 0;

UPDATE public.ar_campaign_performance SET revenue_generated = revenue_attributed WHERE revenue_generated = 0;
