-- ============================================
-- Migration: 006_taxes_and_fees
-- Description: Tax rates and platform fees by jurisdiction
-- ============================================

-- ============================================
-- TAX RATES (by state, county, city)
-- ============================================

CREATE TABLE public.tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Jurisdiction scope (only one should be populated based on scope)
    scope tax_scope NOT NULL,
    state_id UUID REFERENCES us_states(id) ON DELETE CASCADE,
    county_id UUID REFERENCES us_counties(id) ON DELETE CASCADE,
    city_id UUID REFERENCES us_cities(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL, -- "State Sales Tax", "County Alcohol Tax", etc.
    rate DECIMAL(5,4) NOT NULL, -- 0.0825 = 8.25%
    
    -- Tax type
    tax_type TEXT DEFAULT 'sales', -- 'sales', 'alcohol', 'excise'
    
    -- Applicability
    applies_to TEXT DEFAULT 'all', -- 'all', 'alcohol', 'specific_categories'
    categories TEXT[],
    
    -- Validity
    effective_date DATE NOT NULL,
    end_date DATE,
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validate that only one jurisdiction is populated based on scope
    CONSTRAINT valid_tax_jurisdiction CHECK (
        (scope = 'state' AND state_id IS NOT NULL AND county_id IS NULL AND city_id IS NULL) OR
        (scope = 'county' AND county_id IS NOT NULL AND city_id IS NULL) OR
        (scope = 'city' AND city_id IS NOT NULL)
    )
);

-- ============================================
-- PLATFORM FEES (global or by state)
-- ============================================

CREATE TABLE public.platform_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Jurisdiction scope (NULL = global)
    scope fee_scope DEFAULT 'global',
    state_id UUID REFERENCES us_states(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    
    -- Fee type
    fee_type TEXT NOT NULL, -- 'marketplace_commission', 'processing_fee', 'delivery_platform_fee'
    
    -- Value
    calculation_type TEXT NOT NULL, -- 'percentage', 'fixed', 'tiered'
    value DECIMAL(10,4) NOT NULL, -- Percentage (0.10 = 10%) or fixed amount
    
    -- For tiered fees
    tiers JSONB,
    -- Example: [{"min": 0, "max": 100, "rate": 0.15}, {"min": 100, "max": null, "rate": 0.10}]
    
    -- Validity
    effective_date DATE NOT NULL,
    end_date DATE,
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validate scope
    CONSTRAINT valid_fee_scope CHECK (
        (scope = 'global' AND state_id IS NULL) OR
        (scope = 'state' AND state_id IS NOT NULL)
    )
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_tax_rates_state ON tax_rates(state_id);
CREATE INDEX idx_tax_rates_county ON tax_rates(county_id);
CREATE INDEX idx_tax_rates_city ON tax_rates(city_id);
CREATE INDEX idx_tax_rates_active ON tax_rates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_tax_rates_type ON tax_rates(tax_type);

CREATE INDEX idx_platform_fees_state ON platform_fees(state_id);
CREATE INDEX idx_platform_fees_type ON platform_fees(fee_type);
CREATE INDEX idx_platform_fees_active ON platform_fees(is_active) WHERE is_active = TRUE;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_tax_rates_updated_at
    BEFORE UPDATE ON tax_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_fees_updated_at
    BEFORE UPDATE ON platform_fees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

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
    -- Sum up all applicable tax rates
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

-- Get platform fee for order
CREATE OR REPLACE FUNCTION get_platform_fee(
    p_state_id UUID DEFAULT NULL,
    p_fee_type TEXT DEFAULT 'marketplace_commission'
)
RETURNS TABLE (
    fee_id UUID,
    calculation_type TEXT,
    value DECIMAL,
    tiers JSONB
) AS $$
BEGIN
    -- Try state-specific fee first, then fall back to global
    RETURN QUERY
    SELECT 
        pf.id,
        pf.calculation_type,
        pf.value,
        pf.tiers
    FROM platform_fees pf
    WHERE pf.is_active = TRUE
    AND pf.fee_type = p_fee_type
    AND (pf.end_date IS NULL OR pf.end_date > CURRENT_DATE)
    AND pf.effective_date <= CURRENT_DATE
    AND (
        (pf.scope = 'state' AND pf.state_id = p_state_id) OR
        (pf.scope = 'global' AND NOT EXISTS (
            SELECT 1 FROM platform_fees pf2 
            WHERE pf2.scope = 'state' 
            AND pf2.state_id = p_state_id 
            AND pf2.fee_type = p_fee_type
            AND pf2.is_active = TRUE
        ))
    )
    ORDER BY pf.scope DESC -- Prefer state-specific
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED: Default Platform Fees
-- ============================================

INSERT INTO platform_fees (scope, name, fee_type, calculation_type, value, effective_date) VALUES
('global', 'Marketplace Commission', 'marketplace_commission', 'percentage', 0.10, CURRENT_DATE),
('global', 'Payment Processing Fee', 'processing_fee', 'percentage', 0.029, CURRENT_DATE),
('global', 'Delivery Platform Fee', 'delivery_platform_fee', 'percentage', 0.05, CURRENT_DATE);
