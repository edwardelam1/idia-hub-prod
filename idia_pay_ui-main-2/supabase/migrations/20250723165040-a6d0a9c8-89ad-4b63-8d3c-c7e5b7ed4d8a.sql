-- Add RLS policies for the newly created tables

-- Enable RLS on new tables
ALTER TABLE public.nfc_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_menu_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for NFC transactions
CREATE POLICY "Business users can view their NFC transactions" 
ON public.nfc_transactions FOR SELECT 
USING (
  transaction_id IN (
    SELECT pt.id FROM public.pos_transactions pt
    JOIN public.business_locations bl ON bl.id = pt.location_id
    WHERE bl.business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))
  )
);

-- Create RLS policies for merchant notifications
CREATE POLICY "Business users can manage their notifications" 
ON public.merchant_notifications FOR ALL 
USING (facility_id IN (
  SELECT bl.id FROM public.business_locations bl
  WHERE bl.business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))
));

-- Create RLS policies for gift card redemptions
CREATE POLICY "Business users can view gift card redemptions" 
ON public.gift_card_redemptions FOR SELECT 
USING (
  gift_card_id IN (
    SELECT gc.id FROM public.gift_cards gc
    WHERE gc.business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))
  )
);

-- Create RLS policies for AR menu items
CREATE POLICY "Business users can manage their AR menu items" 
ON public.ar_menu_items FOR ALL 
USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));

-- Create RLS policies for AR interactions (public insert for customer tracking)
CREATE POLICY "Public can log AR interactions" 
ON public.ar_menu_interactions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Business users can view AR interactions" 
ON public.ar_menu_interactions FOR SELECT 
USING (
  ar_menu_item_id IN (
    SELECT ami.id FROM public.ar_menu_items ami
    WHERE ami.business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid()))
  )
);

-- Create RLS policies for payment methods
CREATE POLICY "Business users can manage their payment methods" 
ON public.payment_methods FOR ALL 
USING (business_id IN (SELECT business_id FROM public.get_user_business_access(auth.uid())));