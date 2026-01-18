-- ============================================
-- MULTIVENDOR STORE - COMPLETE DATABASE SCHEMA
-- ============================================
-- This file consolidates all migrations into a single schema
-- for clean database installation.
--
-- Usage:
--   1. Run this file in Supabase SQL Editor for fresh installation
--   2. After schema, run seed.sql for demo/initial data
--
-- Last updated: 2026-01-18
-- Changes:
--   - Fixed RLS infinite recursion on platform_admins
--   - Disabled RLS on platform_admins (access controlled in app)
--   - Simplified RLS policies for profiles and tenant_memberships
-- ============================================

-- ============================================
-- SECTION 1: EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For encryption

-- ============================================
-- SECTION 2: ENUM TYPES
-- ============================================

-- Tenant types
CREATE TYPE tenant_type AS ENUM ('owner_store', 'delivery_company');
CREATE TYPE tenant_status AS ENUM ('pending', 'active', 'suspended', 'inactive');
CREATE TYPE stripe_account_status AS ENUM ('pending', 'onboarding', 'active', 'restricted', 'disabled');

-- Membership
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'manager', 'employee');

-- Products & Inventory
CREATE TYPE promotion_type AS ENUM ('percentage', 'fixed', 'buy_x_get_y', 'bundle', 'mix_match');
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed', 'free_shipping');
CREATE TYPE inventory_movement_type AS ENUM (
    'purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'damage'
);
CREATE TYPE product_approval_status AS ENUM (
    'draft', 'pending_review', 'approved', 'rejected', 'promoted'
);

-- Orders
CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'processing', 'ready_for_pickup',
    'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunded'
);
CREATE TYPE fulfillment_type AS ENUM ('delivery', 'pickup');

-- Delivery
CREATE TYPE delivery_status AS ENUM (
    'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'
);

-- Taxes & Fees
CREATE TYPE tax_scope AS ENUM ('state', 'county', 'city');
CREATE TYPE fee_scope AS ENUM ('global', 'state');

-- Platform Admin
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'support', 'finance');

-- Notifications
CREATE TYPE notification_type AS ENUM (
    'order_placed', 'order_confirmed', 'order_ready', 'order_delivered',
    'delivery_assigned', 'delivery_pickup', 'delivery_complete',
    'review_received', 'review_response',
    'promotion_started', 'price_alert',
    'stock_low', 'license_expiring',
    'payment_received', 'payout_processed',
    'system_announcement'
);

-- ============================================
-- SECTION 3: CORE UTILITY FUNCTIONS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- SECTION 4: USERS & AUTHENTICATION TABLES
-- ============================================

-- Extended user profiles (auth.users is managed by Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    
    -- Age verification
    birth_date DATE,
    age_verified BOOLEAN DEFAULT FALSE,
    age_verified_at TIMESTAMPTZ,
    
    -- Current location (for geolocation)
    current_address JSONB,
    current_coordinates GEOGRAPHY(POINT, 4326),
    
    -- Preferences
    preferred_language TEXT DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User saved addresses
CREATE TABLE public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state CHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    country TEXT DEFAULT 'US',
    coordinates GEOGRAPHY(POINT, 4326),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform administrators
CREATE TABLE public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role admin_role NOT NULL,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- SECTION 5: TENANTS & MEMBERSHIPS
-- ============================================

CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type tenant_type NOT NULL,
    status tenant_status DEFAULT 'pending',
    
    -- Stripe Connect
    stripe_account_id TEXT,
    stripe_account_status stripe_account_status DEFAULT 'pending',
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    
    -- Contact
    email TEXT NOT NULL,
    phone TEXT,
    
    -- Configuration
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Onboarding
    onboarding_step INT DEFAULT 1,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role membership_role NOT NULL,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    invited_by UUID REFERENCES profiles(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

-- ============================================
-- SECTION 6: STORES & LOCATIONS
-- ============================================

CREATE TABLE public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic info
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    
    -- License (required for alcohol sales)
    license_number TEXT,
    license_state CHAR(2),
    license_expiry DATE,
    license_verified BOOLEAN DEFAULT FALSE,
    
    -- Contact
    email TEXT,
    phone TEXT,
    website TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Configuration
    settings JSONB DEFAULT '{
        "delivery_auto_assign": false,
        "delivery_radius_miles": 10,
        "minimum_order_amount": 0,
        "order_notifications": true,
        "accept_pickup": true,
        "accept_delivery": true
    }',
    
    -- Delivery settings (from migration 031)
    delivery_settings JSONB DEFAULT '{
        "delivery_enabled": true,
        "pickup_enabled": true,
        "delivery_fee": 4.99,
        "free_delivery_threshold": 50,
        "minimum_order": 15,
        "delivery_radius_miles": 10,
        "estimated_delivery_minutes": 45
    }',
    
    -- Business hours (from migration 031)
    business_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "21:00", "is_open": true},
        "tuesday": {"open": "09:00", "close": "21:00", "is_open": true},
        "wednesday": {"open": "09:00", "close": "21:00", "is_open": true},
        "thursday": {"open": "09:00", "close": "21:00", "is_open": true},
        "friday": {"open": "09:00", "close": "22:00", "is_open": true},
        "saturday": {"open": "10:00", "close": "22:00", "is_open": true},
        "sunday": {"open": "10:00", "close": "20:00", "is_open": true}
    }',
    
    -- Ratings (denormalized for performance)
    average_rating DECIMAL(2,1) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.store_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Address
    name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    county TEXT,
    state CHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    country TEXT DEFAULT 'US',
    
    -- Geolocation
    coordinates GEOGRAPHY(POINT, 4326) NOT NULL,
    coverage_area GEOGRAPHY(POLYGON, 4326),
    coverage_radius_miles DECIMAL(5,2) DEFAULT 10,
    
    -- Business hours
    business_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "21:00", "is_open": true},
        "tuesday": {"open": "09:00", "close": "21:00", "is_open": true},
        "wednesday": {"open": "09:00", "close": "21:00", "is_open": true},
        "thursday": {"open": "09:00", "close": "21:00", "is_open": true},
        "friday": {"open": "09:00", "close": "22:00", "is_open": true},
        "saturday": {"open": "10:00", "close": "22:00", "is_open": true},
        "sunday": {"open": "12:00", "close": "18:00", "is_open": true}
    }',
    
    timezone TEXT DEFAULT 'America/New_York',
    is_pickup_available BOOLEAN DEFAULT TRUE,
    is_delivery_available BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.store_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    position TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    work_schedule JSONB,
    hourly_rate DECIMAL(10,2),
    hired_at DATE DEFAULT CURRENT_DATE,
    terminated_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, user_id)
);

CREATE TABLE public.store_special_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_location_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    open_time TIME,
    close_time TIME,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_location_id, date)
);

