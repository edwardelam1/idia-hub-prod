
CREATE OR REPLACE FUNCTION public.get_synapse_balance(uid uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.synapse_credit_ledger
  WHERE user_id = uid AND status != 'FAILED';
$$;
