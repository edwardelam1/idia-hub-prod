
ALTER TABLE public.recipes 
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cook_time integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS servings integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'Easy',
  ADD COLUMN IF NOT EXISTS base_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allergens text[] DEFAULT '{}';
