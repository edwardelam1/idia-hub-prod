
-- Team members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'employee',
  status text NOT NULL DEFAULT 'pending',
  hourly_rate numeric DEFAULT 0,
  overtime_rate numeric DEFAULT 0,
  salary_type text NOT NULL DEFAULT 'hourly',
  pay_frequency text NOT NULL DEFAULT 'biweekly',
  tax_filing_status text,
  direct_deposit_enabled boolean NOT NULL DEFAULT false,
  assigned_locations text[] NOT NULL DEFAULT '{}',
  permissions jsonb NOT NULL DEFAULT '{}',
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

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_team_members" ON public.team_members FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_team_members" ON public.team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permission templates table
CREATE TABLE public.permission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  permissions jsonb NOT NULL DEFAULT '{}',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_permission_templates" ON public.permission_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_permission_templates" ON public.permission_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Business hours table
CREATE TABLE public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  open_time time NOT NULL DEFAULT '09:00',
  close_time time NOT NULL DEFAULT '17:00',
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, day_of_week)
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_business_hours" ON public.business_hours FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_business_hours" ON public.business_hours FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Team schedules table
CREATE TABLE public.team_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL,
  schedule_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes integer NOT NULL DEFAULT 0,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_team_schedules" ON public.team_schedules FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_team_schedules" ON public.team_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Time entries (clock in/out)
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  break_minutes integer NOT NULL DEFAULT 0,
  total_hours numeric,
  overtime_hours numeric DEFAULT 0,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_time_entries" ON public.time_entries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_time_entries" ON public.time_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
