-- Fix the infinite recursion in business_users RLS policy
DROP POLICY IF EXISTS "Users can access their business user records" ON public.business_users;

-- Create a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_business_access(p_user_id uuid)
RETURNS TABLE(business_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT bu.business_id 
  FROM business_users bu 
  WHERE bu.user_id = p_user_id 
    AND bu.is_active = true;
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can access their business user records" 
ON public.business_users FOR ALL 
USING (
  user_id = auth.uid() 
  OR business_id IN (
    SELECT business_id FROM public.get_user_business_access(auth.uid()) 
    WHERE business_id IN (
      SELECT bu2.business_id FROM business_users bu2 
      WHERE bu2.user_id = auth.uid() AND bu2.role = 'owner' AND bu2.is_active = true
    )
  )
);

-- Fix missing foreign key relationship between recipes and recipe_ingredients
ALTER TABLE public.recipe_ingredients 
ADD CONSTRAINT fk_recipe_ingredients_recipe 
FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_inventory_item_id ON public.recipe_ingredients(inventory_item_id);

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
CREATE POLICY IF NOT EXISTS "Business users can manage their inventory items" 
ON public.inventory_items FOR ALL 
USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));

-- Ensure recipes have proper RLS  
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Business users can manage their recipes" 
ON public.recipes FOR ALL 
USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));

-- Ensure recipe_ingredients have proper RLS
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Business users can manage recipe ingredients" 
ON public.recipe_ingredients FOR ALL 
USING (
  recipe_id IN (
    SELECT id FROM public.recipes 
    WHERE business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))
  )
);