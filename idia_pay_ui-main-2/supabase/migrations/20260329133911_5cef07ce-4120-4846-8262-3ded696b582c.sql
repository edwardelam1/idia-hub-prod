CREATE TABLE public.merchant_payment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  business_name text DEFAULT '',
  active_provider text NOT NULL DEFAULT 'IDIA',
  idia_merchant_id text DEFAULT '',
  idia_terminal_id text DEFAULT '',
  stripe_terminal_id text DEFAULT '',
  square_terminal_id text DEFAULT '',
  external_api_key text DEFAULT '',
  is_default boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.merchant_payment_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_merchant_payment_configs" ON public.merchant_payment_configs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_merchant_payment_configs" ON public.merchant_payment_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);