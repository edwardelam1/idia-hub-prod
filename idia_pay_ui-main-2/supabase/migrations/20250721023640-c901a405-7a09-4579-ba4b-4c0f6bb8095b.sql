-- Update RLS policies for AR tables to use the security definer function
DROP POLICY IF EXISTS "Business users can manage their AR experiences" ON public.ar_experiences;
CREATE POLICY "Business users can manage their AR experiences" 
ON public.ar_experiences FOR ALL 
USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));

DROP POLICY IF EXISTS "Business users can view their AR campaign performance" ON public.ar_campaign_performance;
CREATE POLICY "Business users can view their AR campaign performance" 
ON public.ar_campaign_performance FOR ALL 
USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));

-- Ensure inventory items have proper RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business users can manage their inventory items" ON public.inventory_items;
CREATE POLICY "Business users can manage their inventory items" 
ON public.inventory_items FOR ALL 
USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));

-- Ensure recipes have proper RLS  
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business users can manage their recipes" ON public.recipes;
CREATE POLICY "Business users can manage their recipes" 
ON public.recipes FOR ALL 
USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));

-- Ensure recipe_ingredients have proper RLS
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business users can manage recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Business users can manage recipe ingredients" 
ON public.recipe_ingredients FOR ALL 
USING (
  recipe_id IN (
    SELECT id FROM public.recipes 
    WHERE business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))
  )
);