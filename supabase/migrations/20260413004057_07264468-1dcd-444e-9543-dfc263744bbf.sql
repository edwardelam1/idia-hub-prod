INSERT INTO public.profiles (user_id, account_type, platform_guid)
VALUES ('217c6224-d839-43b0-98cb-b4d1be267536', 'personal', gen_random_uuid())
ON CONFLICT (user_id) DO NOTHING;