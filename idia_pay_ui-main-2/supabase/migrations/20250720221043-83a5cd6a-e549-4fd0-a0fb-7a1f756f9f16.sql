
-- Create recipe_ingredients table to link recipes with inventory items
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(recipe_id, inventory_item_id)
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Main Course',
  prep_time INTEGER DEFAULT 0,
  cook_time INTEGER DEFAULT 0,
  servings INTEGER DEFAULT 1,
  difficulty TEXT DEFAULT 'Medium',
  instructions JSONB DEFAULT '[]',
  allergens JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their business recipes" 
ON public.recipes 
FOR ALL 
USING (business_id IN (
  SELECT business_id FROM business_users 
  WHERE user_id = auth.uid() AND is_active = true
));

-- Add RLS policies for recipe_ingredients  
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage recipe ingredients for their business recipes" 
ON public.recipe_ingredients 
FOR ALL 
USING (recipe_id IN (
  SELECT id FROM public.recipes 
  WHERE business_id IN (
    SELECT business_id FROM business_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
));

-- Update menu_items to reference recipes instead of direct ingredients
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS menu_status TEXT DEFAULT 'available';

-- Update menu_items RLS policy
DROP POLICY IF EXISTS "Users can access their business menu items" ON public.menu_items;

CREATE POLICY "Users can access their business menu items" 
ON public.menu_items 
FOR ALL 
USING (business_id IN (
  SELECT business_id FROM business_users 
  WHERE user_id = auth.uid() AND is_active = true
));
