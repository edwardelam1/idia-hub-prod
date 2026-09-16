ALTER TABLE public.egress_logs ADD COLUMN IF NOT EXISTS nft_mint_tx_hash text;
CREATE INDEX IF NOT EXISTS idx_egress_logs_nft_token_id ON public.egress_logs (nft_token_id);