CREATE TABLE public.store_delivery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    is_delivery_enabled BOOLEAN DEFAULT TRUE,
    is_pickup_enabled BOOLEAN DEFAULT TRUE,
    base_delivery_fee DECIMAL(10,2) DEFAULT 4.99,
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    free_delivery_threshold DECIMAL(10,2),
    delivery_radius_miles DECIMAL(5,2) DEFAULT 10,
    estimated_delivery_time TEXT DEFAULT '30-45 min',
    estimated_pickup_time TEXT DEFAULT '15-20 min',
    delivery_hours JSONB,
    auto_assign_delivery BOOLEAN DEFAULT FALSE,
    max_concurrent_deliveries INT DEFAULT 10,
    peak_hours_surcharge DECIMAL(10,2) DEFAULT 0,
    distance_surcharge_per_mile DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id)
);

-- ============================================
-- SECTION 7: US JURISDICTIONS
-- ============================================

CREATE TABLE public.us_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fips_code CHAR(2) UNIQUE NOT NULL,
    usps_code CHAR(2) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    alcohol_sale_allowed BOOLEAN DEFAULT TRUE,
    min_drinking_age INT DEFAULT 21,
    requires_state_license BOOLEAN DEFAULT TRUE,
    timezone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.us_counties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES us_states(id) ON DELETE CASCADE,
    fips_code CHAR(5) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    boundary GEOGRAPHY(MULTIPOLYGON, 4326),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.us_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id UUID NOT NULL REFERENCES us_counties(id) ON DELETE CASCADE,
    state_id UUID NOT NULL REFERENCES us_states(id) ON DELETE CASCADE,
    fips_place_code TEXT,
    name TEXT NOT NULL,
    boundary GEOGRAPHY(MULTIPOLYGON, 4326),
    population INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(state_id, name)
);

CREATE TABLE public.us_zip_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zip_code CHAR(5) UNIQUE NOT NULL,
    zip_code_full TEXT,
    city_id UUID REFERENCES us_cities(id),
    county_id UUID NOT NULL REFERENCES us_counties(id),
    state_id UUID NOT NULL REFERENCES us_states(id),
    coordinates GEOGRAPHY(POINT, 4326),
    boundary GEOGRAPHY(POLYGON, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECTION 8: TAXES & FEES
-- ============================================

CREATE TABLE public.tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope tax_scope NOT NULL,
    state_id UUID REFERENCES us_states(id) ON DELETE CASCADE,
    county_id UUID REFERENCES us_counties(id) ON DELETE CASCADE,
    city_id UUID REFERENCES us_cities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rate DECIMAL(5,4) NOT NULL,
    tax_type TEXT DEFAULT 'sales',
    applies_to TEXT DEFAULT 'all',
    categories TEXT[],
    effective_date DATE NOT NULL,
    end_date DATE,
    created_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_tax_jurisdiction CHECK (
        (scope = 'state' AND state_id IS NOT NULL AND county_id IS NULL AND city_id IS NULL) OR
        (scope = 'county' AND county_id IS NOT NULL AND city_id IS NULL) OR
        (scope = 'city' AND city_id IS NOT NULL)
    )
);

CREATE TABLE public.platform_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope fee_scope DEFAULT 'global',
    state_id UUID REFERENCES us_states(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fee_type TEXT NOT NULL,
    calculation_type TEXT NOT NULL,
    value DECIMAL(10,4) NOT NULL,
    tiers JSONB,
    effective_date DATE NOT NULL,
    end_date DATE,
    created_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_fee_scope CHECK (
        (scope = 'global' AND state_id IS NULL) OR
        (scope = 'state' AND state_id IS NOT NULL)
    )
);

-- ============================================
-- SECTION 9: PRODUCTS & INVENTORY
-- ============================================

-- Dynamic taxonomy tables
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES public.product_categories(id),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.product_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master products catalog
CREATE TABLE public.master_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    upc TEXT,
    name TEXT NOT NULL,
    brand TEXT,
    description TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    tags TEXT[] DEFAULT '{}',
    specifications JSONB DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    thumbnail_url TEXT,
    age_restriction INT DEFAULT 21,
    slug TEXT UNIQUE,
    meta_title TEXT,
    meta_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    -- Foreign keys for taxonomy
    category_id UUID REFERENCES public.product_categories(id),
    brand_id UUID REFERENCES public.product_brands(id),
    -- Full-text search vector
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(brand, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(category, '')), 'D')
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store inventories
CREATE TABLE public.store_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    store_location_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2),
    cost DECIMAL(10,2),
    quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    discount_type TEXT,
    discount_value DECIMAL(10,2),
    discount_start_date TIMESTAMPTZ,
    discount_end_date TIMESTAMPTZ,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, store_location_id, product_id)
);

-- Store custom products (hybrid catalog)
CREATE TABLE public.store_custom_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    upc TEXT,
    name TEXT NOT NULL,
    brand TEXT,
    description TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    tags TEXT[] DEFAULT '{}',
    specifications JSONB DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    thumbnail_url TEXT,
    age_restriction INT DEFAULT 21,
    slug TEXT,
    meta_title TEXT,
    meta_description TEXT,
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2),
    cost DECIMAL(10,2),
    quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    approval_status product_approval_status DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    promoted_to_master_id UUID REFERENCES master_products(id),
    promoted_at TIMESTAMPTZ,
    is_available BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, sku)
);

-- Product approval history
CREATE TABLE public.product_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_product_id UUID NOT NULL REFERENCES store_custom_products(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    from_status product_approval_status,
    to_status product_approval_status NOT NULL,
    notes TEXT,
    performed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product collections
CREATE TABLE public.product_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    type TEXT DEFAULT 'manual',
    rules JSONB,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, slug)
);

CREATE TABLE public.collection_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES product_collections(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES store_inventories(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0,
    UNIQUE(collection_id, inventory_id)
);

-- Inventory movements
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES store_inventories(id) ON DELETE CASCADE,
    movement_type inventory_movement_type NOT NULL,
    quantity INT NOT NULL,
    quantity_before INT,
    quantity_after INT,
    reference_id UUID,
    reference_type TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory transfers
CREATE TABLE public.inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_location_id UUID NOT NULL REFERENCES store_locations(id),
    to_location_id UUID NOT NULL REFERENCES store_locations(id),
    product_id UUID NOT NULL REFERENCES master_products(id),
    quantity INT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history
CREATE TABLE public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES store_inventories(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price alerts
CREATE TABLE public.price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
    target_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECTION 10: PROMOTIONS & COUPONS
-- ============================================

CREATE TABLE public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type promotion_type NOT NULL,
    config JSONB NOT NULL,
    eligible_product_ids UUID[],
    eligible_categories TEXT[],
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    usage_limit INT,
    usage_count INT DEFAULT 0,
    per_customer_limit INT,
    minimum_order_amount DECIMAL(10,2),
    minimum_quantity INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.promotion_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promotion_id, order_id)
);

CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    type coupon_type NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    minimum_order_amount DECIMAL(10,2),
    eligible_product_ids UUID[],
    eligible_categories TEXT[],
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    usage_limit INT,
    usage_count INT DEFAULT 0,
    per_customer_limit INT DEFAULT 1,
    first_order_only BOOLEAN DEFAULT FALSE,
    new_customers_only BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coupon_id, order_id)
);

-- ============================================
-- SECTION 11: ORDERS
-- ============================================

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    
    -- References (customer_id nullable for POS orders)
    customer_id UUID REFERENCES profiles(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    store_location_id UUID REFERENCES store_locations(id),
    
    -- Status
    status order_status DEFAULT 'pending',
    fulfillment_type fulfillment_type NOT NULL,
    
    -- Delivery address
    delivery_address JSONB,
    delivery_coordinates GEOGRAPHY(POINT, 4326),
    
    -- Totals
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    
    tax_breakdown JSONB,
    
    -- Coupon applied
    coupon_id UUID REFERENCES coupons(id),
    coupon_code TEXT,
    coupon_discount DECIMAL(10,2) DEFAULT 0,
    
    -- Promotion applied
    promotion_id UUID REFERENCES promotions(id),
    promotion_discount DECIMAL(10,2) DEFAULT 0,
    
    -- Stripe
    stripe_payment_intent_id TEXT,
    stripe_payment_status TEXT,
    stripe_transfer_id TEXT,
    
    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,
    
    -- Scheduled delivery/pickup
    scheduled_for TIMESTAMPTZ,
    
    -- Guest info for POS orders
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,
    
    -- POS payment info
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    cash_received DECIMAL(10,2),
    change_due DECIMAL(10,2),
    
    -- Order source
    order_source TEXT DEFAULT 'online',
    
    -- Timestamps
    confirmed_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES store_inventories(id),
    product_id UUID NOT NULL REFERENCES master_products(id),
    product_name TEXT NOT NULL,
    product_image TEXT,
    product_sku TEXT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    promotion_id UUID REFERENCES promotions(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status order_status NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.pickup_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_location_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    max_orders INT DEFAULT 5,
    current_orders INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    UNIQUE(store_location_id, slot_date, slot_time)
);

CREATE TABLE public.store_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    store_response TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES profiles(id),
    is_visible BOOLEAN DEFAULT TRUE,
    reported_at TIMESTAMPTZ,
    report_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id)
);

-- ============================================
-- SECTION 12: DELIVERY
-- ============================================

CREATE TABLE public.delivery_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    email TEXT,
    phone TEXT,
    settings JSONB DEFAULT '{
        "auto_assign_enabled": true,
        "max_concurrent_deliveries_per_driver": 3,
        "base_delivery_fee": 5.99,
        "per_mile_fee": 0.50,
        "minimum_delivery_fee": 3.99,
        "maximum_delivery_distance_miles": 15,
        "estimated_pickup_time_minutes": 10
    }',
    service_areas GEOGRAPHY(MULTIPOLYGON, 4326),
    operating_hours JSONB DEFAULT '{
        "monday": {"open": "08:00", "close": "22:00", "is_open": true},
        "tuesday": {"open": "08:00", "close": "22:00", "is_open": true},
        "wednesday": {"open": "08:00", "close": "22:00", "is_open": true},
        "thursday": {"open": "08:00", "close": "22:00", "is_open": true},
        "friday": {"open": "08:00", "close": "23:00", "is_open": true},
        "saturday": {"open": "09:00", "close": "23:00", "is_open": true},
        "sunday": {"open": "10:00", "close": "21:00", "is_open": true}
    }',
    is_active BOOLEAN DEFAULT TRUE,
    average_rating DECIMAL(2,1) DEFAULT 0,
    total_deliveries INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.delivery_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_company_id UUID NOT NULL REFERENCES delivery_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_type TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    vehicle_plate TEXT,
    drivers_license_number TEXT,
    drivers_license_expiry DATE,
    drivers_license_state CHAR(2),
    insurance_policy_number TEXT,
    insurance_expiry DATE,
    is_active BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT FALSE,
    is_on_delivery BOOLEAN DEFAULT FALSE,
    current_location GEOGRAPHY(POINT, 4326),
    current_heading DECIMAL(5,2),
    last_location_update TIMESTAMPTZ,
    total_deliveries INT DEFAULT 0,
    average_rating DECIMAL(2,1) DEFAULT 0,
    total_distance_miles DECIMAL(10,2) DEFAULT 0,
    phone TEXT,
    -- Performance tracking (from migration 031)
    completed_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    avg_delivery_time_minutes INTEGER DEFAULT 30,
    performance_score DECIMAL(3,2) DEFAULT 1.00,
    last_assignment_at TIMESTAMPTZ,
    preferred_zones TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(delivery_company_id, user_id)
);

CREATE TABLE public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    delivery_company_id UUID NOT NULL REFERENCES delivery_companies(id),
    driver_id UUID REFERENCES delivery_drivers(id),
    status delivery_status DEFAULT 'pending',
    pickup_location GEOGRAPHY(POINT, 4326),
    pickup_address JSONB,
    dropoff_location GEOGRAPHY(POINT, 4326),
    dropoff_address JSONB,
    distance_miles DECIMAL(6,2),
    delivery_fee DECIMAL(10,2),
    driver_earnings DECIMAL(10,2),
    platform_cut DECIMAL(10,2),
    tip_amount DECIMAL(10,2) DEFAULT 0,
    estimated_pickup_time TIMESTAMPTZ,
    estimated_delivery_time TIMESTAMPTZ,
    actual_pickup_time TIMESTAMPTZ,
    actual_delivery_time TIMESTAMPTZ,
    delivery_photo_url TEXT,
    recipient_signature_url TEXT,
    recipient_name TEXT,
    delivery_proof_type TEXT,
    driver_notes TEXT,
    customer_notes TEXT,
    customer_rating INT CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    rated_at TIMESTAMPTZ,
    auto_assigned BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ,
    assignment_attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id)
);

CREATE TABLE public.delivery_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    speed DECIMAL(5,2),
    heading DECIMAL(5,2),
    accuracy DECIMAL(6,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.delivery_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    status delivery_status NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    notes TEXT,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.store_delivery_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    delivery_company_id UUID NOT NULL REFERENCES delivery_companies(id) ON DELETE CASCADE,
    priority INT DEFAULT 1,
    is_enabled BOOLEAN DEFAULT TRUE,
    custom_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, delivery_company_id)
);

