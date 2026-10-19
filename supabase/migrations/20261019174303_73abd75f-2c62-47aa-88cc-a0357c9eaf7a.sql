CREATE OR REPLACE FUNCTION public.route_raw_to_synapse()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
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
        BEGIN
          PERFORM realtime.send(
            jsonb_build_object('stage', 'apple-health-sync', 'label', 'RAW_SYNC_DUPLICATE_FILTERED', 'at', now()),
            'pulse', 'protocol-stream', true);
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
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

DROP FUNCTION IF EXISTS public.emit_apple_sync_pulse(text);