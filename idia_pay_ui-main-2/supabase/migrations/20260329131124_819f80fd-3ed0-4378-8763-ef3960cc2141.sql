
-- Add multi-account and plaid-ready fields to bank_settings
ALTER TABLE public.bank_settings
  ADD COLUMN IF NOT EXISTS label text DEFAULT 'Primary',
  ADD COLUMN IF NOT EXISTS deposit_split_pct numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS plaid_account_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS plaid_institution_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS plaid_access_token text DEFAULT '',
  ADD COLUMN IF NOT EXISTS plaid_item_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'manual';

-- Bank settings history / audit log
CREATE TABLE public.bank_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  bank_setting_id uuid,
  action text NOT NULL DEFAULT 'created',
  field_changed text,
  old_value text,
  new_value text,
  performed_by text DEFAULT 'System',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.bank_settings_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_bank_history" ON public.bank_settings_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bank_history" ON public.bank_settings_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
