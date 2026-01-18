-- ============================================
-- Migration: 034_update_driver_location_function
-- Description: Add RPC function to update driver location with proper PostGIS format
-- ============================================

-- Create function to update driver location
-- This handles the geography conversion properly
CREATE OR REPLACE FUNCTION update_driver_location(
    p_user_id UUID,
    p_longitude DOUBLE PRECISION,
    p_latitude DOUBLE PRECISION,
    p_heading DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_driver_id UUID;
    v_result JSONB;
BEGIN
    -- Get driver id from user_id
    SELECT id INTO v_driver_id
    FROM delivery_drivers
    WHERE user_id = p_user_id;
    
    IF v_driver_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Driver not found for user'
        );
    END IF;
    
    -- Update the driver's location using ST_SetSRID and ST_MakePoint
    UPDATE delivery_drivers
    SET 
        current_location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        current_heading = p_heading,
        last_location_update = NOW(),
        updated_at = NOW()
    WHERE id = v_driver_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'driver_id', v_driver_id,
        'location', jsonb_build_object(
            'longitude', p_longitude,
            'latitude', p_latitude
        )
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_driver_location TO authenticated;

-- Comment
COMMENT ON FUNCTION update_driver_location IS 'Updates driver location using proper PostGIS geography format';