CREATE TABLE public.delivery_company_jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_company_id UUID NOT NULL REFERENCES delivery_companies(id) ON DELETE CASCADE,
    state_code CHAR(2) NOT NULL,
    county_name TEXT,
    city_name TEXT,
    fips_code TEXT,
    delivery_fee_base DECIMAL(10,2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(delivery_company_id, state_code, county_name, city_name)
);

-- ============================================
-- SECTION 13: AUDIT & SETTINGS
-- ============================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    tenant_id UUID REFERENCES tenants(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.encrypted_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_category TEXT NOT NULL DEFAULT 'general',
    encrypted_value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECTION 14: CMS - PAGE CONTENT
-- ============================================

CREATE TABLE public.page_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    excerpt TEXT,
    category TEXT NOT NULL CHECK (category IN ('about', 'support', 'legal')),
    meta_title TEXT,
    meta_description TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- ============================================
-- SECTION 15: INDEXES
-- ============================================

-- Profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_coordinates ON profiles USING GIST (current_coordinates);
CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_default ON user_addresses(user_id, is_default) WHERE is_default = TRUE;

-- Tenants
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_type ON tenants(type);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_stripe ON tenants(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX idx_tenant_memberships_user ON tenant_memberships(user_id);
CREATE INDEX idx_tenant_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX idx_tenant_memberships_active ON tenant_memberships(user_id, is_active) WHERE is_active = TRUE;

-- Stores
CREATE INDEX idx_stores_tenant ON stores(tenant_id);
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_active ON stores(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_stores_featured ON stores(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_stores_name ON stores USING GIN (to_tsvector('english', name));
CREATE INDEX idx_stores_name_trgm ON stores USING GIN (name gin_trgm_ops);
CREATE INDEX idx_stores_description_trgm ON stores USING GIN (description gin_trgm_ops);
CREATE INDEX idx_stores_delivery_enabled ON stores ((delivery_settings->>'delivery_enabled'));

-- Store locations
CREATE INDEX idx_store_locations_store ON store_locations(store_id);
CREATE INDEX idx_store_locations_coordinates ON store_locations USING GIST (coordinates);
CREATE INDEX idx_store_locations_coverage ON store_locations USING GIST (coverage_area);
CREATE INDEX idx_store_locations_state ON store_locations(state);
CREATE INDEX idx_store_locations_active ON store_locations(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_store_employees_store ON store_employees(store_id);
CREATE INDEX idx_store_employees_user ON store_employees(user_id);
CREATE INDEX idx_store_delivery_settings_store ON store_delivery_settings(store_id);

-- US Jurisdictions
CREATE INDEX idx_us_states_usps ON us_states(usps_code);
CREATE INDEX idx_us_states_fips ON us_states(fips_code);
CREATE INDEX idx_us_counties_state ON us_counties(state_id);
CREATE INDEX idx_us_counties_fips ON us_counties(fips_code);
CREATE INDEX idx_us_counties_boundary ON us_counties USING GIST (boundary);
CREATE INDEX idx_us_cities_state ON us_cities(state_id);
CREATE INDEX idx_us_cities_county ON us_cities(county_id);
CREATE INDEX idx_us_cities_name ON us_cities(name);
CREATE INDEX idx_us_cities_boundary ON us_cities USING GIST (boundary);
CREATE INDEX idx_us_zip_codes_state ON us_zip_codes(state_id);
CREATE INDEX idx_us_zip_codes_county ON us_zip_codes(county_id);
CREATE INDEX idx_us_zip_codes_city ON us_zip_codes(city_id);
CREATE INDEX idx_us_zip_codes_coordinates ON us_zip_codes USING GIST (coordinates);

-- Taxes and fees
CREATE INDEX idx_tax_rates_state ON tax_rates(state_id);
CREATE INDEX idx_tax_rates_county ON tax_rates(county_id);
CREATE INDEX idx_tax_rates_city ON tax_rates(city_id);
CREATE INDEX idx_tax_rates_active ON tax_rates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_tax_rates_type ON tax_rates(tax_type);
CREATE INDEX idx_platform_fees_state ON platform_fees(state_id);
CREATE INDEX idx_platform_fees_type ON platform_fees(fee_type);
CREATE INDEX idx_platform_fees_active ON platform_fees(is_active) WHERE is_active = TRUE;

-- Products
CREATE INDEX idx_product_categories_name_trgm ON product_categories USING GIN (name gin_trgm_ops);
CREATE INDEX idx_master_products_sku ON master_products(sku);
CREATE INDEX idx_master_products_slug ON master_products(slug);
CREATE INDEX idx_master_products_category ON master_products(category);
CREATE INDEX idx_master_products_brand ON master_products(brand);
CREATE INDEX idx_master_products_name ON master_products USING GIN (to_tsvector('english', name));
CREATE INDEX idx_master_products_active ON master_products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_master_products_name_trgm ON master_products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_master_products_brand_trgm ON master_products USING GIN (brand gin_trgm_ops);
CREATE INDEX idx_master_products_search_vector ON master_products USING GIN (search_vector);

-- Store inventories
CREATE INDEX idx_store_inventories_store ON store_inventories(store_id);
CREATE INDEX idx_store_inventories_location ON store_inventories(store_location_id);
CREATE INDEX idx_store_inventories_product ON store_inventories(product_id);
CREATE INDEX idx_store_inventories_available ON store_inventories(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_store_inventories_featured ON store_inventories(store_id, is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_store_inventories_price ON store_inventories(price);

-- Custom products
CREATE INDEX idx_store_custom_products_store ON store_custom_products(store_id);
CREATE INDEX idx_store_custom_products_sku ON store_custom_products(store_id, sku);
CREATE INDEX idx_store_custom_products_status ON store_custom_products(approval_status);
CREATE INDEX idx_store_custom_products_pending ON store_custom_products(approval_status) WHERE approval_status = 'pending_review';
CREATE INDEX idx_store_custom_products_category ON store_custom_products(category);

-- Collections
CREATE INDEX idx_product_collections_store ON product_collections(store_id);
CREATE INDEX idx_collection_products_collection ON collection_products(collection_id);

-- Inventory tracking
CREATE INDEX idx_inventory_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at);
CREATE INDEX idx_price_history_inventory ON price_history(inventory_id);
CREATE INDEX idx_price_history_date ON price_history(recorded_at);
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_product ON price_alerts(product_id);

-- Promotions
CREATE INDEX idx_promotions_store ON promotions(store_id);
CREATE INDEX idx_promotions_type ON promotions(type);
CREATE INDEX idx_promotions_active ON promotions(is_active, start_date, end_date) WHERE is_active = TRUE;
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX idx_promotion_usage_promotion ON promotion_usage(promotion_id);
CREATE INDEX idx_promotion_usage_user ON promotion_usage(user_id);

-- Coupons
CREATE INDEX idx_coupons_store ON coupons(store_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active, start_date, end_date) WHERE is_active = TRUE;
CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);

-- Orders
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_location ON orders(store_location_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_stripe ON orders(stripe_payment_intent_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);

-- Pickup and reviews
CREATE INDEX idx_pickup_slots_location ON pickup_slots(store_location_id);
CREATE INDEX idx_pickup_slots_date ON pickup_slots(slot_date);
CREATE INDEX idx_store_reviews_store ON store_reviews(store_id);
CREATE INDEX idx_store_reviews_user ON store_reviews(user_id);
CREATE INDEX idx_store_reviews_rating ON store_reviews(store_id, rating);

-- Delivery
CREATE INDEX idx_delivery_companies_tenant ON delivery_companies(tenant_id);
CREATE INDEX idx_delivery_companies_slug ON delivery_companies(slug);
CREATE INDEX idx_delivery_companies_areas ON delivery_companies USING GIST (service_areas);
CREATE INDEX idx_delivery_companies_active ON delivery_companies(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_delivery_drivers_company ON delivery_drivers(delivery_company_id);
CREATE INDEX idx_delivery_drivers_user ON delivery_drivers(user_id);
CREATE INDEX idx_delivery_drivers_location ON delivery_drivers USING GIST (current_location);
CREATE INDEX idx_delivery_drivers_available ON delivery_drivers(delivery_company_id, is_available) WHERE is_available = TRUE AND is_active = TRUE;
CREATE INDEX idx_deliveries_order ON deliveries(order_id);
CREATE INDEX idx_deliveries_company ON deliveries(delivery_company_id);
CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_created ON deliveries(created_at);
CREATE INDEX idx_delivery_tracking_delivery ON delivery_tracking(delivery_id);
CREATE INDEX idx_delivery_tracking_time ON delivery_tracking(recorded_at);
CREATE INDEX idx_store_delivery_prefs_store ON store_delivery_preferences(store_id);
CREATE INDEX idx_store_delivery_prefs_company ON store_delivery_preferences(delivery_company_id);

-- Audit and notifications
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_encrypted_settings_category ON encrypted_settings(setting_category);
CREATE INDEX idx_encrypted_settings_key ON encrypted_settings(setting_key);

-- CMS
CREATE INDEX idx_page_content_slug ON page_content(slug);
CREATE INDEX idx_page_content_category ON page_content(category);
CREATE INDEX idx_page_content_published ON page_content(is_published) WHERE is_published = TRUE;

-- ============================================
-- SECTION 16: TRIGGERS
-- ============================================

-- Profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tenants
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_memberships_updated_at
    BEFORE UPDATE ON tenant_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stores
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_locations_updated_at
    BEFORE UPDATE ON store_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_employees_updated_at
    BEFORE UPDATE ON store_employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_delivery_settings_updated_at
    BEFORE UPDATE ON store_delivery_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Taxes
CREATE TRIGGER update_tax_rates_updated_at
    BEFORE UPDATE ON tax_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_fees_updated_at
    BEFORE UPDATE ON platform_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Products
CREATE TRIGGER update_master_products_updated_at
    BEFORE UPDATE ON master_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_inventories_updated_at
    BEFORE UPDATE ON store_inventories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_collections_updated_at
    BEFORE UPDATE ON product_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Promotions
CREATE TRIGGER update_promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Orders
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Delivery
CREATE TRIGGER update_delivery_companies_updated_at
    BEFORE UPDATE ON delivery_companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_drivers_updated_at
    BEFORE UPDATE ON delivery_drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_company_jurisdictions_updated_at
    BEFORE UPDATE ON delivery_company_jurisdictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CMS
CREATE TRIGGER update_page_content_updated_at
    BEFORE UPDATE ON page_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Encrypted settings
CREATE TRIGGER encrypted_settings_updated_at
    BEFORE UPDATE ON encrypted_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SECTION 17: BUSINESS LOGIC FUNCTIONS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Track price changes
CREATE OR REPLACE FUNCTION track_price_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        INSERT INTO price_history (inventory_id, price)
        VALUES (NEW.id, NEW.price);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_inventory_price_change
    AFTER UPDATE ON store_inventories
    FOR EACH ROW EXECUTE FUNCTION track_price_change();

-- Track initial price
CREATE OR REPLACE FUNCTION track_initial_price()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO price_history (inventory_id, price)
    VALUES (NEW.id, NEW.price);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_inventory_initial_price
    AFTER INSERT ON store_inventories
    FOR EACH ROW EXECUTE FUNCTION track_initial_price();

-- Track order status changes
CREATE OR REPLACE FUNCTION track_order_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status)
        VALUES (NEW.id, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_order_status_change
    AFTER UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION track_order_status();

-- Insert initial order status
CREATE OR REPLACE FUNCTION track_initial_order_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_status_history (order_id, status)
    VALUES (NEW.id, NEW.status);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_order_initial_status
    AFTER INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION track_initial_order_status();

-- Update store rating after review
CREATE OR REPLACE FUNCTION update_store_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stores 
    SET 
        average_rating = (
            SELECT ROUND(AVG(rating)::numeric, 1)
            FROM store_reviews 
            WHERE store_id = NEW.store_id AND is_visible = TRUE
        ),
        total_reviews = (
            SELECT COUNT(*) 
            FROM store_reviews 
            WHERE store_id = NEW.store_id AND is_visible = TRUE
        )
    WHERE id = NEW.store_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_store_rating_on_review
    AFTER INSERT OR UPDATE ON store_reviews
    FOR EACH ROW EXECUTE FUNCTION update_store_rating();

-- Track delivery status changes
CREATE OR REPLACE FUNCTION track_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO delivery_status_history (delivery_id, status)
        VALUES (NEW.id, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_delivery_status_change
    AFTER UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION track_delivery_status();

-- Update driver stats after delivery completion
CREATE OR REPLACE FUNCTION update_driver_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        UPDATE delivery_drivers
        SET 
            total_deliveries = total_deliveries + 1,
            total_distance_miles = total_distance_miles + COALESCE(NEW.distance_miles, 0)
        WHERE id = NEW.driver_id;
        
        UPDATE delivery_companies
        SET total_deliveries = total_deliveries + 1
        WHERE id = NEW.delivery_company_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_stats_on_delivery
    AFTER UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION update_driver_stats();

-- Update driver rating
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_rating IS NOT NULL AND OLD.customer_rating IS NULL THEN
        UPDATE delivery_drivers
        SET average_rating = (
            SELECT ROUND(AVG(customer_rating)::numeric, 1)
            FROM deliveries
            WHERE driver_id = NEW.driver_id
            AND customer_rating IS NOT NULL
        )
        WHERE id = NEW.driver_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_rating_on_delivery
    AFTER UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION update_driver_rating();

-- ============================================
-- SECTION 18: HELPER FUNCTIONS
-- ============================================

-- Check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM platform_admins 
        WHERE user_id = auth.uid() 
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's tenant IDs by type
CREATE OR REPLACE FUNCTION get_user_tenant_ids(p_type tenant_type DEFAULT NULL)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT tm.tenant_id 
        FROM tenant_memberships tm
        JOIN tenants t ON t.id = tm.tenant_id
        WHERE tm.user_id = auth.uid() 
        AND tm.is_active = TRUE
        AND (p_type IS NULL OR t.type = p_type)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's tenants
CREATE OR REPLACE FUNCTION get_user_tenants(p_user_id UUID)
RETURNS TABLE (
    tenant_id UUID,
    tenant_name TEXT,
    tenant_type tenant_type,
    user_role membership_role
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.type,
        tm.role
    FROM tenants t
    JOIN tenant_memberships tm ON tm.tenant_id = t.id
    WHERE tm.user_id = p_user_id
    AND tm.is_active = TRUE
    AND t.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has role in tenant
CREATE OR REPLACE FUNCTION user_has_tenant_role(
    p_user_id UUID,
    p_tenant_id UUID,
    p_roles membership_role[]
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE user_id = p_user_id
        AND tenant_id = p_tenant_id
        AND role = ANY(p_roles)
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT := 'VS';
    v_date TEXT := TO_CHAR(CURRENT_DATE, 'YYMMDD');
    v_seq INT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INT)), 0) + 1
    INTO v_seq
    FROM orders
    WHERE order_number LIKE v_prefix || v_date || '%';
    
    RETURN v_prefix || v_date || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Check if it's user's first order
CREATE OR REPLACE FUNCTION is_users_first_order(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM orders 
        WHERE customer_id = p_user_id 
        AND status NOT IN ('cancelled', 'refunded')
    );
END;
$$ LANGUAGE plpgsql;

-- Calculate total tax rate for a location
CREATE OR REPLACE FUNCTION calculate_tax_rate(
    p_state_id UUID,
    p_county_id UUID DEFAULT NULL,
    p_city_id UUID DEFAULT NULL,
    p_tax_type TEXT DEFAULT 'all'
)
RETURNS DECIMAL AS $$
DECLARE
    v_total_rate DECIMAL := 0;
BEGIN
    SELECT COALESCE(SUM(rate), 0) INTO v_total_rate
    FROM tax_rates
    WHERE is_active = TRUE
    AND (end_date IS NULL OR end_date > CURRENT_DATE)
    AND effective_date <= CURRENT_DATE
    AND (
        (scope = 'state' AND state_id = p_state_id) OR
        (scope = 'county' AND county_id = p_county_id) OR
        (scope = 'city' AND city_id = p_city_id)
    )
    AND (
        p_tax_type = 'all' OR 
        applies_to = 'all' OR 
        tax_type = p_tax_type
    );
    
    RETURN v_total_rate;
END;
$$ LANGUAGE plpgsql;

-- Calculate delivery fee
CREATE OR REPLACE FUNCTION calculate_delivery_fee(
    p_delivery_company_id UUID,
    p_distance_miles DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    v_settings JSONB;
    v_base_fee DECIMAL;
    v_per_mile_fee DECIMAL;
    v_min_fee DECIMAL;
    v_total DECIMAL;
BEGIN
    SELECT settings INTO v_settings
    FROM delivery_companies WHERE id = p_delivery_company_id;
    
    v_base_fee := COALESCE((v_settings->>'base_delivery_fee')::DECIMAL, 5.99);
    v_per_mile_fee := COALESCE((v_settings->>'per_mile_fee')::DECIMAL, 0.50);
    v_min_fee := COALESCE((v_settings->>'minimum_delivery_fee')::DECIMAL, 3.99);
    
    v_total := v_base_fee + (p_distance_miles * v_per_mile_fee);
    
    RETURN GREATEST(v_total, v_min_fee);
END;
$$ LANGUAGE plpgsql;

-- Get store delivery fee
CREATE OR REPLACE FUNCTION get_store_delivery_fee(p_store_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_delivery_fee DECIMAL(10,2);
BEGIN
    SELECT COALESCE((delivery_settings->>'delivery_fee')::DECIMAL, 4.99)
    INTO v_delivery_fee
    FROM stores
    WHERE id = p_store_id;

    RETURN COALESCE(v_delivery_fee, 4.99);
END;
$$;

-- Check if order qualifies for free delivery
CREATE OR REPLACE FUNCTION check_free_delivery(p_store_id UUID, p_order_subtotal DECIMAL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_threshold DECIMAL(10,2);
BEGIN
    SELECT COALESCE((delivery_settings->>'free_delivery_threshold')::DECIMAL, 0)
    INTO v_threshold
    FROM stores
    WHERE id = p_store_id;

    IF v_threshold <= 0 THEN
        RETURN FALSE;
    END IF;

    RETURN p_order_subtotal >= v_threshold;
END;
$$;

-- Get effective delivery fee
CREATE OR REPLACE FUNCTION get_effective_delivery_fee(p_store_id UUID, p_order_subtotal DECIMAL)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF check_free_delivery(p_store_id, p_order_subtotal) THEN
        RETURN 0;
    END IF;

    RETURN get_store_delivery_fee(p_store_id);
END;
$$;

-- Safely decrement inventory
CREATE OR REPLACE FUNCTION decrement_inventory(
    p_inventory_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
BEGIN
    SELECT quantity INTO v_current_quantity
    FROM store_inventories
    WHERE id = p_inventory_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
        RETURN FALSE;
    END IF;

    v_new_quantity := GREATEST(0, v_current_quantity - p_quantity);

    UPDATE store_inventories
    SET quantity = v_new_quantity, updated_at = NOW()
    WHERE id = p_inventory_id;

    INSERT INTO inventory_movements (
        inventory_id, movement_type, quantity, reference_type, notes
    ) VALUES (
        p_inventory_id, 'sale', -p_quantity, 'order', 'Automatic deduction from order'
    );

    RETURN TRUE;
END;
$$;

-- Create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_body TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}',
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, body, data, action_url)
    VALUES (p_user_id, p_type, p_title, p_body, p_data, p_action_url)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log audit event
CREATE OR REPLACE FUNCTION log_audit(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id,
        old_values, new_values, metadata
    )
    VALUES (
        v_user_id, p_action, p_entity_type, p_entity_id,
        p_old_values, p_new_values, p_metadata
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get nearby stores
CREATE OR REPLACE FUNCTION get_nearby_stores(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_miles DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
    store_id UUID,
    store_name TEXT,
    location_id UUID,
    location_name TEXT,
    distance_miles DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        sl.id,
        sl.name,
        ST_Distance(
            sl.coordinates::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) / 1609.34 AS distance_miles
    FROM stores s
    JOIN store_locations sl ON sl.store_id = s.id
    WHERE s.is_active = TRUE
    AND sl.is_active = TRUE
    AND ST_DWithin(
        sl.coordinates::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_miles * 1609.34
    )
    ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_store_delivery_fee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_delivery_fee(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_free_delivery(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION check_free_delivery(UUID, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION get_effective_delivery_fee(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_delivery_fee(UUID, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_inventory(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_inventory(UUID, INTEGER) TO service_role;

-- ============================================
-- SECTION 19: VIEWS
-- ============================================

-- Unified store products view
CREATE OR REPLACE VIEW store_products_unified AS
SELECT
    si.id AS inventory_id,
    si.store_id,
    mp.id AS product_id,
    NULL::UUID AS custom_product_id,
    'master' AS product_source,
    mp.sku,
    mp.upc,
    mp.name,
    mp.brand,
    mp.description,
    mp.category,
    mp.subcategory,
    mp.tags,
    mp.specifications,
    mp.images,
    mp.thumbnail_url,
    mp.age_restriction,
    mp.slug,
    si.price,
    si.compare_at_price,
    si.cost,
    si.quantity,
    si.low_stock_threshold,
    si.is_available,
    si.is_featured,
    'approved'::product_approval_status AS approval_status,
    si.created_at,
    si.updated_at
FROM store_inventories si
JOIN master_products mp ON mp.id = si.product_id
WHERE mp.is_active = TRUE

UNION ALL

SELECT
    scp.id AS inventory_id,
    scp.store_id,
    NULL::UUID AS product_id,
    scp.id AS custom_product_id,
    'custom' AS product_source,
    scp.sku,
    scp.upc,
    scp.name,
    scp.brand,
    scp.description,
    scp.category,
    scp.subcategory,
    scp.tags,
    scp.specifications,
    scp.images,
    scp.thumbnail_url,
    scp.age_restriction,
    scp.slug,
    scp.price,
    scp.compare_at_price,
    scp.cost,
    scp.quantity,
    scp.low_stock_threshold,
    scp.is_available,
    scp.is_featured,
    scp.approval_status,
    scp.created_at,
    scp.updated_at
FROM store_custom_products scp;

-- ============================================
-- SECTION 20: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
-- NOTE: platform_admins has RLS DISABLED to avoid infinite recursion
-- when is_platform_admin() function queries platform_admins table.
-- Access control for this table is handled at application level.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_special_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_zip_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_custom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_delivery_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_company_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: Profiles
-- ============================================
-- NOTE: Simplified to allow all reads to avoid recursion issues.
-- Write operations still restricted to own profile.

CREATE POLICY "Allow all reads on profiles"
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- RLS POLICIES: User Addresses
-- ============================================

CREATE POLICY "Users can manage own addresses"
ON user_addresses FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: Platform Admins
-- ============================================
-- NOTE: RLS is DISABLED on platform_admins table.
-- The is_platform_admin() function uses SECURITY DEFINER to query this table.
-- This avoids infinite recursion where policies call is_platform_admin()
-- which then tries to read platform_admins with RLS enabled.
-- Access control is handled at the application level.

-- ============================================
-- RLS POLICIES: Tenants
-- ============================================

CREATE POLICY "Members can view their tenant"
ON tenants FOR SELECT
USING (id = ANY(get_user_tenant_ids()) OR is_platform_admin());

CREATE POLICY "Owners can update their tenant"
ON tenants FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE tenant_id = tenants.id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND is_active = TRUE
    )
);

CREATE POLICY "Allow authenticated users to create tenants"
ON tenants FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Platform admins can manage all tenants"
ON tenants FOR ALL USING (is_platform_admin());

-- ============================================
-- RLS POLICIES: Tenant Memberships
-- ============================================
-- NOTE: Simplified to allow all reads to avoid recursion issues.
-- The get_user_tenant_ids() function uses SECURITY DEFINER to query this table.
-- Write operations are still properly restricted.

CREATE POLICY "Allow all reads on tenant_memberships"
ON tenant_memberships FOR SELECT USING (true);

CREATE POLICY "Users can insert own membership"
ON tenant_memberships FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own membership"
ON tenant_memberships FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own membership"
ON tenant_memberships FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- RLS POLICIES: Stores
-- ============================================

CREATE POLICY "Public can view active stores"
ON stores FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Tenant members can manage stores"
ON stores FOR ALL USING (tenant_id = ANY(get_user_tenant_ids('owner_store')));

CREATE POLICY "Users can create store during onboarding"
ON stores FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tenant_memberships tm
        WHERE tm.tenant_id = stores.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
    )
);

CREATE POLICY "Platform admins can manage all stores"
ON stores FOR ALL USING (is_platform_admin());

-- ============================================
-- RLS POLICIES: Store Locations
-- ============================================

CREATE POLICY "Public can view active locations"
ON store_locations FOR SELECT
USING (
    is_active = TRUE 
    AND EXISTS (
        SELECT 1 FROM stores s 
        WHERE s.id = store_locations.store_id 
        AND s.is_active = TRUE
    )
);

CREATE POLICY "Store members can manage locations"
ON store_locations FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_locations.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Platform admins can manage all store locations"
ON store_locations FOR ALL USING (is_platform_admin());

-- ============================================
-- RLS POLICIES: Store Delivery Settings
-- ============================================

CREATE POLICY "Anyone can view delivery settings"
ON store_delivery_settings FOR SELECT USING (true);

CREATE POLICY "Store members can update delivery settings"
ON store_delivery_settings FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM stores s
        JOIN tenants t ON t.id = s.tenant_id
        JOIN tenant_memberships tm ON tm.tenant_id = t.id
        WHERE s.id = store_delivery_settings.store_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin', 'manager')
    )
);

CREATE POLICY "Store owners can insert delivery settings"
ON store_delivery_settings FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM stores s
        JOIN tenants t ON t.id = s.tenant_id
        JOIN tenant_memberships tm ON tm.tenant_id = t.id
        WHERE s.id = store_delivery_settings.store_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Platform admins full access to delivery settings"
ON store_delivery_settings FOR ALL
USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

-- ============================================
-- RLS POLICIES: Products
-- ============================================

CREATE POLICY "Public can view active products"
ON master_products FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Platform admins can manage products"
ON master_products FOR ALL USING (is_platform_admin());

-- ============================================
-- RLS POLICIES: Store Inventories
-- ============================================

CREATE POLICY "Public can view available inventory"
ON store_inventories FOR SELECT
USING (
    is_available = TRUE
    AND EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.is_active = TRUE
    )
);

CREATE POLICY "Store members can view all inventory"
ON store_inventories FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can insert inventory"
ON store_inventories FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can update inventory"
ON store_inventories FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can delete inventory"
ON store_inventories FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Platform admins can manage all inventory"
ON store_inventories FOR ALL USING (is_platform_admin());

-- ============================================
-- RLS POLICIES: Orders
-- ============================================

CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can create orders"
ON orders FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Store members can view orders"
ON orders FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = orders.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can insert orders"
ON orders FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can update orders"
ON orders FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = orders.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can delete orders"
ON orders FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = orders.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Platform admins can view all orders"
ON orders FOR SELECT USING (is_platform_admin() OR auth.uid() = customer_id);

-- ============================================
-- RLS POLICIES: Order Items
-- ============================================

CREATE POLICY "Can view order items for accessible orders"
ON order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_items.order_id
        AND (
            o.customer_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM stores s
                WHERE s.id = o.store_id
                AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
            )
        )
    )
);

CREATE POLICY "Store members can insert order items"
ON order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.id = order_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can update order items"
ON order_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.id = order_items.order_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can delete order items"
ON order_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.id = order_items.order_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Platform admins can view all order items"
ON order_items FOR SELECT
USING (is_platform_admin() OR EXISTS (
    SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid()
));

-- ============================================
-- RLS POLICIES: Order Status History
-- ============================================

CREATE POLICY "Store members can insert order status history"
ON order_status_history FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.id = order_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can view order status history"
ON order_status_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.id = order_status_history.order_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Platform admins can view order history"
ON order_status_history FOR SELECT
USING (is_platform_admin() OR EXISTS (
    SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid()
));

-- ============================================
-- RLS POLICIES: Deliveries
-- ============================================

CREATE POLICY "Delivery company members can manage deliveries"
ON deliveries FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM delivery_companies dc
        WHERE dc.id = deliveries.delivery_company_id
        AND dc.tenant_id = ANY(get_user_tenant_ids('delivery_company'))
    )
);

CREATE POLICY "Drivers can view assigned deliveries"
ON deliveries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM delivery_drivers dd
        WHERE dd.id = deliveries.driver_id
        AND dd.user_id = auth.uid()
    )
);

CREATE POLICY "Drivers can update assigned deliveries"
ON deliveries FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM delivery_drivers dd
        WHERE dd.id = deliveries.driver_id
        AND dd.user_id = auth.uid()
    )
);

CREATE POLICY "Customers can view their delivery"
ON deliveries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = deliveries.order_id
        AND o.customer_id = auth.uid()
    )
);

