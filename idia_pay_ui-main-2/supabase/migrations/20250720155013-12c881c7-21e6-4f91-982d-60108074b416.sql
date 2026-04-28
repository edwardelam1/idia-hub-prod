-- IDIA Pay Complete Database Schema Migration
-- This migration creates all necessary tables and structures for the IDIA Pay application

-- =============================================
-- ENHANCED BUSINESS STRUCTURE
-- =============================================

-- Add missing columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS data_coop_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS franchise_parent_id UUID REFERENCES businesses(id),
ADD COLUMN IF NOT EXISTS business_health_score NUMERIC(3,2) DEFAULT 0.75;

-- Add missing columns to business_locations
ALTER TABLE business_locations 
ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS pos_terminal_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ DEFAULT now();

-- =============================================
-- ENHANCED USER ROLES & PERMISSIONS
-- =============================================

-- Ensure user_role enum exists with all values
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'manager', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to business_users
ALTER TABLE business_users 
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true}';

-- =============================================
-- ENHANCED MENU MANAGEMENT
-- =============================================

-- Add missing columns to menu_items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS recipe_ingredients JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS allergen_info JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS calories INTEGER,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS seasonal BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS promotion_eligible BOOLEAN DEFAULT true;

-- Create location menu pricing overrides table
CREATE TABLE IF NOT EXISTS location_menu_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES business_locations(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    override_price NUMERIC(10,2) NOT NULL,
    effective_from TIMESTAMPTZ DEFAULT now(),
    effective_until TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(location_id, menu_item_id, effective_from)
);

-- =============================================
-- ENHANCED INVENTORY MANAGEMENT
-- =============================================

-- Add missing columns to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS vendor_sku TEXT,
ADD COLUMN IF NOT EXISTS storage_requirements TEXT,
ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS minimum_order_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 3;

-- Add missing columns to location_inventory
ALTER TABLE location_inventory 
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock_level INTEGER,
ADD COLUMN IF NOT EXISTS expiration_date DATE,
ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS lot_number TEXT;

-- Create inventory movements tracking
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES business_locations(id),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('receive', 'issue', 'transfer', 'adjustment', 'waste')),
    quantity NUMERIC(10,2) NOT NULL,
    unit_cost NUMERIC(10,2),
    reference_id UUID, -- PO, transfer, or transaction ID
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ENHANCED POS & TRANSACTIONS
-- =============================================

-- Add missing columns to pos_transactions
ALTER TABLE pos_transactions 
ADD COLUMN IF NOT EXISTS customer_id UUID,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_processor TEXT,
ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
ADD COLUMN IF NOT EXISTS idia_usd_amount NUMERIC(18,8),
ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS receipt_sent BOOLEAN DEFAULT false;

-- Create payment methods tracking
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    method_name TEXT NOT NULL,
    processor TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    accepts_idia_usd BOOLEAN DEFAULT false,
    processing_fee_percentage NUMERIC(5,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- GIFT CARDS ENHANCEMENT
-- =============================================

-- Add missing columns to gift_cards
ALTER TABLE gift_cards 
ADD COLUMN IF NOT EXISTS qr_code_data TEXT,
ADD COLUMN IF NOT EXISTS purchase_transaction_id UUID,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Create gift card transactions
CREATE TABLE IF NOT EXISTS gift_card_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_card_id UUID NOT NULL REFERENCES gift_cards(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'redeem', 'reload', 'refund')),
    amount NUMERIC(10,2) NOT NULL,
    pos_transaction_id UUID REFERENCES pos_transactions(id),
    location_id UUID REFERENCES business_locations(id),
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ENHANCED EMPLOYEE MANAGEMENT
-- =============================================

-- Add missing columns to employee_timesheets
ALTER TABLE employee_timesheets 
ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS clock_in_method TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS clock_out_method TEXT DEFAULT 'manual';

-- Create employee schedules
CREATE TABLE IF NOT EXISTS employee_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES business_users(id),
    location_id UUID NOT NULL REFERENCES business_locations(id),
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ NOT NULL,
    role_assignment TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FINANCIAL MANAGEMENT ENHANCEMENT
-- =============================================

-- Add missing columns to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- Create invoice line items
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id),
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    line_total NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to suppliers
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT DEFAULT 'check',
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5);

-- =============================================
-- ADVANCED ANALYTICS & REPORTING
-- =============================================

-- Create sales analytics table
CREATE TABLE IF NOT EXISTS sales_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    location_id UUID REFERENCES business_locations(id),
    report_date DATE NOT NULL,
    total_sales NUMERIC(12,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    average_ticket NUMERIC(10,2) DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    labor_cost NUMERIC(10,2) DEFAULT 0,
    cost_of_goods NUMERIC(10,2) DEFAULT 0,
    gross_profit NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id, location_id, report_date)
);

