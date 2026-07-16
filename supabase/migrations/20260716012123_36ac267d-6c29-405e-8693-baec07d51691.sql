
ALTER TABLE public.device_provisioning_blueprints
  ADD COLUMN IF NOT EXISTS assigned_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_dpb_assigned_employee
  ON public.device_provisioning_blueprints(assigned_employee_id);

CREATE OR REPLACE FUNCTION public.assign_provisioning_code(_employee_id uuid, _code text)
RETURNS public.device_provisioning_blueprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_business uuid;
  updated public.device_provisioning_blueprints;
BEGIN
  SELECT business_id INTO emp_business FROM public.employees WHERE id = _employee_id;
  IF emp_business IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  UPDATE public.device_provisioning_blueprints
     SET assigned_employee_id = _employee_id,
         assigned_at = now(),
         updated_at = now()
   WHERE code = _code
     AND business_id = emp_business
     AND status = 'active'
     AND assigned_employee_id IS NULL
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Provisioning code % is not active, not in this business, or already assigned', _code;
  END IF;

  RETURN updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.unassign_provisioning_code(_code text)
RETURNS public.device_provisioning_blueprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.device_provisioning_blueprints;
BEGIN
  UPDATE public.device_provisioning_blueprints
     SET assigned_employee_id = NULL,
         assigned_at = NULL,
         updated_at = now()
   WHERE code = _code
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'Provisioning code % not found', _code;
  END IF;

  RETURN updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_provisioning_code(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.unassign_provisioning_code(text) TO authenticated, anon;
