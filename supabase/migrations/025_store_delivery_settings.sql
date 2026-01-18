-- ============================================
-- Migration: 025_store_delivery_settings
-- Description: Create store_delivery_settings table for delivery configuration
-- ============================================

-- ============================================
-- STORE DELIVERY SETTINGS
-- Separates delivery configuration from main stores table
-- ============================================

CREATE TABLE IF NOT EXISTS public.store_delivery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Delivery configuration
    is_delivery_enabled BOOLEAN DEFAULT TRUE,
    is_pickup_enabled BOOLEAN DEFAULT TRUE,

    -- Fees and minimums
    base_delivery_fee DECIMAL(10,2) DEFAULT 4.99,
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    free_delivery_threshold DECIMAL(10,2), -- NULL means no free delivery

    -- Delivery radius
    delivery_radius_miles DECIMAL(5,2) DEFAULT 10,

    -- Time estimates
    estimated_delivery_time TEXT DEFAULT '30-45 min',
    estimated_pickup_time TEXT DEFAULT '15-20 min',

    -- Advanced settings
    delivery_hours JSONB, -- Can override store hours for delivery
    auto_assign_delivery BOOLEAN DEFAULT FALSE,
    max_concurrent_deliveries INT DEFAULT 10,

    -- Surcharges
    peak_hours_surcharge DECIMAL(10,2) DEFAULT 0,
    distance_surcharge_per_mile DECIMAL(10,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(store_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_store_delivery_settings_store
ON store_delivery_settings(store_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_store_delivery_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_store_delivery_settings_updated_at ON store_delivery_settings;
CREATE TRIGGER update_store_delivery_settings_updated_at
    BEFORE UPDATE ON store_delivery_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_store_delivery_settings_updated_at();

-- ============================================
-- MIGRATE EXISTING DATA
-- Create delivery settings from existing stores.settings
-- ============================================

INSERT INTO store_delivery_settings (
    store_id,
    is_delivery_enabled,
    is_pickup_enabled,
    base_delivery_fee,
    minimum_order_amount,
    delivery_radius_miles,
    auto_assign_delivery
)
SELECT
    s.id,
    COALESCE((s.settings->>'accept_delivery')::boolean, true),
    COALESCE((s.settings->>'accept_pickup')::boolean, true),
    4.99,
    COALESCE((s.settings->>'minimum_order_amount')::decimal, 0),
    COALESCE((s.settings->>'delivery_radius_miles')::decimal, 10),
    COALESCE((s.settings->>'delivery_auto_assign')::boolean, false)
FROM stores s
WHERE NOT EXISTS (
    SELECT 1 FROM store_delivery_settings sds WHERE sds.store_id = s.id
)
ON CONFLICT (store_id) DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE store_delivery_settings ENABLE ROW LEVEL SECURITY;

-- Public can read delivery settings (needed for shopping)
CREATE POLICY "Anyone can view delivery settings"
    ON store_delivery_settings FOR SELECT
    USING (true);

-- Store owners/admins can update their delivery settings
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

-- Store owners can insert delivery settings
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

-- Platform admins have full access
CREATE POLICY "Platform admins full access to delivery settings"
    ON store_delivery_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM platform_admins
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE store_delivery_settings IS
'Delivery and pickup configuration for stores. Each store has one settings record.';

COMMENT ON COLUMN store_delivery_settings.free_delivery_threshold IS
'Order amount above which delivery is free. NULL means no free delivery option.';

COMMENT ON COLUMN store_delivery_settings.estimated_delivery_time IS
'Human-readable delivery time estimate shown to customers.';
