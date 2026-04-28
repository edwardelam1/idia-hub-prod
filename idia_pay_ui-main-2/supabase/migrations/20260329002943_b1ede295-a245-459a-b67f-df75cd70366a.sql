
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-photos', 'recipe-photos', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public read access for recipe photos" ON storage.objects FOR SELECT USING (bucket_id = 'recipe-photos');
CREATE POLICY "Allow upload recipe photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recipe-photos');
CREATE POLICY "Allow update recipe photos" ON storage.objects FOR UPDATE USING (bucket_id = 'recipe-photos');
CREATE POLICY "Allow delete recipe photos" ON storage.objects FOR DELETE USING (bucket_id = 'recipe-photos');
