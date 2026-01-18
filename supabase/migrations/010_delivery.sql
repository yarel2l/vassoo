-- ============================================
-- Migration: 010_delivery
-- Description: Delivery companies, drivers, and deliveries
-- ============================================

-- ============================================
-- DELIVERY COMPANIES
-- ============================================

CREATE TABLE public.delivery_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    
    -- Contact
    email TEXT,
    phone TEXT,
    
    -- Configuration
    settings JSONB DEFAULT '{
        "auto_assign_enabled": true,
        "max_concurrent_deliveries_per_driver": 3,
        "base_delivery_fee": 5.99,
        "per_mile_fee": 0.50,
        "minimum_delivery_fee": 3.99,
        "maximum_delivery_distance_miles": 15,
        "estimated_pickup_time_minutes": 10
    }',
    
    -- Service areas (multiple polygons)
    service_areas GEOGRAPHY(MULTIPOLYGON, 4326),
    
    -- Working hours
    operating_hours JSONB DEFAULT '{
        "monday": {"open": "08:00", "close": "22:00", "is_open": true},
        "tuesday": {"open": "08:00", "close": "22:00", "is_open": true},
        "wednesday": {"open": "08:00", "close": "22:00", "is_open": true},
        "thursday": {"open": "08:00", "close": "22:00", "is_open": true},
        "friday": {"open": "08:00", "close": "23:00", "is_open": true},
        "saturday": {"open": "09:00", "close": "23:00", "is_open": true},
        "sunday": {"open": "10:00", "close": "21:00", "is_open": true}
    }',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ratings (denormalized)
    average_rating DECIMAL(2,1) DEFAULT 0,
    total_deliveries INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DELIVERY DRIVERS
-- ============================================

CREATE TABLE public.delivery_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_company_id UUID NOT NULL REFERENCES delivery_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Vehicle info
    vehicle_type TEXT, -- 'car', 'motorcycle', 'bicycle', 'scooter'
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    vehicle_plate TEXT,
    
    -- Documents
    drivers_license_number TEXT,
    drivers_license_expiry DATE,
    drivers_license_state CHAR(2),
    insurance_policy_number TEXT,
    insurance_expiry DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT FALSE,
    is_on_delivery BOOLEAN DEFAULT FALSE,
    
    -- Current location (real-time)
    current_location GEOGRAPHY(POINT, 4326),
    current_heading DECIMAL(5,2), -- Direction in degrees
    last_location_update TIMESTAMPTZ,
    
    -- Stats
    total_deliveries INT DEFAULT 0,
    average_rating DECIMAL(2,1) DEFAULT 0,
    total_distance_miles DECIMAL(10,2) DEFAULT 0,
    
    -- Contact (override from profile)
    phone TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(delivery_company_id, user_id)
);

-- ============================================
-- DELIVERIES
-- ============================================

CREATE TABLE public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    delivery_company_id UUID NOT NULL REFERENCES delivery_companies(id),
    driver_id UUID REFERENCES delivery_drivers(id),
    
    -- Status
    status delivery_status DEFAULT 'pending',
    
    -- Pickup location (store)
    pickup_location GEOGRAPHY(POINT, 4326),
    pickup_address JSONB,
    
    -- Dropoff location (customer)
    dropoff_location GEOGRAPHY(POINT, 4326),
    dropoff_address JSONB,
    
    -- Distance and fees
    distance_miles DECIMAL(6,2),
    delivery_fee DECIMAL(10,2),
    driver_earnings DECIMAL(10,2),
    platform_cut DECIMAL(10,2),
    tip_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Times
    estimated_pickup_time TIMESTAMPTZ,
    estimated_delivery_time TIMESTAMPTZ,
    actual_pickup_time TIMESTAMPTZ,
    actual_delivery_time TIMESTAMPTZ,
    
    -- Proof of delivery
    delivery_photo_url TEXT,
    recipient_signature_url TEXT,
    recipient_name TEXT,
    delivery_proof_type TEXT, -- 'photo', 'signature', 'code', 'none'
    
    -- Communication
    driver_notes TEXT,
    customer_notes TEXT,
    
    -- Rating (from customer)
    customer_rating INT CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    rated_at TIMESTAMPTZ,
    
    -- Assignment
    auto_assigned BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ,
    assignment_attempts INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(order_id)
);

-- ============================================
-- DELIVERY TRACKING (real-time location history)
-- ============================================

