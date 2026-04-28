
CREATE TABLE public.pos_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  location_id UUID,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'completed',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  customer_name TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_pos_transactions" ON public.pos_transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_pos_transactions" ON public.pos_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
