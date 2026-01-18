-- ============================================
-- Migration: 032_location_selection_functions
-- Description: Functions for optimal location selection based on proximity and availability
-- ============================================

-- ============================================
-- FUNCTION: Get nearest location with stock for a product
-- Used when adding items to cart to determine which location will fulfill the order
-- ============================================

CREATE OR REPLACE FUNCTION get_nearest_location_with_stock(
    p_store_id UUID,
    p_product_id UUID,
    p_customer_lat DOUBLE PRECISION,
    p_customer_lng DOUBLE PRECISION,
    p_fulfillment_type TEXT DEFAULT 'delivery'  -- 'delivery' or 'pickup'
) RETURNS TABLE (
    location_id UUID,
    location_name TEXT,
    address_line1 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    distance_miles DOUBLE PRECISION,
    quantity INT,
    inventory_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.id as location_id,
        sl.name as location_name,
        sl.address_line1,
        sl.city,
        sl.state,
        sl.zip_code,
        CASE 
            WHEN sl.coordinates IS NOT NULL AND p_customer_lat IS NOT NULL AND p_customer_lng IS NOT NULL THEN
                ST_Distance(
                    sl.coordinates::geography,
                    ST_SetSRID(ST_MakePoint(p_customer_lng, p_customer_lat), 4326)::geography
                ) / 1609.34  -- Convert meters to miles
            ELSE 
                999999.0  -- Large number if no coordinates
        END as distance_miles,
        si.quantity,
        si.id as inventory_id
    FROM store_locations sl
    JOIN store_inventories si ON si.store_location_id = sl.id
    WHERE sl.store_id = p_store_id
      AND si.product_id = p_product_id
      AND si.quantity > 0
      AND si.is_available = true
      AND sl.is_active = true
      -- Check service availability based on fulfillment type
      AND (
          (p_fulfillment_type = 'delivery' AND sl.is_delivery_available = true)
          OR (p_fulfillment_type = 'pickup' AND sl.is_pickup_available = true)
          OR p_fulfillment_type IS NULL
      )
      -- Check if customer is within coverage radius (only for delivery)
      AND (
          p_fulfillment_type != 'delivery'
          OR p_customer_lat IS NULL
          OR p_customer_lng IS NULL
          OR sl.coordinates IS NULL
          OR sl.coverage_radius_miles IS NULL
          OR ST_DWithin(
              sl.coordinates::geography,
              ST_SetSRID(ST_MakePoint(p_customer_lng, p_customer_lat), 4326)::geography,
              sl.coverage_radius_miles * 1609.34  -- Convert miles to meters
          )
      )
    ORDER BY distance_miles ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get all available locations for a product with distances
-- Used to show customer which locations have the product available
-- ============================================

CREATE OR REPLACE FUNCTION get_available_locations_for_product(
    p_store_id UUID,
    p_product_id UUID,
    p_customer_lat DOUBLE PRECISION DEFAULT NULL,
    p_customer_lng DOUBLE PRECISION DEFAULT NULL
) RETURNS TABLE (
    location_id UUID,
    location_name TEXT,
    address_line1 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    distance_miles DOUBLE PRECISION,
    quantity INT,
    inventory_id UUID,
    price DECIMAL(10,2),
    is_delivery_available BOOLEAN,
    is_pickup_available BOOLEAN,
    coverage_radius_miles DECIMAL(5,2),
    is_within_delivery_range BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sl.id as location_id,
        sl.name as location_name,
        sl.address_line1,
        sl.city,
        sl.state,
        sl.zip_code,
        CASE 
            WHEN sl.coordinates IS NOT NULL AND p_customer_lat IS NOT NULL AND p_customer_lng IS NOT NULL THEN
                ST_Distance(
                    sl.coordinates::geography,
                    ST_SetSRID(ST_MakePoint(p_customer_lng, p_customer_lat), 4326)::geography
                ) / 1609.34
            ELSE 
                NULL
        END as distance_miles,
        si.quantity,
        si.id as inventory_id,
        si.price,
        sl.is_delivery_available,
        sl.is_pickup_available,
        sl.coverage_radius_miles,
        CASE 
            WHEN sl.coordinates IS NOT NULL 
                 AND p_customer_lat IS NOT NULL 
                 AND p_customer_lng IS NOT NULL 
                 AND sl.coverage_radius_miles IS NOT NULL THEN
                ST_DWithin(
                    sl.coordinates::geography,
                    ST_SetSRID(ST_MakePoint(p_customer_lng, p_customer_lat), 4326)::geography,
                    sl.coverage_radius_miles * 1609.34
                )
            ELSE 
                true  -- If we can't calculate, assume within range
        END as is_within_delivery_range
    FROM store_locations sl
    JOIN store_inventories si ON si.store_location_id = sl.id
    WHERE sl.store_id = p_store_id
      AND si.product_id = p_product_id
      AND si.quantity > 0
      AND si.is_available = true
      AND sl.is_active = true
    ORDER BY 
        CASE 
            WHEN sl.coordinates IS NOT NULL AND p_customer_lat IS NOT NULL AND p_customer_lng IS NOT NULL THEN
                ST_Distance(
                    sl.coordinates::geography,
                    ST_SetSRID(ST_MakePoint(p_customer_lng, p_customer_lat), 4326)::geography
                )
            ELSE 
                999999.0
        END ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get location for order fulfillment
-- Fallback function when location_id is not specified
-- ============================================

CREATE OR REPLACE FUNCTION get_fulfillment_location(
    p_store_id UUID,
    p_product_ids UUID[],
    p_customer_lat DOUBLE PRECISION DEFAULT NULL,
    p_customer_lng DOUBLE PRECISION DEFAULT NULL,
    p_fulfillment_type TEXT DEFAULT 'delivery'
) RETURNS UUID AS $$
DECLARE
    v_location_id UUID;
BEGIN
    -- Find the location that:
    -- 1. Has ALL requested products in stock
    -- 2. Offers the requested fulfillment type
    -- 3. Is closest to the customer
    SELECT sl.id INTO v_location_id
    FROM store_locations sl
    WHERE sl.store_id = p_store_id
      AND sl.is_active = true
      AND (
          (p_fulfillment_type = 'delivery' AND sl.is_delivery_available = true)
          OR (p_fulfillment_type = 'pickup' AND sl.is_pickup_available = true)
          OR p_fulfillment_type IS NULL
      )
      -- Check that location has all products
      AND NOT EXISTS (
          SELECT 1 
          FROM unnest(p_product_ids) AS pid
          WHERE NOT EXISTS (
              SELECT 1 
              FROM store_inventories si
              WHERE si.store_location_id = sl.id
                AND si.product_id = pid
                AND si.quantity > 0
                AND si.is_available = true
          )
      )
      -- Check delivery range if applicable
      AND (
          p_fulfillment_type != 'delivery'
          OR p_customer_lat IS NULL
          OR p_customer_lng IS NULL
          OR sl.coordinates IS NULL
          OR sl.coverage_radius_miles IS NULL
          OR ST_DWithin(
              sl.coordinates::geography,
              ST_SetSRID(ST_MakePoint(p_customer_lng, p_customer_lat), 4326)::geography,
              sl.coverage_radius_miles * 1609.34
          )
      )
    ORDER BY 
        CASE 
            WHEN sl.coordinates IS NOT NULL AND p_customer_lat IS NOT NULL AND p_customer_lng IS NOT NULL THEN
                ST_Distance(
                    sl.coordinates::geography,
                    ST_SetSRID(ST_MakePoint(p_customer_lng, p_customer_lat), 4326)::geography
                )
            ELSE 
                -- If no customer location, prefer primary location
                CASE WHEN sl.is_primary THEN 0 ELSE 999999 END
        END ASC
    LIMIT 1;

    -- If no location found with all products, fall back to primary location
    IF v_location_id IS NULL THEN
        SELECT id INTO v_location_id
        FROM store_locations
        WHERE store_id = p_store_id
          AND is_primary = true
          AND is_active = true
        LIMIT 1;
    END IF;

    -- If still no location, get any active location
    IF v_location_id IS NULL THEN
        SELECT id INTO v_location_id
        FROM store_locations
        WHERE store_id = p_store_id
          AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    RETURN v_location_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION get_nearest_location_with_stock TO authenticated;
GRANT EXECUTE ON FUNCTION get_nearest_location_with_stock TO anon;
GRANT EXECUTE ON FUNCTION get_available_locations_for_product TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_locations_for_product TO anon;
GRANT EXECUTE ON FUNCTION get_fulfillment_location TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION get_nearest_location_with_stock IS 
'Returns the nearest store location that has a specific product in stock and offers the requested fulfillment type (delivery/pickup). Used when adding items to cart.';

COMMENT ON FUNCTION get_available_locations_for_product IS 
'Returns all locations that have a specific product available, with distance calculations. Used to show product availability across locations.';

COMMENT ON FUNCTION get_fulfillment_location IS 
'Returns the optimal location to fulfill an order containing multiple products. Considers stock availability, fulfillment type, and proximity.';
