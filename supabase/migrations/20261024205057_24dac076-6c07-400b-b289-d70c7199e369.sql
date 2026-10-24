CREATE OR REPLACE FUNCTION public.security_events_auto_resolve_low()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.severity, 'low')) IN ('low', 'info') THEN
    NEW.resolved := true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_security_events_auto_resolve_low ON public.security_events;
CREATE TRIGGER trg_security_events_auto_resolve_low
BEFORE INSERT OR UPDATE ON public.security_events
FOR EACH ROW EXECUTE FUNCTION public.security_events_auto_resolve_low();

UPDATE public.security_events SET resolved = true
WHERE lower(coalesce(severity, 'low')) IN ('low', 'info') AND resolved IS DISTINCT FROM true;

CREATE OR REPLACE FUNCTION public.resolve_security_event(_id uuid, _resolved boolean DEFAULT true)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sev text;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'security_operator')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT lower(coalesce(severity, 'low')) INTO _sev FROM public.security_events WHERE id = _id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF _sev IN ('low', 'info') THEN
    RAISE EXCEPTION 'Low-severity alerts resolve automatically' USING ERRCODE = '22023';
  END IF;
  UPDATE public.security_events SET resolved = _resolved WHERE id = _id;
  RETURN FOUND;
END $$;

REVOKE EXECUTE ON FUNCTION public.resolve_security_event(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_security_event(uuid, boolean) TO authenticated;