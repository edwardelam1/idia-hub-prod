
CREATE TABLE public.bank_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  bank_name text DEFAULT '',
  account_holder text DEFAULT '',
  routing_number text DEFAULT '',
  account_number text DEFAULT '',
  account_type text DEFAULT 'checking',
  direct_deposit_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.bank_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_bank_settings" ON public.bank_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bank_settings" ON public.bank_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.financial_report_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  period_start date,
  period_end date,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.financial_report_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_financial_uploads" ON public.financial_report_uploads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_financial_uploads" ON public.financial_report_uploads FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('financial-reports', 'financial-reports', true);
CREATE POLICY "anon_all_financial_reports_storage" ON storage.objects FOR ALL TO anon USING (bucket_id = 'financial-reports') WITH CHECK (bucket_id = 'financial-reports');
CREATE POLICY "auth_all_financial_reports_storage" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'financial-reports') WITH CHECK (bucket_id = 'financial-reports');
