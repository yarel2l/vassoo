-- ============================================
-- Migration: 031_store_delivery_settings
-- Description: Add delivery_settings column to stores table
-- ============================================

-- Add delivery_settings JSONB column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS delivery_settings JSONB DEFAULT '{
    "delivery_enabled": true,
    "pickup_enabled": true,
    "delivery_fee": 4.99,
    "free_delivery_threshold": 50,
    "minimum_order": 15,
    "delivery_radius_miles": 10,
    "estimated_delivery_minutes": 45
}'::jsonb;

-- Add business_hours JSONB column to stores table (also missing)
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "21:00", "is_open": true},
    "tuesday": {"open": "09:00", "close": "21:00", "is_open": true},
    "wednesday": {"open": "09:00", "close": "21:00", "is_open": true},
    "thursday": {"open": "09:00", "close": "21:00", "is_open": true},
    "friday": {"open": "09:00", "close": "22:00", "is_open": true},
    "saturday": {"open": "10:00", "close": "22:00", "is_open": true},
    "sunday": {"open": "10:00", "close": "20:00", "is_open": true}
}'::jsonb;

-- Create index for faster queries on delivery settings
CREATE INDEX IF NOT EXISTS idx_stores_delivery_enabled
ON stores ((delivery_settings->>'delivery_enabled'));

-- Comment on the columns
COMMENT ON COLUMN stores.delivery_settings IS 'Store delivery configuration including fees, radius, and thresholds';
COMMENT ON COLUMN stores.business_hours IS 'Store operating hours by day of week';

-- Function to get store delivery fee
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

-- Function to check if order qualifies for free delivery
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

    -- If threshold is 0 or null, free delivery is not offered
    IF v_threshold <= 0 THEN
        RETURN FALSE;
    END IF;

    RETURN p_order_subtotal >= v_threshold;
END;
$$;

-- Function to get effective delivery fee (considering free delivery threshold)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_store_delivery_fee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_delivery_fee(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_free_delivery(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION check_free_delivery(UUID, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION get_effective_delivery_fee(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_delivery_fee(UUID, DECIMAL) TO service_role;
