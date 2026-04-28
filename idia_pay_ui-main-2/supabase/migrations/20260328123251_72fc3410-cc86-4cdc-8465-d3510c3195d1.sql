
CREATE TABLE public.inventory_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  item_name text NOT NULL,
  inventory_item_id uuid,
  action text NOT NULL DEFAULT 'added',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'units',
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_inventory_history" ON public.inventory_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_inventory_history" ON public.inventory_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.recipe_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  recipe_name text NOT NULL,
  recipe_id uuid,
  action text NOT NULL DEFAULT 'created',
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_recipe_history" ON public.recipe_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_recipe_history" ON public.recipe_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
