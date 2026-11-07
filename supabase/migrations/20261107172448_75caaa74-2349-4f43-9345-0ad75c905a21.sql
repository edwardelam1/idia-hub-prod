CREATE TABLE public.protocol_api_rate_windows (
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key_hash, window_start)
);
GRANT ALL ON public.protocol_api_rate_windows TO service_role;
ALTER TABLE public.protocol_api_rate_windows ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.protocol_api_rate_hit(_key_hash text, _limit integer, _window_seconds integer DEFAULT 60)
RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _start timestamptz := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);
  _hits integer;
BEGIN
  INSERT INTO public.protocol_api_rate_windows(key_hash, window_start, hits)
  VALUES (_key_hash, _start, 1)
  ON CONFLICT (key_hash, window_start) DO UPDATE SET hits = protocol_api_rate_windows.hits + 1
  RETURNING hits INTO _hits;
  IF random() < 0.01 THEN
    DELETE FROM public.protocol_api_rate_windows WHERE window_start < now() - interval '1 hour';
  END IF;
  RETURN QUERY SELECT _hits <= _limit, greatest(_limit - _hits, 0), _start + make_interval(secs => _window_seconds);
END $$;
REVOKE ALL ON FUNCTION public.protocol_api_rate_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protocol_api_rate_hit(text, integer, integer) TO service_role;

CREATE TABLE public.api_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL,
  secret text NOT NULL,
  credit_threshold numeric(18,4),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_webhooks_url_https CHECK (url ~ '^https://'),
  CONSTRAINT api_webhooks_status CHECK (status IN ('active','disabled'))
);
CREATE INDEX api_webhooks_owner_idx ON public.api_webhooks(owner_id);
GRANT ALL ON public.api_webhooks TO service_role;
ALTER TABLE public.api_webhooks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.api_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.api_webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_key text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_status_code integer,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (webhook_id, event_key),
  CONSTRAINT api_webhook_deliveries_status CHECK (status IN ('pending','delivered','failed'))
);
CREATE INDEX api_webhook_deliveries_due_idx ON public.api_webhook_deliveries(status, next_attempt_at);
GRANT ALL ON public.api_webhook_deliveries TO service_role;
ALTER TABLE public.api_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER api_webhooks_touch BEFORE UPDATE ON public.api_webhooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();