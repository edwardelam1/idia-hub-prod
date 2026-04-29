-- Add USDC sync tracking to wallets
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS usdc_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS usdc_last_block bigint;

-- On-chain USDC transfer event log (idempotent + audit)
CREATE TABLE IF NOT EXISTS public.usdc_onchain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash text NOT NULL,
  log_index integer NOT NULL,
  from_address text NOT NULL,
  to_address text NOT NULL,
  amount_micro bigint NOT NULL,
  block_number bigint,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  wallet_user_id uuid,
  source text NOT NULL DEFAULT 'alchemy_webhook',
  raw_payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usdc_onchain_events_unique UNIQUE (tx_hash, log_index, direction)
);

CREATE INDEX IF NOT EXISTS usdc_onchain_events_user_idx ON public.usdc_onchain_events(wallet_user_id);
CREATE INDEX IF NOT EXISTS usdc_onchain_events_block_idx ON public.usdc_onchain_events(block_number DESC);

ALTER TABLE public.usdc_onchain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own USDC events"
  ON public.usdc_onchain_events
  FOR SELECT
  USING (auth.uid() = wallet_user_id);

-- Atomic delta application — service role only via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.apply_usdc_delta(
  p_user_id uuid,
  p_micro_delta bigint,
  p_block_number bigint DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance bigint;
BEGIN
  UPDATE public.wallets
  SET idia_beta_balance = COALESCE(idia_beta_balance, 0) + p_micro_delta,
      usdc_last_synced_at = now(),
      usdc_last_block = GREATEST(COALESCE(usdc_last_block, 0), COALESCE(p_block_number, 0)),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING idia_beta_balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

-- Absolute set (used by reconciler when on-chain truth differs)
CREATE OR REPLACE FUNCTION public.set_usdc_balance(
  p_user_id uuid,
  p_micro_balance bigint,
  p_block_number bigint DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets
  SET idia_beta_balance = p_micro_balance,
      usdc_last_synced_at = now(),
      usdc_last_block = GREATEST(COALESCE(usdc_last_block, 0), COALESCE(p_block_number, 0)),
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN p_micro_balance;
END;
$$;