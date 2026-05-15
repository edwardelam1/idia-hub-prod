
-- Part 1: Create enums
DO $$ BEGIN
  CREATE TYPE public.idia_transaction_type AS ENUM ('data_sale', 'deposit', 'withdrawl', 'fee', 'reward');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.idia_transaction_status AS ENUM ('pending', 'settled', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Part 2: Add new columns to synapse_credit_ledger
ALTER TABLE public.synapse_credit_ledger
  ADD COLUMN IF NOT EXISTS transaction_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS transaction_type public.idia_transaction_type DEFAULT 'deposit',
  ADD COLUMN IF NOT EXISTS amount_idia_usd DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS balance_idia_usd DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS status public.idia_transaction_status DEFAULT 'settled',
  ADD COLUMN IF NOT EXISTS destination_wallet TEXT,
  ADD COLUMN IF NOT EXISTS circle_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS flare_tx_hash TEXT;

-- Part 3: Backfill existing rows
UPDATE public.synapse_credit_ledger
SET
  amount_idia_usd = COALESCE(amount, 0),
  balance_idia_usd = COALESCE(balance_after, 0),
  status = 'settled',
  transaction_id = COALESCE(reference_id, id::text),
  transaction_type = CASE
    WHEN entry_type = 'deposit' THEN 'deposit'::public.idia_transaction_type
    WHEN entry_type = 'deduction' THEN 'fee'::public.idia_transaction_type
    WHEN entry_type = 'reward' THEN 'reward'::public.idia_transaction_type
    ELSE 'deposit'::public.idia_transaction_type
  END
WHERE amount_idia_usd IS NULL;

-- Part 4: Create index for fast balance lookups
CREATE INDEX IF NOT EXISTS idx_synapse_credit_ledger_user_created
  ON public.synapse_credit_ledger (user_id, created_at DESC);

-- Part 5: RLS - ensure enabled and add SELECT policy for users
ALTER TABLE public.synapse_credit_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own ledger entries" ON public.synapse_credit_ledger;
  CREATE POLICY "Users can view own ledger entries"
    ON public.synapse_credit_ledger
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
