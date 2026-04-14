
-- ============================================
-- STEP 1: Drop duplicate triggers
-- ============================================

-- device_events: keep trg_universal_data_processing, drop 2 dupes
DROP TRIGGER IF EXISTS trigger_device_events_processing ON public.device_events;
DROP TRIGGER IF EXISTS trigger_universal_data_processing ON public.device_events;

-- staged_health_data: keep trigger_staged_health_bundles, drop 2 dupes
DROP TRIGGER IF EXISTS immediate_bundle_generation ON public.staged_health_data;
DROP TRIGGER IF EXISTS trg_generate_bundles_health ON public.staged_health_data;

-- staged_lifestyle_data: keep trigger_staged_lifestyle_bundles, drop 1 dupe
DROP TRIGGER IF EXISTS trg_generate_bundles_lifestyle ON public.staged_lifestyle_data;

-- ============================================
-- STEP 2: Create reward calculation function for staged tables
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_and_credit_staged_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  quality NUMERIC;
  reward NUMERIC;
  matched_user_id UUID;
BEGIN
  -- Only process if reward not yet calculated
  IF NEW.reward_calculated = TRUE THEN
    RETURN NEW;
  END IF;

  -- Get quality score
  quality := COALESCE(NEW.data_quality_score, 0.3);

  -- Map quality (0-1) to reward (0.10 - 1.00)
  reward := ROUND((0.10 + (quality * 0.90))::numeric, 2);

  -- Cap at 1.00
  IF reward > 1.00 THEN reward := 1.00; END IF;

  -- Set reward on the record
  NEW.reward_amount := reward;
  NEW.reward_calculated := TRUE;

  -- Look up the real user_id from the pseudo_user_id
  SELECT p.user_id INTO matched_user_id
  FROM public.profiles p
  WHERE generate_pseudonym(p.user_id::text) = NEW.pseudo_user_id
  LIMIT 1;

  -- Credit the synapse ledger if we found a real user
  IF matched_user_id IS NOT NULL THEN
    INSERT INTO public.synapse_credit_ledger (
      user_id,
      amount,
      entry_type,
      status,
      description,
      reference_id
    ) VALUES (
      matched_user_id,
      reward,
      'reward',
      'SETTLED',
      'Data contribution reward (quality: ' || quality || ')',
      'REWARD-' || NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 3: Attach reward triggers to staged tables
-- ============================================
DROP TRIGGER IF EXISTS trigger_staged_health_reward ON public.staged_health_data;
CREATE TRIGGER trigger_staged_health_reward
  BEFORE INSERT ON public.staged_health_data
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_and_credit_staged_reward();

DROP TRIGGER IF EXISTS trigger_staged_lifestyle_reward ON public.staged_lifestyle_data;
CREATE TRIGGER trigger_staged_lifestyle_reward
  BEFORE INSERT ON public.staged_lifestyle_data
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_and_credit_staged_reward();
