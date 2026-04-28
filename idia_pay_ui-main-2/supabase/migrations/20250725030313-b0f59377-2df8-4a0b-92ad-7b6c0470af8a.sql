-- CRITICAL FIX: Ensure ALL IDIA Pay data flows through Synapse
-- 1. Add missing triggers for POS transactions
CREATE OR REPLACE FUNCTION process_idia_pay_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert IDIA Pay transaction data into raw_health_data for Synapse processing
  INSERT INTO public.raw_health_data (
    user_id,
    device_type,
    activity_type,
    raw_payload,
    processing_status,
    created_at
  ) VALUES (
    NEW.customer_id,
    'idia_pay_pos',
    'payment_transaction',
    jsonb_build_object(
      'transaction_id', NEW.id,
      'transaction_number', NEW.transaction_number,
      'amount', NEW.total_amount,
      'idia_usd_amount', NEW.idia_usd_amount,
      'payment_method', NEW.payment_method,
      'location_id', NEW.location_id,
      'ar_experience_id', NEW.ar_experience_id,
      'initiated_via_ar', NEW.initiated_via_ar,
      'transaction_items', NEW.transaction_items,
      'loyalty_points_earned', NEW.loyalty_points_earned,
      'nfc_payload', NEW.nfc_payload
    ),
    'pending',
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$;

-- 2. Add missing triggers for NFC transactions  
CREATE OR REPLACE FUNCTION process_nfc_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert NFC transaction data into raw_health_data for Synapse processing
  INSERT INTO public.raw_health_data (
    user_id,
    device_type,
    activity_type,
    raw_payload,
    processing_status,
    created_at
  ) VALUES (
    NEW.customer_wallet_address::uuid, -- Convert wallet to user reference
    'idia_pay_nfc',
    'nfc_payment',
    jsonb_build_object(
      'transaction_id', NEW.transaction_id,
      'wallet_address', NEW.customer_wallet_address,
      'idia_amount', NEW.idia_amount,
      'usd_equivalent', NEW.usd_equivalent,
      'exchange_rate', NEW.exchange_rate,
      'verification_status', NEW.verification_status,
      'blockchain_hash', NEW.blockchain_hash,
      'signature_payload', NEW.signature_payload
    ),
    'pending',
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$;

-- 3. Add trigger for IDIA payments
CREATE OR REPLACE FUNCTION process_idia_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert IDIA payment data into raw_health_data for Synapse processing
  INSERT INTO public.raw_health_data (
    user_id,
    device_type,
    activity_type,
    raw_payload,
    processing_status,
    created_at
  ) VALUES (
    NEW.wallet_address::uuid, -- Convert wallet to user reference
    'idia_payment',
    'blockchain_payment',
    jsonb_build_object(
      'transaction_id', NEW.transaction_id,
      'wallet_address', NEW.wallet_address,
      'amount_idia_usd', NEW.amount_idia_usd,
      'exchange_rate_usd', NEW.exchange_rate_usd,
      'blockchain_hash', NEW.blockchain_hash,
      'confirmation_status', NEW.confirmation_status,
      'network_fee', NEW.network_fee
    ),
    'pending',
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$;

-- 4. Create triggers to enforce Synapse flow
DROP TRIGGER IF EXISTS idia_pay_pos_synapse_trigger ON pos_transactions;
CREATE TRIGGER idia_pay_pos_synapse_trigger
  AFTER INSERT ON pos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_idia_pay_transaction();

DROP TRIGGER IF EXISTS idia_pay_nfc_synapse_trigger ON nfc_transactions;
CREATE TRIGGER idia_pay_nfc_synapse_trigger
  AFTER INSERT ON nfc_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_nfc_transaction();

DROP TRIGGER IF EXISTS idia_payment_synapse_trigger ON idia_payments;
CREATE TRIGGER idia_payment_synapse_trigger
  AFTER INSERT ON idia_payments
  FOR EACH ROW
  EXECUTE FUNCTION process_idia_payment();

-- 5. Fix the stuck raw_health_data processing
UPDATE raw_health_data 
SET processing_status = 'pending',
    processing_started_at = NULL,
    retry_count = 0
WHERE processing_status = 'pending' 
  AND processing_started_at IS NULL;