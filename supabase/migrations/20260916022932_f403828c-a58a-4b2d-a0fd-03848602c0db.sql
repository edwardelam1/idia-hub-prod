UPDATE public.synapse_credit_ledger
SET reference_id = substring(description from 'for Ref:\s*([A-Za-z0-9_\-]+)')
WHERE reference_id IS NULL
  AND description ~ 'for Ref:\s*[A-Za-z0-9_\-]+'
  AND transaction_type IN ('data_sale_payout', 'idia_royalty_yield', 'hub_protocol_fee', 'ecosystem_war_chest');

CREATE INDEX IF NOT EXISTS idx_synapse_credit_ledger_reference_id
  ON public.synapse_credit_ledger (reference_id);