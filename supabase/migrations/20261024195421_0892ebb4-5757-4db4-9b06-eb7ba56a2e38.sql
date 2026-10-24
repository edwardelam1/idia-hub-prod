CREATE OR REPLACE FUNCTION public.get_security_event_detail(_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.security_events;
  priv boolean;
  sig jsonb;
  pub jsonb;
  ana jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM public.security_events WHERE id = _id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  priv := public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'security_operator');
  sig := CASE WHEN jsonb_typeof(r.result_data->'signals') = 'object' THEN r.result_data->'signals' ELSE '{}'::jsonb END;
  ana := r.result_data->'analysis';

  -- Non-privileged viewers get counts only: no endpoint paths, no nested raw signals.
  pub := sig - 'errors_by_endpoint' - 'serious_events' - 'data';
  IF jsonb_typeof(sig->'errors_by_endpoint') = 'object' THEN
    pub := pub || jsonb_build_object('endpoints_with_errors', (SELECT count(*) FROM jsonb_object_keys(sig->'errors_by_endpoint')));
  END IF;
  IF jsonb_typeof(sig->'serious_events') = 'array' THEN
    pub := pub || jsonb_build_object('serious_events', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('agent', e->>'agent', 'type', e->>'type', 'severity', e->>'severity', 'summary', e->>'summary')), '[]'::jsonb)
      FROM jsonb_array_elements(sig->'serious_events') e));
  END IF;

  RETURN jsonb_build_object(
    'id', r.id,
    'agent', r.agent_name,
    'event_type', r.action_type,
    'severity', lower(r.severity),
    'resolved', coalesce(r.resolved, false),
    'occurred_at', r.timestamp,
    'analysis', CASE WHEN jsonb_typeof(ana) = 'object' AND ana ? 'summary' THEN ana ELSE NULL END,
    'ai_unavailable', CASE WHEN jsonb_typeof(ana) = 'object' THEN ana->>'ai_unavailable' ELSE NULL END,
    'signals', CASE WHEN priv THEN sig ELSE pub END,
    'privileged', priv
  );
END $$;

CREATE OR REPLACE FUNCTION public.resolve_security_event(_id uuid, _resolved boolean DEFAULT true)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'security_operator')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.security_events SET resolved = _resolved WHERE id = _id;
  RETURN FOUND;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_security_event_detail(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_security_event(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_security_event_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_security_event(uuid, boolean) TO authenticated;