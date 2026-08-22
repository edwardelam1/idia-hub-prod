CREATE OR REPLACE FUNCTION public.broadcast_protocol_pulse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage text;
  v_label text;
  v_entry text;
  v_tx text;
BEGIN
  IF TG_TABLE_NAME = 'staged_health_data' OR TG_TABLE_NAME = 'raw_health_data' THEN
    v_stage := 'apple-health-sync';
    v_label := 'INGESTION_STAGED';
    PERFORM realtime.send(
      jsonb_build_object('stage', v_stage, 'label', v_label, 'at', now()),
      'pulse', 'protocol-stream', false);

  ELSIF TG_TABLE_NAME = 'synapse_credit_ledger' THEN
    v_entry := lower(coalesce(NEW.entry_type::text, ''));
    v_tx := lower(coalesce(NEW.transaction_type::text, ''));

    IF v_entry = 'usage' OR v_tx = 'fee' OR v_tx = 'hub_protocol_fee' THEN
      PERFORM realtime.send(
        jsonb_build_object('stage', 'synapse-controller', 'label', 'GAS_BURN_EXECUTED', 'at', now()),
        'pulse', 'protocol-stream', false);
    END IF;

    IF v_tx IN ('idia_royalty_yield', 'data_sale_payout') OR v_entry IN ('royalty', 'revenue') THEN
      PERFORM realtime.send(
        jsonb_build_object('stage', 'royalty-distribution', 'label', 'ROYALTY_DISTRIBUTED', 'at', now()),
        'pulse', 'protocol-stream', false);
    END IF;

  ELSIF TG_TABLE_NAME = 'egress_logs' THEN
    PERFORM realtime.send(
      jsonb_build_object('stage', 'best-friend-ai', 'label', 'AI_OMNI_FETCH_COMPLETE', 'at', now()),
      'pulse', 'protocol-stream', false);

    IF NEW.liability_token_hash IS NOT NULL
       OR upper(coalesce(NEW.egress_type::text, '')) IN ('PURCHASE', 'DATA_SALE') THEN
      PERFORM realtime.send(
        jsonb_build_object('stage', 'process-data-sale', 'label', 'LIABILITY_SHIELD_MINTED', 'at', now()),
        'pulse', 'protocol-stream', false);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protocol_pulse_staged_health ON public.staged_health_data;
CREATE TRIGGER trg_protocol_pulse_staged_health
AFTER INSERT ON public.staged_health_data
FOR EACH ROW EXECUTE FUNCTION public.broadcast_protocol_pulse();

DROP TRIGGER IF EXISTS trg_protocol_pulse_raw_health ON public.raw_health_data;
CREATE TRIGGER trg_protocol_pulse_raw_health
AFTER INSERT ON public.raw_health_data
FOR EACH ROW EXECUTE FUNCTION public.broadcast_protocol_pulse();

DROP TRIGGER IF EXISTS trg_protocol_pulse_ledger ON public.synapse_credit_ledger;
CREATE TRIGGER trg_protocol_pulse_ledger
AFTER INSERT ON public.synapse_credit_ledger
FOR EACH ROW EXECUTE FUNCTION public.broadcast_protocol_pulse();

DROP TRIGGER IF EXISTS trg_protocol_pulse_egress ON public.egress_logs;
CREATE TRIGGER trg_protocol_pulse_egress
AFTER INSERT ON public.egress_logs
FOR EACH ROW EXECUTE FUNCTION public.broadcast_protocol_pulse();