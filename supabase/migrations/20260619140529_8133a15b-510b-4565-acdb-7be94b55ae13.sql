DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'INTERNAL_DEPOSIT'
      AND enumtypid = 'public.idia_transaction_type'::regtype
  ) THEN
    ALTER TYPE public.idia_transaction_type RENAME VALUE 'INTERNAL_DEPOSIT' TO 'internal_deposit';
  END IF;
END$$;

ALTER TYPE public.idia_transaction_type ADD VALUE IF NOT EXISTS 'data_sale_payout';