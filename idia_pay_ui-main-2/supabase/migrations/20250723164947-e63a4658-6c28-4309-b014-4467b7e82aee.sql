-- IDIA Pay Phase 2 & 3: POS & Commerce Enhancements (Fixed)
-- Requirements 5.0: NFC payments, gift cards, live dashboard, Angelic XR

-- Enhanced POS transactions table for IDIA-USD support
ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS customer_id UUID,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_processor TEXT,
ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
ADD COLUMN IF NOT EXISTS idia_usd_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS receipt_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nfc_payload JSONB,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Create NFC transactions table for IDIA-USD payments
CREATE TABLE IF NOT EXISTS public.nfc_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  customer_wallet_address TEXT NOT NULL,
  idia_amount NUMERIC NOT NULL,
  usd_equivalent NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  signature_payload TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  blockchain_hash TEXT,
  confirmation_block INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Create merchant notifications table for live self-checkout dashboard
CREATE TABLE IF NOT EXISTS public.merchant_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  order_id UUID, -- Can reference external order systems
  notification_type TEXT NOT NULL CHECK (notification_type IN ('order_received', 'payment_pending', 'order_ready', 'assistance_needed', 'error')),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved')),
  title TEXT NOT NULL,
  message TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  auto_resolve_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced gift cards table with QR code support
ALTER TABLE public.gift_cards
ADD COLUMN IF NOT EXISTS activation_code TEXT,
ADD COLUMN IF NOT EXISTS pin_code TEXT,
ADD COLUMN IF NOT EXISTS purchaser_email TEXT,
ADD COLUMN IF NOT EXISTS recipient_email TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS redemption_locations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;

-- Create gift card redemptions table
CREATE TABLE IF NOT EXISTS public.gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.pos_transactions(id),
  amount_redeemed NUMERIC NOT NULL,
  remaining_balance NUMERIC NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  redeemed_by UUID,
  location_id UUID REFERENCES public.business_locations(id),
  CONSTRAINT positive_redemption_amount CHECK (amount_redeemed > 0)
);

-- Create AR menu experiences table for Angelic XR integration
CREATE TABLE IF NOT EXISTS public.ar_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL, -- References menu_items table
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  ar_model_url TEXT,
  ar_model_type TEXT DEFAULT '3d_glb' CHECK (ar_model_type IN ('3d_glb', '3d_usdz', 'video_360', 'image_ar')),
  experience_type TEXT DEFAULT 'menu_visualization' CHECK (experience_type IN ('menu_visualization', 'nutritional_info', 'cooking_process', 'interactive_demo')),
  interaction_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  average_view_time_seconds INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create AR interaction tracking table
CREATE TABLE IF NOT EXISTS public.ar_menu_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_menu_item_id UUID NOT NULL REFERENCES public.ar_menu_items(id) ON DELETE CASCADE,
  session_id TEXT,
  customer_id UUID,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'rotate', 'zoom', 'info_request', 'add_to_cart')),
  duration_seconds INTEGER,
  resulted_in_purchase BOOLEAN DEFAULT false,
  device_info JSONB DEFAULT '{}'::jsonb,
  location_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payment methods configuration table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  method_name TEXT NOT NULL,
  processor TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  accepts_idia_usd BOOLEAN DEFAULT false,
  processing_fee_percentage NUMERIC DEFAULT 0,
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, method_name)
);

-- Insert default payment methods (fixed to not use ON CONFLICT without proper constraint)
INSERT INTO public.payment_methods (business_id, method_name, processor, accepts_idia_usd, processing_fee_percentage) 
SELECT '550e8400-e29b-41d4-a716-446655440001', 'Cash', 'manual', false, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods 
  WHERE business_id = '550e8400-e29b-41d4-a716-446655440001' AND method_name = 'Cash'
);

INSERT INTO public.payment_methods (business_id, method_name, processor, accepts_idia_usd, processing_fee_percentage) 
SELECT '550e8400-e29b-41d4-a716-446655440001', 'Credit Card', 'stripe', false, 2.9
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods 
  WHERE business_id = '550e8400-e29b-41d4-a716-446655440001' AND method_name = 'Credit Card'
);

INSERT INTO public.payment_methods (business_id, method_name, processor, accepts_idia_usd, processing_fee_percentage) 
SELECT '550e8400-e29b-41d4-a716-446655440001', 'IDIA-USD (NFC)', 'idia_blockchain', true, 0.1
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods 
  WHERE business_id = '550e8400-e29b-41d4-a716-446655440001' AND method_name = 'IDIA-USD (NFC)'
);

INSERT INTO public.payment_methods (business_id, method_name, processor, accepts_idia_usd, processing_fee_percentage) 
SELECT '550e8400-e29b-41d4-a716-446655440001', 'Gift Card', 'internal', false, 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods 
  WHERE business_id = '550e8400-e29b-41d4-a716-446655440001' AND method_name = 'Gift Card'
);

-- Create function to validate NFC signature
CREATE OR REPLACE FUNCTION public.validate_nfc_signature(
  p_transaction_data JSONB,
  p_signature TEXT,
  p_wallet_address TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Placeholder for actual cryptographic signature validation
  -- In production, this would verify the digital signature against the customer's public key
  -- For demo purposes, we'll return true for valid-looking inputs
  RETURN (
    p_signature IS NOT NULL 
    AND length(p_signature) >= 64
    AND p_wallet_address IS NOT NULL
    AND length(p_wallet_address) >= 40
  );
END;
$$;