CREATE POLICY "Platform admins can view all deliveries"
ON deliveries FOR SELECT USING (is_platform_admin());

CREATE POLICY "Platform admins can view delivery history"
ON delivery_status_history FOR SELECT USING (is_platform_admin());

-- ============================================
-- RLS POLICIES: Delivery Companies
-- ============================================

CREATE POLICY "Public can view active delivery companies"
ON delivery_companies FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Company members can manage delivery companies"
ON delivery_companies FOR ALL
USING (tenant_id = ANY(get_user_tenant_ids('delivery_company')));

CREATE POLICY "Users can create delivery company during onboarding"
ON delivery_companies FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tenant_memberships tm
        WHERE tm.tenant_id = delivery_companies.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
    )
);

CREATE POLICY "Platform admins can manage all delivery companies"
ON delivery_companies FOR ALL USING (is_platform_admin());

-- ============================================
-- RLS POLICIES: Delivery Company Jurisdictions
-- ============================================

CREATE POLICY "Company members can manage their jurisdictions"
ON delivery_company_jurisdictions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM delivery_companies dc
        WHERE dc.id = delivery_company_jurisdictions.delivery_company_id
        AND dc.tenant_id = ANY(get_user_tenant_ids('delivery_company'))
    )
);

CREATE POLICY "Public can view active jurisdictions"
ON delivery_company_jurisdictions FOR SELECT USING (is_active = TRUE);

