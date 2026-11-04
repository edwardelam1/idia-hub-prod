-- 1. Provisioning columns on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS utility_provisioned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS utility_rate numeric(12,4) NOT NULL DEFAULT 2.5000,
  ADD COLUMN IF NOT EXISTS vulture_provisioned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vulture_rate numeric(12,4) NOT NULL DEFAULT 50.0000,
  ADD COLUMN IF NOT EXISTS services_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS services_updated_by uuid;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_utility_rate_range CHECK (utility_rate >= 0 AND utility_rate <= 100000),
  ADD CONSTRAINT businesses_vulture_rate_range CHECK (vulture_rate >= 0 AND vulture_rate <= 100000);

-- 2. Who may provision services (IDIA C-suite or super admin)
CREATE OR REPLACE FUNCTION public.is_service_operator(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
     AND (public.is_csuite(_user_id) OR public.has_role(_user_id, 'super_admin'))
$$;

-- 3. Append-only provisioning history
CREATE TABLE public.business_service_provisioning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  changed_by uuid,
  utility_provisioned boolean NOT NULL,
  utility_rate numeric(12,4) NOT NULL,
  vulture_provisioned boolean NOT NULL,
  vulture_rate numeric(12,4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_service_provisioning_log TO authenticated;
GRANT ALL ON public.business_service_provisioning_log TO service_role;
ALTER TABLE public.business_service_provisioning_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service operators read provisioning history"
  ON public.business_service_provisioning_log FOR SELECT TO authenticated
  USING (public.is_service_operator(auth.uid()));
CREATE INDEX idx_bspl_business ON public.business_service_provisioning_log (business_id, created_at DESC);

-- 4. Guard: only operators (or service role) may change provisioning fields
CREATE OR REPLACE FUNCTION public.guard_business_service_provisioning()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _privileged boolean := (_uid IS NULL) OR public.is_service_operator(_uid);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT _privileged THEN
      NEW.utility_provisioned := false;
      NEW.utility_rate := 2.5000;
      NEW.vulture_provisioned := false;
      NEW.vulture_rate := 50.0000;
      NEW.services_updated_at := NULL;
      NEW.services_updated_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.utility_provisioned, NEW.utility_rate, NEW.vulture_provisioned, NEW.vulture_rate)
     IS DISTINCT FROM (OLD.utility_provisioned, OLD.utility_rate, OLD.vulture_provisioned, OLD.vulture_rate) THEN
    IF NOT _privileged THEN
      RAISE EXCEPTION 'Only IDIA C-suite can change service provisioning or rates' USING ERRCODE = '42501';
    END IF;
    NEW.services_updated_at := now();
    NEW.services_updated_by := _uid;
    INSERT INTO public.business_service_provisioning_log
      (business_id, changed_by, utility_provisioned, utility_rate, vulture_provisioned, vulture_rate)
    VALUES (NEW.id, _uid, NEW.utility_provisioned, NEW.utility_rate, NEW.vulture_provisioned, NEW.vulture_rate);
  ELSIF NOT _privileged THEN
    NEW.services_updated_at := OLD.services_updated_at;
    NEW.services_updated_by := OLD.services_updated_by;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_business_service_provisioning
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.guard_business_service_provisioning();

-- 5. Operator RPC used by the Client Organizations page
CREATE OR REPLACE FUNCTION public.set_business_service_provisioning(
  _business_id uuid,
  _utility_provisioned boolean,
  _utility_rate numeric,
  _vulture_provisioned boolean,
  _vulture_rate numeric
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.businesses%ROWTYPE;
BEGIN
  IF NOT public.is_service_operator(auth.uid()) THEN
    RAISE EXCEPTION 'Only IDIA C-suite can set service provisioning' USING ERRCODE = '42501';
  END IF;
  IF _utility_rate IS NULL OR _utility_rate < 0 OR _utility_rate > 100000 THEN
    RAISE EXCEPTION 'Identity Verification rate must be between 0 and 100000 CR' USING ERRCODE = '22023';
  END IF;
  IF _vulture_rate IS NULL OR _vulture_rate < 0 OR _vulture_rate > 100000 THEN
    RAISE EXCEPTION 'Vulture rate must be between 0 and 100000 CR' USING ERRCODE = '22023';
  END IF;

  UPDATE public.businesses
     SET utility_provisioned = COALESCE(_utility_provisioned, false),
         utility_rate = round(_utility_rate, 4),
         vulture_provisioned = COALESCE(_vulture_provisioned, false),
         vulture_rate = round(_vulture_rate, 4)
   WHERE id = _business_id
  RETURNING * INTO _row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'business_id', _row.id,
    'utility_provisioned', _row.utility_provisioned,
    'utility_rate', _row.utility_rate,
    'vulture_provisioned', _row.vulture_provisioned,
    'vulture_rate', _row.vulture_rate,
    'services_updated_at', _row.services_updated_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.set_business_service_provisioning(uuid, boolean, numeric, boolean, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_business_service_provisioning(uuid, boolean, numeric, boolean, numeric) TO authenticated;

-- 6. Server-side access + rate resolution (edge functions only)
CREATE OR REPLACE FUNCTION public.resolve_service_access(_user_id uuid, _service text)
RETURNS TABLE(allowed boolean, is_operator boolean, business_id uuid, business_name text, rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _op boolean;
  _bid uuid;
  _bname text;
  _brate numeric;
BEGIN
  IF _service NOT IN ('utility', 'vulture') THEN
    RAISE EXCEPTION 'Unknown service %', _service USING ERRCODE = '22023';
  END IF;
  _op := public.is_service_operator(_user_id);

  SELECT b.id, b.name, CASE WHEN _service = 'utility' THEN b.utility_rate ELSE b.vulture_rate END
    INTO _bid, _bname, _brate
    FROM public.business_users bu
    JOIN public.businesses b ON b.id = bu.business_id
   WHERE bu.user_id = _user_id
     AND bu.is_active = true
     AND CASE WHEN _service = 'utility' THEN b.utility_provisioned ELSE b.vulture_provisioned END
   ORDER BY b.created_at, b.id
   LIMIT 1;

  IF _bid IS NOT NULL THEN
    RETURN QUERY SELECT true, _op, _bid, _bname, _brate;
  ELSIF _op THEN
    RETURN QUERY SELECT true, true, NULL::uuid, NULL::text,
      (CASE WHEN _service = 'utility' THEN 2.5000 ELSE 50.0000 END)::numeric;
  ELSE
    RETURN QUERY SELECT false, false, NULL::uuid, NULL::text, NULL::numeric;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_service_access(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_service_access(uuid, text) TO service_role;

-- 7. Caller-facing visibility (Data Marketplace panels)
CREATE OR REPLACE FUNCTION public.get_my_service_access()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  u record;
  v record;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('is_operator', false,
      'utility', jsonb_build_object('visible', false),
      'vulture', jsonb_build_object('visible', false));
  END IF;
  SELECT * INTO u FROM public.resolve_service_access(_uid, 'utility');
  SELECT * INTO v FROM public.resolve_service_access(_uid, 'vulture');
  RETURN jsonb_build_object(
    'is_operator', COALESCE(u.is_operator, false),
    'utility', jsonb_build_object('visible', COALESCE(u.allowed, false), 'rate', u.rate,
                                  'business_id', u.business_id, 'business_name', u.business_name),
    'vulture', jsonb_build_object('visible', COALESCE(v.allowed, false), 'rate', v.rate,
                                  'business_id', v.business_id, 'business_name', v.business_name)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_service_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_service_access() TO authenticated;

-- 8. Idempotent per-use billing at the organization's rate (edge functions only)
CREATE OR REPLACE FUNCTION public.charge_service_usage(
  _user_id uuid,
  _service text,
  _units integer,
  _reference text,
  _description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  a record;
  _amount numeric;
  _balance numeric;
  _entry uuid;
BEGIN
  IF _reference IS NULL OR length(_reference) < 8 THEN
    RAISE EXCEPTION 'A unique charge reference is required' USING ERRCODE = '22023';
  END IF;
  IF _units IS NULL OR _units < 1 THEN
    RAISE EXCEPTION 'Units must be at least 1' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO a FROM public.resolve_service_access(_user_id, _service);
  IF NOT COALESCE(a.allowed, false) THEN
    RETURN jsonb_build_object('status', 'not_provisioned');
  END IF;

  _amount := round(a.rate * _units, 4);
  IF _amount <= 0 THEN
    RETURN jsonb_build_object('status', 'no_charge', 'rate', a.rate, 'business_id', a.business_id);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('synapse_ledger:' || _user_id::text));

  IF EXISTS (SELECT 1 FROM public.synapse_credit_ledger WHERE transaction_id = _reference) THEN
    RETURN jsonb_build_object('status', 'already_charged', 'amount', _amount, 'rate', a.rate);
  END IF;

  _balance := COALESCE(public.get_synapse_balance(_user_id), 0);
  IF _balance < _amount THEN
    RETURN jsonb_build_object('status', 'insufficient_credits', 'amount', _amount,
                              'shortfall', round(_amount - _balance, 4), 'rate', a.rate);
  END IF;

  INSERT INTO public.synapse_credit_ledger
    (user_id, entry_type, amount, transaction_type, status, description, reference_id, transaction_id, metadata)
  VALUES
    (_user_id, 'USAGE', -_amount, 'fee', 'settled',
     COALESCE(_description, initcap(_service) || ' usage [' || _amount || ' CR]'),
     _reference, _reference,
     jsonb_build_object('service', _service, 'business_id', a.business_id, 'rate', a.rate, 'units', _units))
  RETURNING id INTO _entry;

  RETURN jsonb_build_object('status', 'charged', 'amount', _amount, 'rate', a.rate,
                            'business_id', a.business_id, 'ledger_entry_id', _entry);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('status', 'already_charged');
END;
$$;
REVOKE ALL ON FUNCTION public.charge_service_usage(uuid, text, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.charge_service_usage(uuid, text, integer, text, text) TO service_role;

-- 9. Vulture tenancy follows per-organization provisioning
CREATE OR REPLACE FUNCTION public.is_vulture_tenant(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'security_operator')
      OR COALESCE((SELECT r.allowed FROM public.resolve_service_access(_user_id, 'vulture') r), false)
$$;