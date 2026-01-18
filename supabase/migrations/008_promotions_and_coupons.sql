-- ============================================
-- Migration: 008_promotions_and_coupons
-- Description: Promotions, bundles, coupons system
-- ============================================

-- ============================================
-- PROMOTIONS
-- ============================================

CREATE TABLE public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    type promotion_type NOT NULL,
    
    -- Configuration based on type
    config JSONB NOT NULL,
    -- Examples:
    -- percentage: {"discount_percentage": 20}
    -- fixed: {"discount_amount": 10}
    -- buy_x_get_y: {"buy_quantity": 2, "get_quantity": 1, "get_discount_percentage": 100}
    -- bundle: {"products": ["uuid1", "uuid2"], "bundle_price": 99.99}
    -- mix_match: {"min_items": 6, "discount_percentage": 10, "categories": ["wine"]}
    
    -- Eligible products (empty = all products)
    eligible_product_ids UUID[],
    eligible_categories TEXT[],
    
    -- Validity
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    
    -- Limits
    usage_limit INT, -- NULL = unlimited
    usage_count INT DEFAULT 0,
    per_customer_limit INT, -- NULL = unlimited
    
    -- Minimum requirements
    minimum_order_amount DECIMAL(10,2),
    minimum_quantity INT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track promotion usage per customer
CREATE TABLE public.promotion_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID, -- Will reference orders table
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(promotion_id, order_id)
);

-- ============================================
-- COUPONS
-- ============================================

CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE, -- NULL = global/platform coupon
    
    code TEXT NOT NULL,
    description TEXT,
    type coupon_type NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    
    -- Requirements
    minimum_order_amount DECIMAL(10,2),
    eligible_product_ids UUID[],
    eligible_categories TEXT[],
    
    -- Validity
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    
    -- Limits
    usage_limit INT, -- NULL = unlimited
    usage_count INT DEFAULT 0,
    per_customer_limit INT DEFAULT 1,
    
    -- Restrictions
    first_order_only BOOLEAN DEFAULT FALSE,
    new_customers_only BOOLEAN DEFAULT FALSE,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(code)
);

-- Track coupon usage
CREATE TABLE public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID, -- Will reference orders table
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(coupon_id, order_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_promotions_store ON promotions(store_id);
CREATE INDEX idx_promotions_type ON promotions(type);
CREATE INDEX idx_promotions_active ON promotions(is_active, start_date, end_date) 
    WHERE is_active = TRUE;
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);

CREATE INDEX idx_promotion_usage_promotion ON promotion_usage(promotion_id);
CREATE INDEX idx_promotion_usage_user ON promotion_usage(user_id);

CREATE INDEX idx_coupons_store ON coupons(store_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active, start_date, end_date) 
    WHERE is_active = TRUE;

CREATE INDEX idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON coupon_usage(user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Validate coupon
CREATE OR REPLACE FUNCTION validate_coupon(
    p_coupon_code TEXT,
    p_user_id UUID,
    p_store_id UUID DEFAULT NULL,
    p_order_total DECIMAL DEFAULT 0
)
RETURNS TABLE (
    is_valid BOOLEAN,
    coupon_id UUID,
    discount_type coupon_type,
    discount_value DECIMAL,
    error_message TEXT
) AS $$
DECLARE
    v_coupon coupons%ROWTYPE;
    v_user_usage_count INT;
    v_is_first_order BOOLEAN;
BEGIN
    -- Find coupon
    SELECT * INTO v_coupon FROM coupons 
    WHERE code = UPPER(p_coupon_code) 
    AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::coupon_type, NULL::DECIMAL, 'Coupon not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if coupon is for a specific store
    IF v_coupon.store_id IS NOT NULL AND v_coupon.store_id != p_store_id THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::coupon_type, NULL::DECIMAL, 'Coupon not valid for this store'::TEXT;
        RETURN;
    END IF;
    
    -- Check date validity
    IF v_coupon.start_date > NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::coupon_type, NULL::DECIMAL, 'Coupon not yet active'::TEXT;
        RETURN;
    END IF;
    
    IF v_coupon.end_date IS NOT NULL AND v_coupon.end_date < NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::coupon_type, NULL::DECIMAL, 'Coupon has expired'::TEXT;
        RETURN;
    END IF;
    
    -- Check overall usage limit
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::coupon_type, NULL::DECIMAL, 'Coupon usage limit reached'::TEXT;
        RETURN;
    END IF;
    
    -- Check per-customer limit
    SELECT COUNT(*) INTO v_user_usage_count 
    FROM coupon_usage 
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    
    IF v_coupon.per_customer_limit IS NOT NULL AND v_user_usage_count >= v_coupon.per_customer_limit THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::coupon_type, NULL::DECIMAL, 'You have already used this coupon'::TEXT;
        RETURN;
    END IF;
    
    -- Check minimum order amount
    IF v_coupon.minimum_order_amount IS NOT NULL AND p_order_total < v_coupon.minimum_order_amount THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::coupon_type, NULL::DECIMAL, 
            format('Minimum order amount of $%.2f required', v_coupon.minimum_order_amount)::TEXT;
        RETURN;
    END IF;
    
    -- Check first order only
    IF v_coupon.first_order_only THEN
        -- Would check orders table here
        -- For now, assume we have this function
        -- v_is_first_order := is_users_first_order(p_user_id);
        -- IF NOT v_is_first_order ... 
        NULL;
    END IF;
    
    -- Coupon is valid
    RETURN QUERY SELECT TRUE, v_coupon.id, v_coupon.type, v_coupon.value, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Get active promotions for a store
CREATE OR REPLACE FUNCTION get_active_promotions(p_store_id UUID)
RETURNS SETOF promotions AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM promotions
    WHERE store_id = p_store_id
    AND is_active = TRUE
    AND start_date <= NOW()
    AND (end_date IS NULL OR end_date >= NOW())
    AND (usage_limit IS NULL OR usage_count < usage_limit)
    ORDER BY type, name;
END;
$$ LANGUAGE plpgsql;