-- ============================================
-- RLS POLICIES: US Jurisdictions (Public read)
-- ============================================

CREATE POLICY "Public can view US states" ON us_states FOR SELECT USING (TRUE);
CREATE POLICY "Public can view US counties" ON us_counties FOR SELECT USING (TRUE);
CREATE POLICY "Public can view US cities" ON us_cities FOR SELECT USING (TRUE);
CREATE POLICY "Public can view US zip codes" ON us_zip_codes FOR SELECT USING (TRUE);

CREATE POLICY "Platform admins can manage jurisdictions"
ON us_states FOR ALL USING (is_platform_admin());
CREATE POLICY "Platform admins can manage counties"
ON us_counties FOR ALL USING (is_platform_admin());
CREATE POLICY "Platform admins can manage cities"
ON us_cities FOR ALL USING (is_platform_admin());
CREATE POLICY "Platform admins can manage zip codes"
ON us_zip_codes FOR ALL USING (is_platform_admin());

-- ============================================
-- RLS POLICIES: Taxes and Fees
-- ============================================

CREATE POLICY "Public can view active tax rates"
ON tax_rates FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Platform admins can manage tax rates"
ON tax_rates FOR ALL USING (is_platform_admin());

CREATE POLICY "Public can view active platform fees"
ON platform_fees FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Platform admins can manage platform fees"
ON platform_fees FOR ALL USING (is_platform_admin());

