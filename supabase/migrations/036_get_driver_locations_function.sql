-- ============================================
-- Migration: 036_get_driver_locations_function
-- Description: RPC function to get driver locations with parsed coordinates
-- ============================================

-- Create function to get driver locations with coordinates
CREATE OR REPLACE FUNCTION get_driver_locations(driver_ids UUID[])
RETURNS TABLE (
    id UUID,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dd.id,
        ST_Y(dd.current_location::geometry) as lat,
        ST_X(dd.current_location::geometry) as lng
    FROM delivery_drivers dd
    WHERE dd.id = ANY(driver_ids)
    AND dd.current_location IS NOT NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_driver_locations TO authenticated;

COMMENT ON FUNCTION get_driver_locations IS 'Returns driver locations with parsed lat/lng coordinates from PostGIS geography';
