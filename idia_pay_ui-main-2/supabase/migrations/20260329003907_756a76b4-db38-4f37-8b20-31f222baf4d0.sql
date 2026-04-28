CREATE TABLE public.menu_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  menu_item_id uuid,
  item_name text NOT NULL,
  action text NOT NULL DEFAULT 'created',
  performed_by text DEFAULT 'System',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_menu_history" ON public.menu_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_menu_history" ON public.menu_history FOR ALL TO authenticated USING (true) WITH CHECK (true);