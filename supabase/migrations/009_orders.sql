-- ============================================
-- Migration: 009_orders
-- Description: Orders and order items
-- ============================================

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    
    -- References
    customer_id UUID NOT NULL REFERENCES profiles(id),
    store_id UUID NOT NULL REFERENCES stores(id),
    store_location_id UUID REFERENCES store_locations(id),
    
    -- Status
    status order_status DEFAULT 'pending',
    fulfillment_type fulfillment_type NOT NULL,
    
    -- Delivery address (only for delivery)
    delivery_address JSONB,
    delivery_coordinates GEOGRAPHY(POINT, 4326),
    
    -- Totals
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    platform_fee DECIMAL(10,2) DEFAULT 0, -- Fee charged to store
    total DECIMAL(10,2) NOT NULL,
    
    -- Tax breakdown
    tax_breakdown JSONB,
    -- Example: [{"name": "State Tax", "rate": 0.0625, "amount": 5.00}, ...]
    
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
    stripe_transfer_id TEXT, -- Transfer to store's Stripe account
    
    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,
    
    -- Scheduled delivery/pickup
    scheduled_for TIMESTAMPTZ,
    
    -- Timestamps
    confirmed_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER ITEMS
-- ============================================

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES store_inventories(id),
    product_id UUID NOT NULL REFERENCES master_products(id),
    
    -- Snapshot of product at time of purchase
    product_name TEXT NOT NULL,
    product_image TEXT,
    product_sku TEXT,
    
    -- Quantities and prices
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    
    -- Promotion applied to this item
    promotion_id UUID REFERENCES promotions(id),
    
    -- Special instructions
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER STATUS HISTORY
-- ============================================

CREATE TABLE public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status order_status NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PICKUP SLOTS
-- ============================================

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

-- ============================================
-- STORE REVIEWS
-- ============================================

CREATE TABLE public.store_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    -- Store response
    store_response TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES profiles(id),
    
    -- Moderation
    is_visible BOOLEAN DEFAULT TRUE,
    reported_at TIMESTAMPTZ,
    report_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(order_id)
);

-- ============================================
-- INDEXES
-- ============================================

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

CREATE INDEX idx_pickup_slots_location ON pickup_slots(store_location_id);
CREATE INDEX idx_pickup_slots_date ON pickup_slots(slot_date);

CREATE INDEX idx_store_reviews_store ON store_reviews(store_id);
CREATE INDEX idx_store_reviews_user ON store_reviews(user_id);
CREATE INDEX idx_store_reviews_rating ON store_reviews(store_id, rating);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Track status changes
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
    FOR EACH ROW
    EXECUTE FUNCTION track_order_status();

-- Insert initial status
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
    FOR EACH ROW
    EXECUTE FUNCTION track_initial_order_status();

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
    FOR EACH ROW
    EXECUTE FUNCTION update_store_rating();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT := 'VS';
    v_date TEXT := TO_CHAR(CURRENT_DATE, 'YYMMDD');
    v_seq INT;
BEGIN
    -- Get next sequence for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INT)), 0) + 1
    INTO v_seq
    FROM orders
    WHERE order_number LIKE v_prefix || v_date || '%';
    
    RETURN v_prefix || v_date || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Get order summary
CREATE OR REPLACE FUNCTION get_order_summary(p_order_id UUID)
RETURNS TABLE (
    order_id UUID,
    order_number TEXT,
    status order_status,
    store_name TEXT,
    item_count BIGINT,
    total DECIMAL,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.order_number,
        o.status,
        s.name,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id),
        o.total,
        o.created_at
    FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Check if it's user's first order (for coupon validation)
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
