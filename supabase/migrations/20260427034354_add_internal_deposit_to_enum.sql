-- Expanding idia_transaction_type to support custodial routing logic
-- [DB_MIGRATION][START]: add_internal_deposit_to_enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'INTERNAL_DEPOSIT' 
        AND enumtypid = 'public.idia_transaction_type'::regtype
    ) THEN
        ALTER TYPE public.idia_transaction_type ADD VALUE 'INTERNAL_DEPOSIT';
    END IF;
END
$$;
-- [DB_MIGRATION][END]: add_internal_deposit_to_enum