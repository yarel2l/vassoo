-- ============================================
-- Migration: 014_delivery_jurisdictions
-- Description: Table for delivery company service areas (jurisdictions)
-- ============================================

CREATE TABLE public.delivery_company_jurisdictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_company_id UUID NOT NULL REFERENCES delivery_companies(id) ON DELETE CASCADE,
    
    -- Geographical scope
    state_code CHAR(2) NOT NULL, -- e.g. 'FL'
    county_name TEXT,            -- e.g. 'Miami-Dade' (NULL = entire state)
    city_name TEXT,              -- e.g. 'Miami' (NULL = entire county/state)
    fips_code TEXT,              -- Census FIPS code for precise mapping
    
    -- Specific settings for this area
    delivery_fee_base DECIMAL(10,2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Avoid duplicates for the same area
    UNIQUE(delivery_company_id, state_code, county_name, city_name)
);

-- Enable RLS
ALTER TABLE delivery_company_jurisdictions ENABLE ROW LEVEL SECURITY;

-- Policies
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
ON delivery_company_jurisdictions FOR SELECT
USING (is_active = TRUE);

-- Update trigger
CREATE TRIGGER update_delivery_company_jurisdictions_updated_at
    BEFORE UPDATE ON delivery_company_jurisdictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
