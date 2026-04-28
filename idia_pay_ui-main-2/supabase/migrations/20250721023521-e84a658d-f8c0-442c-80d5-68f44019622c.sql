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