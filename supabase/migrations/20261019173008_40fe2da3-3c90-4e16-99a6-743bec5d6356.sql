-- Apple Health Sync pulse is driven only by the raw tier.
DROP TRIGGER IF EXISTS trg_protocol_pulse_staged_health ON public.staged_health_data;

CREATE OR REPLACE FUNCTION public.emit_apple_sync_pulse(_label text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('stage', 'apple-health-sync', 'label', left(coalesce(_label, 'RAW_INGEST'), 64), 'at', now()),
    'pulse', 'protocol-stream', true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.emit_apple_sync_pulse(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emit_apple_sync_pulse(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.broadcast_protocol_pulse()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entry text;
  v_tx text;
BEGIN
  IF TG_TABLE_NAME = 'raw_health_data' THEN
    PERFORM realtime.send(
      jsonb_build_object('stage', 'apple-health-sync', 'label', 'RAW_HEALTH_RECORD_RECEIVED', 'at', now()),
      'pulse', 'protocol-stream', true);

  ELSIF TG_TABLE_NAME = 'synapse_credit_ledger' THEN
    v_entry := lower(coalesce(NEW.entry_type::text, ''));
    v_tx := lower(coalesce(NEW.transaction_type::text, ''));

    IF v_entry = 'usage' OR v_tx IN ('fee', 'hub_protocol_fee') THEN
      PERFORM realtime.send(
        jsonb_build_object('stage', 'synapse-controller', 'label', 'GAS_BURN_EXECUTED', 'at', now()),
        'pulse', 'protocol-stream', true);
    END IF;

    IF v_tx IN ('idia_royalty_yield', 'data_sale_payout') OR v_entry IN ('royalty', 'revenue') THEN
      PERFORM realtime.send(
        jsonb_build_object('stage', 'royalty-distribution', 'label', 'ROYALTY_DISTRIBUTED', 'at', now()),
        'pulse', 'protocol-stream', true);
    END IF;

  ELSIF TG_TABLE_NAME = 'egress_logs' THEN
    PERFORM realtime.send(
      jsonb_build_object('stage', 'best-friend-ai', 'label', 'AI_OMNI_FETCH_COMPLETE', 'at', now()),
      'pulse', 'protocol-stream', true);

    IF NEW.liability_token_hash IS NOT NULL
       OR upper(coalesce(NEW.egress_type::text, '')) IN ('PURCHASE', 'DATA_SALE') THEN
      PERFORM realtime.send(
        jsonb_build_object('stage', 'process-data-sale', 'label', 'LIABILITY_SHIELD_MINTED', 'at', now()),
        'pulse', 'protocol-stream', true);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

-- Raw records that are filtered as duplicates (e.g. a full re-send after
-- reconnecting Apple Health) never get inserted, so the AFTER INSERT pulse
-- never fires. Pulse from the raw-tier BEFORE INSERT path too.
CREATE OR REPLACE FUNCTION public.route_raw_to_synapse()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    is_duplicate BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.staged_health_data 
        WHERE user_id = NEW.user_id 
          AND aca_hash_key = NEW.aca_hash_key
          AND payload = NEW.raw_payload
    ) INTO is_duplicate;

    IF is_duplicate THEN
        RAISE LOG '🛡️ [DELT_DEDUPE]: Duplicate filtered for User % | Buffer Cleared.', NEW.user_id;
        PERFORM public.emit_apple_sync_pulse('RAW_SYNC_DUPLICATE_FILTERED');
        RETURN NULL; 
    END IF;

    INSERT INTO public.synapse_controller (
        user_id, raw_data, status, aca_hash_key
    ) VALUES (
        NEW.user_id, NEW.raw_payload, 'pending_catalog', NEW.aca_hash_key
    );

    NEW.processing_status := 'completed'; 
    NEW.processed := true;
    NEW.last_error := 'ROUTED: Handed off to Synapse';
    
    RETURN NEW;
END;
$function$;