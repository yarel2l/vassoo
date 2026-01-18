-- ============================================
-- Migration: 005_us_jurisdictions
-- Description: US States, Counties, Cities, Zip Codes for taxes and fees
-- ============================================

-- ============================================
-- US STATES (50 + DC)
-- ============================================

CREATE TABLE public.us_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    fips_code CHAR(2) UNIQUE NOT NULL,  -- "06" = California
    usps_code CHAR(2) UNIQUE NOT NULL,  -- "CA"
    name TEXT NOT NULL,                  -- "California"
    
    -- State-specific configuration
    alcohol_sale_allowed BOOLEAN DEFAULT TRUE,
    min_drinking_age INT DEFAULT 21,
    requires_state_license BOOLEAN DEFAULT TRUE,
    
    -- Primary timezone
    timezone TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- US COUNTIES (~3,200 counties)
-- ============================================

CREATE TABLE public.us_counties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    state_id UUID NOT NULL REFERENCES us_states(id) ON DELETE CASCADE,
    fips_code CHAR(5) UNIQUE NOT NULL,  -- "06037" = Los Angeles County, CA
    name TEXT NOT NULL,                  -- "Los Angeles"
    
    -- Geometry for matching (optional, can be populated later)
    boundary GEOGRAPHY(MULTIPOLYGON, 4326),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- US CITIES/PLACES
-- ============================================

CREATE TABLE public.us_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    county_id UUID NOT NULL REFERENCES us_counties(id) ON DELETE CASCADE,
    state_id UUID NOT NULL REFERENCES us_states(id) ON DELETE CASCADE,
    
    fips_place_code TEXT,               -- Census place code
    name TEXT NOT NULL,                  -- "Los Angeles"
    
    -- Geometry
    boundary GEOGRAPHY(MULTIPOLYGON, 4326),
    
    -- Population (for relevance)
    population INT,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(state_id, name)
);

-- ============================================
-- US ZIP CODES
-- ============================================

CREATE TABLE public.us_zip_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    zip_code CHAR(5) UNIQUE NOT NULL,
    zip_code_full TEXT,                  -- "90210-1234" (if applicable)
    
    -- References
    city_id UUID REFERENCES us_cities(id),
    county_id UUID NOT NULL REFERENCES us_counties(id),
    state_id UUID NOT NULL REFERENCES us_states(id),
    
    -- Center of zip code
    coordinates GEOGRAPHY(POINT, 4326),
    
    -- Approximate area
    boundary GEOGRAPHY(POLYGON, 4326),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

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

-- ============================================
-- SEED DATA: US STATES (50 + DC)
-- ============================================

INSERT INTO us_states (fips_code, usps_code, name, timezone) VALUES
('01', 'AL', 'Alabama', 'America/Chicago'),
('02', 'AK', 'Alaska', 'America/Anchorage'),
('04', 'AZ', 'Arizona', 'America/Phoenix'),
('05', 'AR', 'Arkansas', 'America/Chicago'),
('06', 'CA', 'California', 'America/Los_Angeles'),
('08', 'CO', 'Colorado', 'America/Denver'),
('09', 'CT', 'Connecticut', 'America/New_York'),
('10', 'DE', 'Delaware', 'America/New_York'),
('11', 'DC', 'District of Columbia', 'America/New_York'),
('12', 'FL', 'Florida', 'America/New_York'),
('13', 'GA', 'Georgia', 'America/New_York'),
('15', 'HI', 'Hawaii', 'Pacific/Honolulu'),
('16', 'ID', 'Idaho', 'America/Boise'),
('17', 'IL', 'Illinois', 'America/Chicago'),
('18', 'IN', 'Indiana', 'America/Indiana/Indianapolis'),
('19', 'IA', 'Iowa', 'America/Chicago'),
('20', 'KS', 'Kansas', 'America/Chicago'),
('21', 'KY', 'Kentucky', 'America/New_York'),
('22', 'LA', 'Louisiana', 'America/Chicago'),
('23', 'ME', 'Maine', 'America/New_York'),
('24', 'MD', 'Maryland', 'America/New_York'),
('25', 'MA', 'Massachusetts', 'America/New_York'),
('26', 'MI', 'Michigan', 'America/Detroit'),
('27', 'MN', 'Minnesota', 'America/Chicago'),
('28', 'MS', 'Mississippi', 'America/Chicago'),
('29', 'MO', 'Missouri', 'America/Chicago'),
('30', 'MT', 'Montana', 'America/Denver'),
('31', 'NE', 'Nebraska', 'America/Chicago'),
('32', 'NV', 'Nevada', 'America/Los_Angeles'),
('33', 'NH', 'New Hampshire', 'America/New_York'),
('34', 'NJ', 'New Jersey', 'America/New_York'),
('35', 'NM', 'New Mexico', 'America/Denver'),
('36', 'NY', 'New York', 'America/New_York'),
('37', 'NC', 'North Carolina', 'America/New_York'),
('38', 'ND', 'North Dakota', 'America/Chicago'),
('39', 'OH', 'Ohio', 'America/New_York'),
('40', 'OK', 'Oklahoma', 'America/Chicago'),
('41', 'OR', 'Oregon', 'America/Los_Angeles'),
('42', 'PA', 'Pennsylvania', 'America/New_York'),
('44', 'RI', 'Rhode Island', 'America/New_York'),
('45', 'SC', 'South Carolina', 'America/New_York'),
('46', 'SD', 'South Dakota', 'America/Chicago'),
('47', 'TN', 'Tennessee', 'America/Chicago'),
('48', 'TX', 'Texas', 'America/Chicago'),
('49', 'UT', 'Utah', 'America/Denver'),
('50', 'VT', 'Vermont', 'America/New_York'),
('51', 'VA', 'Virginia', 'America/New_York'),
('53', 'WA', 'Washington', 'America/Los_Angeles'),
('54', 'WV', 'West Virginia', 'America/New_York'),
('55', 'WI', 'Wisconsin', 'America/Chicago'),
('56', 'WY', 'Wyoming', 'America/Denver');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get jurisdiction info from coordinates
CREATE OR REPLACE FUNCTION get_jurisdiction_from_point(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION
)
RETURNS TABLE (
    state_id UUID,
    state_code CHAR(2),
    state_name TEXT,
    county_id UUID,
    county_name TEXT,
    city_id UUID,
    city_name TEXT
) AS $$
BEGIN
    -- This is a simplified version; in production you might use
    -- a geocoding service or pre-populated boundary data
    RETURN QUERY
    SELECT 
        c.state_id,
        s.usps_code,
        s.name,
        c.id,
        c.name,
        ci.id,
        ci.name
    FROM us_counties c
    JOIN us_states s ON s.id = c.state_id
    LEFT JOIN us_cities ci ON ci.county_id = c.id
    WHERE c.boundary IS NOT NULL
    AND ST_Contains(
        c.boundary::geometry,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
