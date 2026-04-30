-- Columns
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_ephemeral boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aca_secured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_role text;

-- Backfill platform_role from legacy role
UPDATE public.employees SET platform_role = CASE
  WHEN lower(coalesce(role,'')) IN ('owner','org admin','admin') THEN 'Org Admin'
  WHEN lower(coalesce(role,'')) IN ('manager','team lead','lead') THEN 'Team Lead'
  ELSE 'Team Member'
END WHERE platform_role IS NULL;

ALTER TABLE public.employees
  ALTER COLUMN platform_role SET DEFAULT 'Team Member',
  ALTER COLUMN platform_role SET NOT NULL;

-- Validation trigger (no CHECK constraint, per project policy)
CREATE OR REPLACE FUNCTION public.validate_employee_platform_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.platform_role NOT IN ('Org Admin','Team Lead','Team Member') THEN
    RAISE EXCEPTION 'INVALID_PLATFORM_ROLE: %', NEW.platform_role;
  END IF;
  IF NEW.is_ephemeral AND NEW.platform_role <> 'Team Member' THEN
    RAISE EXCEPTION 'EPHEMERAL_MUST_BE_TEAM_MEMBER';
  END IF;
  IF NEW.is_ephemeral AND NEW.aca_secured THEN
    RAISE EXCEPTION 'EPHEMERAL_CANNOT_BE_ACA_SECURED';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_employee_platform_role ON public.employees;
CREATE TRIGGER trg_validate_employee_platform_role
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.validate_employee_platform_role();

-- Sequence for ephemeral naming
CREATE SEQUENCE IF NOT EXISTS public.ephemeral_employee_seq START 1;

-- Helper: is the calling user an Org Admin for this business?
CREATE OR REPLACE FUNCTION public.is_org_admin(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE business_id = _business_id
      AND user_id = auth.uid()
      AND platform_role = 'Org Admin'
      AND status = 'active'
  );
$$;

-- RPC: provision via ACA (NFC handshake)
CREATE OR REPLACE FUNCTION public.provision_employee_via_aca(
  _business_id uuid,
  _platform_guid uuid,
  _platform_role text
) RETURNS public.employees LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid;
  v_row public.employees;
BEGIN
  IF NOT public.is_org_admin(_business_id) THEN
    RAISE EXCEPTION 'NOT_ORG_ADMIN';
  END IF;

  SELECT user_id INTO v_user_id FROM public.profiles WHERE platform_guid = _platform_guid LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ACA_NOT_FOUND';
  END IF;

  IF EXISTS (SELECT 1 FROM public.employees WHERE business_id = _business_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'ALREADY_PROVISIONED';
  END IF;

  INSERT INTO public.employees (business_id, user_id, name, role, platform_role, status, is_ephemeral, aca_secured)
  VALUES (_business_id, v_user_id, 'ACA Member', _platform_role, _platform_role, 'active', false, true)
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;

-- RPC: provision ephemeral guest
CREATE OR REPLACE FUNCTION public.provision_ephemeral_employee(_business_id uuid)
RETURNS public.employees LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_n bigint;
  v_row public.employees;
BEGIN
  IF NOT public.is_org_admin(_business_id) THEN
    RAISE EXCEPTION 'NOT_ORG_ADMIN';
  END IF;
  v_n := nextval('public.ephemeral_employee_seq');
  INSERT INTO public.employees (business_id, user_id, name, role, platform_role, status, is_ephemeral, aca_secured)
  VALUES (_business_id, NULL, 'Ephemeral Profile #' || lpad(v_n::text,4,'0'), 'Team Member', 'Team Member', 'active', true, false)
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;

-- RPC: revoke (suspend) employee with last-Org-Admin org-deletion guard
CREATE OR REPLACE FUNCTION public.revoke_employee(_employee_id uuid)
RETURNS public.employees LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target public.employees;
  v_remaining int;
BEGIN
  SELECT * INTO v_target FROM public.employees WHERE id = _employee_id;
  IF v_target IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.is_org_admin(v_target.business_id) THEN
    RAISE EXCEPTION 'NOT_ORG_ADMIN';
  END IF;

  IF v_target.platform_role = 'Org Admin' THEN
    SELECT count(*) INTO v_remaining FROM public.employees
      WHERE business_id = v_target.business_id
        AND platform_role = 'Org Admin'
        AND status = 'active'
        AND id <> v_target.id;
    IF v_remaining = 0 THEN
      RAISE EXCEPTION 'LAST_ORG_ADMIN_DELETE_ORG';
    END IF;
  END IF;

  UPDATE public.employees SET status = 'suspended', updated_at = now()
    WHERE id = _employee_id RETURNING * INTO v_target;
  RETURN v_target;
END $$;

GRANT EXECUTE ON FUNCTION public.provision_employee_via_aca(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_ephemeral_employee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_employee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;