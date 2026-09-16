GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

CREATE POLICY "Users can view their own api keys"
ON public.api_keys FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own api keys"
ON public.api_keys FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api keys"
ON public.api_keys FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api keys"
ON public.api_keys FOR DELETE TO authenticated
USING (auth.uid() = user_id);