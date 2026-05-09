DROP POLICY IF EXISTS "Admin reviewers can view KYB documents" ON storage.objects;

CREATE POLICY "Internal reviewers can view KYB documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-kyb-docs'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.account_type IN ('admin', 'super-admin', 'csuite', 'god_guid')
  )
);