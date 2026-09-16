ALTER TABLE public.egress_logs
  ADD COLUMN IF NOT EXISTS nft_token_id text,
  ADD COLUMN IF NOT EXISTS nft_minted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_egress_logs_nft_token_id ON public.egress_logs (nft_token_id);