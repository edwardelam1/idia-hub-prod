CREATE OR REPLACE FUNCTION public.get_hub_balance(uid uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.synapse_credit_ledger
  WHERE user_id = uid
    AND status <> 'failed'
    AND (transaction_type IS NULL
         OR transaction_type::text NOT IN ('data_sale_payout', 'idia_royalty_yield'));
$$;