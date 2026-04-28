CREATE OR REPLACE FUNCTION public.get_user_business_access()
RETURNS TABLE(business_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT bu.business_id FROM business_users bu WHERE bu.user_id = auth.uid() AND bu.is_active = true
  UNION ALL
  SELECT b.id FROM businesses b WHERE auth.uid() IS NULL;
$$;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can read businesses" ON public.businesses;
CREATE POLICY "Anon can read businesses" ON public.businesses FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon can read business_users" ON public.business_users;
CREATE POLICY "Anon can read business_users" ON public.business_users FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Anon full access inventory_items" ON public.inventory_items;
CREATE POLICY "Anon full access inventory_items" ON public.inventory_items FOR ALL TO anon USING (true) WITH CHECK (true);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access suppliers" ON public.suppliers;
CREATE POLICY "Anon full access suppliers" ON public.suppliers FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access recipes" ON public.recipes;
CREATE POLICY "Anon full access recipes" ON public.recipes FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access recipe_ingredients" ON public.recipe_ingredients;
CREATE POLICY "Anon full access recipe_ingredients" ON public.recipe_ingredients FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access business_locations" ON public.business_locations;
CREATE POLICY "Anon full access business_locations" ON public.business_locations FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access location_inventory" ON public.location_inventory;
CREATE POLICY "Anon full access location_inventory" ON public.location_inventory FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access inventory_movements" ON public.inventory_movements;
CREATE POLICY "Anon full access inventory_movements" ON public.inventory_movements FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access menu_items" ON public.menu_items;
CREATE POLICY "Anon full access menu_items" ON public.menu_items FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access pos_transactions" ON public.pos_transactions;
CREATE POLICY "Anon full access pos_transactions" ON public.pos_transactions FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access employee_timesheets" ON public.employee_timesheets;
CREATE POLICY "Anon full access employee_timesheets" ON public.employee_timesheets FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access gift_cards" ON public.gift_cards;
CREATE POLICY "Anon full access gift_cards" ON public.gift_cards FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access sales_analytics" ON public.sales_analytics;
CREATE POLICY "Anon full access sales_analytics" ON public.sales_analytics FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon full access payment_methods" ON public.payment_methods;
CREATE POLICY "Anon full access payment_methods" ON public.payment_methods FOR ALL TO anon USING (true) WITH CHECK (true);
ALTER TABLE public.market_benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access market_benchmarks" ON public.market_benchmarks;
CREATE POLICY "Anon full access market_benchmarks" ON public.market_benchmarks FOR ALL TO anon USING (true) WITH CHECK (true);
ALTER TABLE public.competitive_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon full access competitive_analysis" ON public.competitive_analysis;
CREATE POLICY "Anon full access competitive_analysis" ON public.competitive_analysis FOR ALL TO anon USING (true) WITH CHECK (true);
