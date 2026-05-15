CREATE OR REPLACE FUNCTION public.get_synapse_balance(uid uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.synapse_credit_ledger
        WHERE user_id = uid
        AND status IN ('settled'::public.idia_transaction_status, 'completed'::public.idia_transaction_status)
    );
END;
$function$;