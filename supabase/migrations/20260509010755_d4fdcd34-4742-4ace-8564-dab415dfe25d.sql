DROP POLICY IF EXISTS "Admin reviewers can view KYB documents" ON storage.objects;

CREATE POLICY "Admin reviewers can view KYB documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-kyb-docs'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.account_type = 'admin'
  )
);