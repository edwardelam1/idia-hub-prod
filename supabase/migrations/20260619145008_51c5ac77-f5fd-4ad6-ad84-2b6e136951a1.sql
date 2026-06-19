-- 1. SECURITY DEFINER helper to break recursion
CREATE OR REPLACE FUNCTION public.is_business_leadership(_business_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = _business_id
      AND user_id = auth.uid()
      AND role = 'leadership'::user_role
      AND is_active = true
  );
$$;

-- 2. Replace recursive policy
DROP POLICY IF EXISTS "Users can access their business user records" ON public.business_users;

CREATE POLICY "Users see their own membership"
  ON public.business_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Leadership sees co-members in their businesses"
  ON public.business_users FOR SELECT TO authenticated
  USING (
    business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))
    AND public.is_business_leadership(business_id)
  );

-- 3. Fix uppercase enum literal in on_fiat_deposit_confirmed
CREATE OR REPLACE FUNCTION public.on_fiat_deposit_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.transaction_type = 'data_sale_payout'::public.idia_transaction_type THEN
    IF NEW.reference_id IS NULL THEN
        RAISE EXCEPTION 'Protocol Violation: Royalty distributions require a valid ACA Reference ID.';
    END IF;

    INSERT INTO public.delt_transfers (
      id, action_type, aca_hash, amount, details
    ) VALUES (
      gen_random_uuid(),
      'ROYALTY_DISTRIBUTION',
      'IDIA_PERF_' || NEW.reference_id,
      NEW.amount,
      jsonb_build_object(
        'MsgId', NEW.reference_id,
        'CreDtTm', now(),
        'InstdAmt', NEW.amount,
        'Ccy', 'USD',
        'ObligationSatisfied', true,
        'RightsType', 'Personal_Data_IP'
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;