GRANT SELECT ON realtime.messages TO authenticated;

DROP POLICY IF EXISTS "authenticated can read protocol-stream pulses" ON realtime.messages;
CREATE POLICY "authenticated can read protocol-stream pulses"
ON realtime.messages
FOR SELECT
TO authenticated
USING (topic = 'protocol-stream' AND extension = 'broadcast');

CREATE OR REPLACE FUNCTION public.broadcast_protocol_pulse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry text;
  v_tx text;
BEGIN
  IF TG_TABLE_NAME IN ('staged_health_data', 'raw_health_data') THEN
    PERFORM realtime.send(
      jsonb_build_object('stage', 'apple-health-sync', 'label', 'INGESTION_STAGED', 'at', now()),
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
$$;