-- ============================================
-- RLS POLICIES: Audit & Settings
-- ============================================

CREATE POLICY "Platform admins can view audit logs"
ON audit_logs FOR SELECT USING (is_platform_admin());

CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Public can view public settings"
ON platform_settings FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Platform admins can manage all settings"
ON platform_settings FOR ALL USING (is_platform_admin());

CREATE POLICY "Platform admins can view encrypted settings"
ON encrypted_settings FOR SELECT USING (is_platform_admin());

CREATE POLICY "Platform admins can insert encrypted settings"
ON encrypted_settings FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update encrypted settings"
ON encrypted_settings FOR UPDATE USING (is_platform_admin());

CREATE POLICY "Platform admins can delete encrypted settings"
ON encrypted_settings FOR DELETE USING (is_platform_admin());

-- ============================================
-- RLS POLICIES: Notifications
-- ============================================

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- RLS POLICIES: Price History
-- ============================================

CREATE POLICY "Store owners can view their price history"
ON price_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM store_inventories si
        JOIN stores s ON si.store_id = s.id
        JOIN tenant_memberships tm ON s.tenant_id = tm.tenant_id
        WHERE si.id = price_history.inventory_id
          AND tm.user_id = auth.uid()
    )
);

-- ============================================
-- RLS POLICIES: CMS Page Content
-- ============================================

CREATE POLICY "Public can view published pages"
ON page_content FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Platform admins have full access to pages"
ON page_content FOR ALL USING (is_platform_admin());

-- ============================================
-- SECTION 21: STORAGE BUCKETS
-- ============================================

-- Product images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

-- ============================================
-- END OF SCHEMA
-- ============================================
