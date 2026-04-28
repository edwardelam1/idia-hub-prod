
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text DEFAULT '',
  base_price numeric NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Main Course',
  is_active boolean NOT NULL DEFAULT true,
  is_locked boolean NOT NULL DEFAULT false,
  menu_status text NOT NULL DEFAULT 'available',
  preparation_time integer,
  allergen_info text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_menu_items" ON public.menu_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_menu_items" ON public.menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