-- Create customer analytics
CREATE TABLE IF NOT EXISTS customer_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    customer_segment TEXT NOT NULL,
    visit_frequency NUMERIC(5,2),
    average_spend NUMERIC(10,2),
    lifetime_value NUMERIC(12,2),
    last_visit_days INTEGER,
    total_visits INTEGER,
    analysis_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- DATA CO-OP & MONETIZATION
-- =============================================

-- Create data sharing preferences
CREATE TABLE IF NOT EXISTS data_sharing_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    sharing_enabled BOOLEAN DEFAULT false,
    anonymization_level TEXT DEFAULT 'high' CHECK (anonymization_level IN ('low', 'medium', 'high')),
    compensation_rate NUMERIC(8,4) DEFAULT 0.0001,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id, category)
);

-- Create data monetization tracking
CREATE TABLE IF NOT EXISTS data_monetization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    data_category TEXT NOT NULL,
    usage_period DATE NOT NULL,
    data_points_shared BIGINT DEFAULT 0,
    revenue_earned NUMERIC(10,6) DEFAULT 0,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'processing')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- IDIA-USD & CRYPTO INTEGRATION
-- =============================================

-- Create IDIA payment tracking
CREATE TABLE IF NOT EXISTS idia_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES pos_transactions(id),
    wallet_address TEXT NOT NULL,
    amount_idia_usd NUMERIC(18,8) NOT NULL,
    exchange_rate_usd NUMERIC(10,6) NOT NULL,
    blockchain_hash TEXT,
    confirmation_status TEXT DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'failed')),
    network_fee NUMERIC(18,8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create wallet management for businesses
CREATE TABLE IF NOT EXISTS business_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL UNIQUE,
    wallet_type TEXT DEFAULT 'idia_usd' CHECK (wallet_type IN ('idia_usd', 'ethereum', 'bitcoin')),
    balance NUMERIC(18,8) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- AR/XR INTEGRATION (Angelic XR)
-- =============================================

-- Create AR menu experiences
CREATE TABLE IF NOT EXISTS ar_menu_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    ar_model_url TEXT,
    experience_type TEXT DEFAULT '3d_model' CHECK (experience_type IN ('3d_model', 'animation', 'interactive')),
    interaction_count INTEGER DEFAULT 0,
    conversion_rate NUMERIC(5,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create AR interaction tracking
CREATE TABLE IF NOT EXISTS ar_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ar_experience_id UUID NOT NULL REFERENCES ar_menu_experiences(id),
    customer_session_id TEXT,
    interaction_type TEXT NOT NULL,
    duration_seconds INTEGER,
    resulted_in_purchase BOOLEAN DEFAULT false,
    location_id UUID REFERENCES business_locations(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FRANCHISE MANAGEMENT
-- =============================================

-- Create franchise agreements
CREATE TABLE IF NOT EXISTS franchise_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchisee_business_id UUID NOT NULL REFERENCES businesses(id),
    franchisor_business_id UUID NOT NULL REFERENCES businesses(id),
    agreement_start_date DATE NOT NULL,
    agreement_end_date DATE,
    royalty_percentage NUMERIC(5,4) NOT NULL,
    marketing_fee_percentage NUMERIC(5,4) DEFAULT 0,
    territory_description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create royalty payments
CREATE TABLE IF NOT EXISTS royalty_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_agreement_id UUID NOT NULL REFERENCES franchise_agreements(id),
    payment_period_start DATE NOT NULL,
    payment_period_end DATE NOT NULL,
    gross_sales NUMERIC(12,2) NOT NULL,
    royalty_amount NUMERIC(12,2) NOT NULL,
    marketing_fee NUMERIC(12,2) DEFAULT 0,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
    due_date DATE NOT NULL,
    paid_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MARKETING & PROMOTIONS
-- =============================================

-- Create promotional campaigns
CREATE TABLE IF NOT EXISTS promotional_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    campaign_name TEXT NOT NULL,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('bogo', 'percentage_off', 'fixed_amount', 'combo_deal')),
    discount_value NUMERIC(10,2),
    minimum_purchase NUMERIC(10,2) DEFAULT 0,
    applicable_items JSONB DEFAULT '[]',
    target_locations UUID[] DEFAULT '{}',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    max_uses_per_customer INTEGER,
    total_budget NUMERIC(12,2),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create campaign performance tracking
CREATE TABLE IF NOT EXISTS campaign_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES promotional_campaigns(id),
    location_id UUID REFERENCES business_locations(id),
    usage_count INTEGER DEFAULT 0,
    total_discount_given NUMERIC(12,2) DEFAULT 0,
    revenue_generated NUMERIC(12,2) DEFAULT 0,
    new_customers_acquired INTEGER DEFAULT 0,
    report_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(campaign_id, location_id, report_date)
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE location_menu_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sharing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_monetization ENABLE ROW LEVEL SECURITY;
ALTER TABLE idia_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_menu_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_performance ENABLE ROW LEVEL SECURITY;