INSERT INTO public.synapse_credit_ledger (
  user_id, entry_type, transaction_type, amount, amount_usdc,
  funding_source, status, description, transaction_id
) VALUES (
  '217c6224-d839-43b0-98cb-b4d1be267536',
  'deposit',
  'synapse_purchase',
  2.6666666666666665,
  2.00,
  'FIAT_FBO',
  'completed',
  'Wix à la carte purchase ($2.00) — backfilled',
  'f438ad12-23c9-478d-842c-aa321a1d6580'
)
ON CONFLICT (transaction_id) DO NOTHING;