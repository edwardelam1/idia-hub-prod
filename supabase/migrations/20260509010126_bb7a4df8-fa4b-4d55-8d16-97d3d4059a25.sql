ALTER TABLE public.account_conversion_requests
  ADD COLUMN IF NOT EXISTS denial_cause text,
  ADD COLUMN IF NOT EXISTS denial_remediation text,
  ADD COLUMN IF NOT EXISTS denied_at timestamptz,
  ADD COLUMN IF NOT EXISTS denied_by uuid;