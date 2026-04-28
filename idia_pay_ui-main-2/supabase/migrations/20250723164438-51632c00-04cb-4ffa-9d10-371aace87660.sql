-- IDIA Pay Phase 1: Enhanced Application Launch & Account Hierarchy
-- Requirements 1.0, 2.0: Marketing splash screen API, facility types, warehouse roles

-- Create marketing configuration table for dynamic splash screen content
CREATE TABLE IF NOT EXISTS public.marketing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  taglines JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default marketing content
INSERT INTO public.marketing_config (logo_url, taglines) VALUES (
  '/lovable-uploads/91fc9afd-c1cf-4088-8d4f-12b744fcfda4.png',
  '["Revolutionizing Business Operations with AI", "Smart Payments. Smarter Business.", "The Future of Commerce is Here", "Powered by Blockchain & Intelligence", "Transform Your Business Today"]'::jsonb
) ON CONFLICT DO NOTHING;

-- Enhance business_locations table with facility types for warehouse management
ALTER TABLE public.business_locations 
ADD COLUMN IF NOT EXISTS facility_type TEXT DEFAULT 'location' CHECK (facility_type IN ('location', 'warehouse'));

-- Create facility_assignments table for user-facility relationships  
CREATE TABLE IF NOT EXISTS public.facility_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  facility_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, facility_id)
);

-- Enhance business_users table with warehouse associate role
-- First check if the enum type exists and extend it
DO $$
BEGIN
  -- Add warehouse_associate to user_role enum if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'warehouse_associate' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'warehouse_associate';
  END IF;
END$$;

-- Create permissions table for granular authorization
CREATE TABLE IF NOT EXISTS public.permissions (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general'
);

-- Insert base permissions for IDIA Pay system
INSERT INTO public.permissions (name, description, category) VALUES
  ('can_process_payroll', 'Process IDIA-USD payroll payments', 'financial'),
  ('can_approve_cycle_counts', 'Approve warehouse cycle count adjustments', 'warehouse'),
  ('can_manage_global_menu', 'Update menu across all locations', 'operations'),
  ('can_access_data_coop', 'Configure data co-op settings', 'data'),
  ('can_manage_nfc_payments', 'Configure NFC payment acceptance', 'payments'),
  ('can_manage_gift_cards', 'Create and manage gift card systems', 'payments'),
  ('can_access_ar_management', 'Manage Angelic XR integrations', 'technology'),
  ('can_manage_warehouse_layout', 'Configure warehouse bins and zones', 'warehouse'),
  ('can_process_receiving', 'Process inbound inventory receiving', 'warehouse'),
  ('can_generate_pick_lists', 'Create optimized pick lists for orders', 'warehouse'),
  ('can_manage_suppliers', 'Manage supplier database', 'operations'),
  ('can_tokenize_invoices', 'Create tokenized invoice artifacts', 'financial'),
  ('can_view_franchise_data', 'Access franchise performance data', 'franchise'),
  ('can_configure_tax_rates', 'Manage jurisdiction tax rates', 'tax'),
  ('can_access_market_intelligence', 'View market benchmarking data', 'intelligence')
ON CONFLICT (name) DO NOTHING;

-- Create user permission overrides table
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_id INTEGER NOT NULL REFERENCES public.permissions(id),
  is_granted BOOLEAN NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, permission_id)
);

-- Enable RLS on new tables
ALTER TABLE public.marketing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for marketing_config (public read)
CREATE POLICY "Public can read marketing config" 
ON public.marketing_config FOR SELECT 
USING (true);

-- Create RLS policies for facility_assignments
CREATE POLICY "Users can view their facility assignments" 
ON public.facility_assignments FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Business owners can manage facility assignments" 
ON public.facility_assignments FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.business_users bu
    JOIN public.business_locations bl ON bl.business_id = bu.business_id
    WHERE bu.user_id = auth.uid() 
    AND bu.role = 'owner'
    AND bu.is_active = true
    AND bl.id = facility_id
  )
);

-- Create RLS policies for permissions (public read)
CREATE POLICY "All authenticated users can read permissions" 
ON public.permissions FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create RLS policies for user_permission_overrides
CREATE POLICY "Users can view their permission overrides" 
ON public.user_permission_overrides FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Business owners can manage permission overrides" 
ON public.user_permission_overrides FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.business_users bu
    WHERE bu.user_id = auth.uid() 
    AND bu.role = 'owner'
    AND bu.is_active = true
    AND bu.business_id IN (
      SELECT business_id FROM public.business_users 
      WHERE user_id = user_permission_overrides.user_id
    )
  )
);

-- Create function to check user permissions including overrides
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id UUID, p_permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  override_result BOOLEAN;
  base_permission BOOLEAN := false;
BEGIN
  -- Check for explicit permission override first
  SELECT is_granted INTO override_result
  FROM public.user_permission_overrides upo
  JOIN public.permissions p ON p.id = upo.permission_id
  WHERE upo.user_id = p_user_id AND p.name = p_permission_name;
  
  IF override_result IS NOT NULL THEN
    RETURN override_result;
  END IF;
  
  -- Default role-based permissions for owners
  SELECT EXISTS (
    SELECT 1 FROM public.business_users 
    WHERE user_id = p_user_id 
    AND role = 'owner' 
    AND is_active = true
  ) INTO base_permission;
  
  RETURN base_permission;
END;
$$;