GRANT EXECUTE ON FUNCTION public.get_synapse_balance(uuid) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.synapse_credit_ledger TO authenticated;
GRANT ALL ON public.synapse_credit_ledger TO service_role;