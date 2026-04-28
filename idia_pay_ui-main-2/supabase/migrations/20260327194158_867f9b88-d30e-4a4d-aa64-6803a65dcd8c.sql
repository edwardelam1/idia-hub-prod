
-- Core business tables
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Business',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Supplies',
  unit_of_measure TEXT NOT NULL DEFAULT 'units',
  current_cost NUMERIC DEFAULT 0,
  par_level INTEGER DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  instructions TEXT,
  prep_time INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'units'
);

CREATE TABLE IF NOT EXISTS public.business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default business
INSERT INTO public.businesses (id, name)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Default Business')
ON CONFLICT (id) DO NOTHING;

-- RLS policies: allow anon full access for demo mode
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_businesses" ON public.businesses FOR SELECT TO anon USING (true);
CREATE POLICY "auth_read_businesses" ON public.businesses FOR SELECT TO authenticated USING (true);

ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_business_users" ON public.business_users FOR SELECT TO anon USING (true);
CREATE POLICY "auth_read_business_users" ON public.business_users FOR SELECT TO authenticated USING (true);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_inventory" ON public.inventory_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_inventory" ON public.inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_suppliers" ON public.suppliers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_recipes" ON public.recipes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_recipes" ON public.recipes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_recipe_ingredients" ON public.recipe_ingredients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_recipe_ingredients" ON public.recipe_ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_business_locations" ON public.business_locations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_business_locations" ON public.business_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);
