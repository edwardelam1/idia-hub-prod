
CREATE TABLE IF NOT EXISTS public.relayer_mutex (
  id TEXT PRIMARY KEY,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

GRANT SELECT ON public.relayer_mutex TO service_role;

INSERT INTO public.relayer_mutex (id) VALUES ('primary-relayer') ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.acquire_relayer_lock(run_id TEXT, timeout_seconds INT DEFAULT 180)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_locked BOOLEAN;
BEGIN
  UPDATE public.relayer_mutex
     SET locked_by = run_id,
         locked_at = now(),
         expires_at = now() + (timeout_seconds || ' seconds')::interval
   WHERE id = 'primary-relayer'
     AND (locked_by IS NULL OR expires_at < now());
  v_locked := FOUND;
  RETURN v_locked;
END; $$;

CREATE OR REPLACE FUNCTION public.release_relayer_lock(run_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.relayer_mutex
     SET locked_by = NULL, locked_at = NULL, expires_at = NULL
   WHERE id = 'primary-relayer' AND locked_by = run_id;
END; $$;

REVOKE ALL ON FUNCTION public.acquire_relayer_lock(TEXT, INT) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_relayer_lock(TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_relayer_lock(TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_relayer_lock(TEXT) TO service_role;
