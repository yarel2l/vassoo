-- ============================================
-- Migration: 004_stores
-- Description: Stores, locations, employees for owner_store tenants
-- ============================================

-- ============================================
-- STORES
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
    
    -- Ratings (denormalized for performance)
    average_rating DECIMAL(2,1) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STORE LOCATIONS (Multi-location support)
-- ============================================

CREATE TABLE public.store_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Address
    name TEXT NOT NULL, -- "Main Store", "Downtown Branch"
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    county TEXT,
    state CHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    country TEXT DEFAULT 'US',
    
    -- Geolocation
    coordinates GEOGRAPHY(POINT, 4326) NOT NULL,
    coverage_area GEOGRAPHY(POLYGON, 4326), -- Delivery area polygon
    coverage_radius_miles DECIMAL(5,2) DEFAULT 10,
    
    -- Business hours (JSON structure)
    business_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "21:00", "is_open": true},
        "tuesday": {"open": "09:00", "close": "21:00", "is_open": true},
        "wednesday": {"open": "09:00", "close": "21:00", "is_open": true},
        "thursday": {"open": "09:00", "close": "21:00", "is_open": true},
        "friday": {"open": "09:00", "close": "22:00", "is_open": true},
        "saturday": {"open": "10:00", "close": "22:00", "is_open": true},
        "sunday": {"open": "12:00", "close": "18:00", "is_open": true}
    }',
    
    -- Timezone
    timezone TEXT DEFAULT 'America/New_York',
    
    -- Options
    is_pickup_available BOOLEAN DEFAULT TRUE,
    is_delivery_available BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STORE EMPLOYEES
-- ============================================

CREATE TABLE public.store_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Role within store
    position TEXT NOT NULL, -- "Cashier", "Inventory Manager", etc.
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Work schedule
    work_schedule JSONB,
    hourly_rate DECIMAL(10,2),
    
    -- Dates
    hired_at DATE DEFAULT CURRENT_DATE,
    terminated_at DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, user_id)
);

-- ============================================
-- STORE SPECIAL HOURS (holidays, closures)
-- ============================================

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

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_stores_tenant ON stores(tenant_id);
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_active ON stores(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_stores_featured ON stores(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_stores_name ON stores USING GIN (to_tsvector('english', name));

CREATE INDEX idx_store_locations_store ON store_locations(store_id);
CREATE INDEX idx_store_locations_coordinates ON store_locations USING GIST (coordinates);
CREATE INDEX idx_store_locations_coverage ON store_locations USING GIST (coverage_area);
CREATE INDEX idx_store_locations_state ON store_locations(state);
CREATE INDEX idx_store_locations_active ON store_locations(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_store_employees_store ON store_employees(store_id);
CREATE INDEX idx_store_employees_user ON store_employees(user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_locations_updated_at
    BEFORE UPDATE ON store_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_employees_updated_at
    BEFORE UPDATE ON store_employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if store is currently open
CREATE OR REPLACE FUNCTION is_store_location_open(p_location_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_location store_locations%ROWTYPE;
    v_day_name TEXT;
    v_current_time TIME;
    v_hours JSONB;
    v_special store_special_hours%ROWTYPE;
BEGIN
    SELECT * INTO v_location FROM store_locations WHERE id = p_location_id;
    
    IF NOT FOUND OR NOT v_location.is_active THEN
        RETURN FALSE;
    END IF;
    
    -- Check for special hours today
    SELECT * INTO v_special 
    FROM store_special_hours 
    WHERE store_location_id = p_location_id 
    AND date = CURRENT_DATE;
    
    IF FOUND THEN
        IF v_special.is_closed THEN
            RETURN FALSE;
        END IF;
        v_current_time := CURRENT_TIME AT TIME ZONE v_location.timezone;
        RETURN v_current_time BETWEEN v_special.open_time AND v_special.close_time;
    END IF;
    
    -- Check regular hours
    v_day_name := LOWER(TO_CHAR(CURRENT_DATE, 'day'));
    v_day_name := TRIM(v_day_name);
    v_hours := v_location.business_hours->v_day_name;
    
    IF v_hours IS NULL OR NOT (v_hours->>'is_open')::boolean THEN
        RETURN FALSE;
    END IF;
    
    v_current_time := CURRENT_TIME AT TIME ZONE v_location.timezone;
    RETURN v_current_time BETWEEN (v_hours->>'open')::TIME AND (v_hours->>'close')::TIME;
END;
$$ LANGUAGE plpgsql;

-- Get stores near a point
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
