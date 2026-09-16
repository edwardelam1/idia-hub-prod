CREATE OR REPLACE FUNCTION public.verify_aca_hashes(_hashes text[])
RETURNS TABLE(aca_hash_key text, vault text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s.aca_hash_key, 'staged_health_data'::text
  FROM public.staged_health_data s
  WHERE s.aca_hash_key = ANY(_hashes)
  UNION
  SELECT DISTINCT l.aca_hash_key, 'staged_lifestyle_data'::text
  FROM public.staged_lifestyle_data l
  WHERE l.aca_hash_key = ANY(_hashes)
  UNION
  SELECT DISTINCT f.aca_hash_key, 'staged_ford_data'::text
  FROM public.staged_ford_data f
  WHERE f.aca_hash_key = ANY(_hashes)
$$;

GRANT EXECUTE ON FUNCTION public.verify_aca_hashes(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_aca_hashes(text[]) TO authenticated;