CREATE TABLE public.delivery_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    speed DECIMAL(5,2), -- mph
    heading DECIMAL(5,2), -- degrees
    accuracy DECIMAL(6,2), -- meters
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition tracking table by month for performance
-- (Note: In production, you'd want to set up proper partitioning)

-- ============================================
-- DELIVERY STATUS HISTORY
-- ============================================

CREATE TABLE public.delivery_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    status delivery_status NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    notes TEXT,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STORE-DELIVERY COMPANY PREFERENCES
-- ============================================

CREATE TABLE public.store_delivery_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    delivery_company_id UUID NOT NULL REFERENCES delivery_companies(id) ON DELETE CASCADE,
    
    -- Preferences
    priority INT DEFAULT 1, -- Order of preference (1 = highest)
    is_enabled BOOLEAN DEFAULT TRUE,
    
    -- Custom settings for this store
    custom_settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, delivery_company_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_delivery_companies_tenant ON delivery_companies(tenant_id);
CREATE INDEX idx_delivery_companies_slug ON delivery_companies(slug);
CREATE INDEX idx_delivery_companies_areas ON delivery_companies USING GIST (service_areas);
CREATE INDEX idx_delivery_companies_active ON delivery_companies(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_delivery_drivers_company ON delivery_drivers(delivery_company_id);
CREATE INDEX idx_delivery_drivers_user ON delivery_drivers(user_id);
CREATE INDEX idx_delivery_drivers_location ON delivery_drivers USING GIST (current_location);
CREATE INDEX idx_delivery_drivers_available ON delivery_drivers(delivery_company_id, is_available) 
    WHERE is_available = TRUE AND is_active = TRUE;

CREATE INDEX idx_deliveries_order ON deliveries(order_id);
CREATE INDEX idx_deliveries_company ON deliveries(delivery_company_id);
CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_created ON deliveries(created_at);

CREATE INDEX idx_delivery_tracking_delivery ON delivery_tracking(delivery_id);
CREATE INDEX idx_delivery_tracking_time ON delivery_tracking(recorded_at);

CREATE INDEX idx_store_delivery_prefs_store ON store_delivery_preferences(store_id);
CREATE INDEX idx_store_delivery_prefs_company ON store_delivery_preferences(delivery_company_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_delivery_companies_updated_at
    BEFORE UPDATE ON delivery_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_drivers_updated_at
    BEFORE UPDATE ON delivery_drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
    FOR EACH ROW
    EXECUTE FUNCTION track_delivery_status();

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
        
        -- Also update company stats
        UPDATE delivery_companies
        SET total_deliveries = total_deliveries + 1
        WHERE id = NEW.delivery_company_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_stats_on_delivery
    AFTER UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_stats();

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
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_rating();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

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

-- Find available drivers near a location
CREATE OR REPLACE FUNCTION find_available_drivers(
    p_delivery_company_id UUID,
    p_pickup_lat DOUBLE PRECISION,
    p_pickup_lng DOUBLE PRECISION,
    p_max_distance_miles DOUBLE PRECISION DEFAULT 5
)
RETURNS TABLE (
    driver_id UUID,
    driver_name TEXT,
    distance_miles DOUBLE PRECISION,
    current_deliveries INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dd.id,
        p.full_name,
        ST_Distance(
            dd.current_location::geography,
            ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::geography
        ) / 1609.34 AS distance,
        (SELECT COUNT(*) FROM deliveries 
         WHERE driver_id = dd.id 
         AND status IN ('assigned', 'picked_up', 'in_transit'))::INT
    FROM delivery_drivers dd
    JOIN profiles p ON p.id = dd.user_id
    WHERE dd.delivery_company_id = p_delivery_company_id
    AND dd.is_active = TRUE
    AND dd.is_available = TRUE
    AND dd.current_location IS NOT NULL
    AND ST_DWithin(
        dd.current_location::geography,
        ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)::geography,
        p_max_distance_miles * 1609.34
    )
    ORDER BY distance;
END;
$$ LANGUAGE plpgsql;

-- Auto-assign delivery to best available driver
CREATE OR REPLACE FUNCTION auto_assign_delivery(p_delivery_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_delivery deliveries%ROWTYPE;
    v_driver_id UUID;
    v_settings JSONB;
    v_max_concurrent INT;
BEGIN
    SELECT * INTO v_delivery FROM deliveries WHERE id = p_delivery_id;
    
    IF NOT FOUND OR v_delivery.status != 'pending' THEN
        RETURN FALSE;
    END IF;
    
    -- Get company settings
    SELECT settings INTO v_settings
    FROM delivery_companies WHERE id = v_delivery.delivery_company_id;
    
    v_max_concurrent := COALESCE(
        (v_settings->>'max_concurrent_deliveries_per_driver')::INT, 3
    );
    
    -- Find best available driver
    SELECT driver_id INTO v_driver_id
    FROM find_available_drivers(
        v_delivery.delivery_company_id,
        ST_Y(v_delivery.pickup_location::geometry),
        ST_X(v_delivery.pickup_location::geometry)
    ) fad
    WHERE fad.current_deliveries < v_max_concurrent
    LIMIT 1;
    
    IF v_driver_id IS NULL THEN
        -- No available driver
        UPDATE deliveries 
        SET assignment_attempts = assignment_attempts + 1
        WHERE id = p_delivery_id;
        RETURN FALSE;
    END IF;
    
    -- Assign driver
    UPDATE deliveries
    SET 
        driver_id = v_driver_id,
        status = 'assigned',
        auto_assigned = TRUE,
        assigned_at = NOW()
    WHERE id = p_delivery_id;
    
    -- Mark driver as on delivery
    UPDATE delivery_drivers
    SET is_on_delivery = TRUE
    WHERE id = v_driver_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
