-- Migration: Improved auto-assignment algorithm
-- This migration improves the driver auto-assignment algorithm considering:
-- 1. Driver workload (current active deliveries)
-- 2. Driver proximity to pickup location
-- 3. Driver performance metrics (completion rate, avg delivery time)
-- 4. Driver availability window
-- 5. Weighted scoring system

-- Add performance tracking columns to drivers
ALTER TABLE delivery_drivers 
ADD COLUMN IF NOT EXISTS completed_deliveries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_deliveries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_delivery_time_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS performance_score DECIMAL(3,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS last_assignment_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS preferred_zones TEXT[];

-- Create function to calculate driver score for assignment
CREATE OR REPLACE FUNCTION calculate_driver_assignment_score(
    p_driver_id UUID,
    p_pickup_lat DOUBLE PRECISION,
    p_pickup_lng DOUBLE PRECISION,
    p_delivery_lat DOUBLE PRECISION,
    p_delivery_lng DOUBLE PRECISION
)
RETURNS DECIMAL AS $$
DECLARE
    v_driver delivery_drivers%ROWTYPE;
    v_distance_to_pickup DECIMAL;
    v_current_deliveries INT;
    v_completion_rate DECIMAL;
    v_time_since_last_assignment INTERVAL;
    v_score DECIMAL := 0;
    
    -- Weighting factors (customizable)
    w_proximity DECIMAL := 0.35;
    w_workload DECIMAL := 0.25;
    w_performance DECIMAL := 0.25;
    w_fairness DECIMAL := 0.15;
BEGIN
    SELECT * INTO v_driver FROM delivery_drivers WHERE id = p_driver_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- 1. Proximity Score (0-100)
    -- Calculate distance from driver's current location to pickup
    IF v_driver.current_location IS NOT NULL THEN
        v_distance_to_pickup := ST_Distance(
            v_driver.current_location::geometry,
            ST_SetSRID(ST_MakePoint(p_pickup_lng, p_pickup_lat), 4326)
        ) * 111000; -- Convert to approximate meters
        
        -- Score: 100 for 0km, decreasing logarithmically
        v_score := v_score + (
            w_proximity * GREATEST(0, 100 - LN(v_distance_to_pickup + 1) * 10)
        );
    ELSE
        v_score := v_score + (w_proximity * 50); -- Default if no location
    END IF;
    
    -- 2. Workload Score (0-100)
    -- Fewer current deliveries = higher score
    SELECT COUNT(*) INTO v_current_deliveries
    FROM deliveries 
    WHERE driver_id = p_driver_id 
    AND status IN ('assigned', 'picked_up', 'in_transit');
    
    v_score := v_score + (
        w_workload * GREATEST(0, 100 - (v_current_deliveries * 25))
    );
    
    -- 3. Performance Score (0-100)
    -- Based on completion rate and average time
    IF (v_driver.completed_deliveries + v_driver.failed_deliveries) > 0 THEN
        v_completion_rate := v_driver.completed_deliveries::DECIMAL / 
            GREATEST(1, v_driver.completed_deliveries + v_driver.failed_deliveries);
    ELSE
        v_completion_rate := 0.9; -- Default for new drivers
    END IF;
    
    -- Combine completion rate and performance_score
    v_score := v_score + (
        w_performance * (
            (v_completion_rate * 60) + 
            (COALESCE(v_driver.performance_score, 1) * 40)
        )
    );
    
    -- 4. Fairness Score (0-100)
    -- Prioritize drivers who haven't had recent assignments
    v_time_since_last_assignment := NOW() - COALESCE(v_driver.last_assignment_at, NOW() - INTERVAL '24 hours');
    
    v_score := v_score + (
        w_fairness * LEAST(100, EXTRACT(EPOCH FROM v_time_since_last_assignment) / 36)
    );
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Improved auto-assign function
CREATE OR REPLACE FUNCTION smart_auto_assign_delivery(p_delivery_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_delivery deliveries%ROWTYPE;
    v_driver RECORD;
    v_settings JSONB;
    v_max_concurrent INT;
    v_max_distance_km INT;
    v_result JSONB;
    v_assigned_driver RECORD;
BEGIN
    -- Get delivery details
    SELECT * INTO v_delivery FROM deliveries WHERE id = p_delivery_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Delivery not found'
        );
    END IF;
    
    IF v_delivery.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Delivery is not pending'
        );
    END IF;
    
    -- Get company settings
    SELECT settings INTO v_settings
    FROM delivery_companies WHERE id = v_delivery.delivery_company_id;
    
    v_max_concurrent := COALESCE(
        (v_settings->>'max_concurrent_deliveries_per_driver')::INT, 3
    );
    v_max_distance_km := COALESCE(
        (v_settings->>'max_assignment_distance_km')::INT, 15
    );
    
    -- Find best driver using scoring algorithm
    SELECT 
        dd.id AS driver_id,
        dd.name AS driver_name,
        dd.phone AS driver_phone,
        calculate_driver_assignment_score(
            dd.id,
            ST_Y(v_delivery.pickup_location::geometry),
            ST_X(v_delivery.pickup_location::geometry),
            ST_Y(v_delivery.delivery_location::geometry),
            ST_X(v_delivery.delivery_location::geometry)
        ) AS score,
        ST_Distance(
            dd.current_location::geometry,
            v_delivery.pickup_location::geometry
        ) * 111 AS distance_km,
        (SELECT COUNT(*) FROM deliveries WHERE driver_id = dd.id AND status IN ('assigned', 'picked_up', 'in_transit')) AS current_deliveries
    INTO v_assigned_driver
    FROM delivery_drivers dd
    WHERE dd.delivery_company_id = v_delivery.delivery_company_id
        AND dd.is_active = TRUE
        AND dd.is_available = TRUE
        AND (
            dd.current_location IS NULL OR
            ST_DWithin(
                dd.current_location::geometry,
                v_delivery.pickup_location::geometry,
                v_max_distance_km / 111.0 -- Convert km to degrees
            )
        )
        AND (SELECT COUNT(*) FROM deliveries WHERE driver_id = dd.id AND status IN ('assigned', 'picked_up', 'in_transit')) < v_max_concurrent
    ORDER BY calculate_driver_assignment_score(
        dd.id,
        ST_Y(v_delivery.pickup_location::geometry),
        ST_X(v_delivery.pickup_location::geometry),
        ST_Y(v_delivery.delivery_location::geometry),
        ST_X(v_delivery.delivery_location::geometry)
    ) DESC
    LIMIT 1;
    
    IF v_assigned_driver.driver_id IS NULL THEN
        -- No available driver found
        UPDATE deliveries 
        SET assignment_attempts = assignment_attempts + 1
        WHERE id = p_delivery_id;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No available drivers within range',
            'attempted_at', NOW(),
            'attempts', v_delivery.assignment_attempts + 1
        );
    END IF;
    
    -- Assign the driver
    UPDATE deliveries
    SET 
        driver_id = v_assigned_driver.driver_id,
        status = 'assigned',
        auto_assigned = TRUE,
        assigned_at = NOW()
    WHERE id = p_delivery_id;
    
    -- Update driver's last assignment time
    UPDATE delivery_drivers
    SET 
        is_on_delivery = TRUE,
        last_assignment_at = NOW()
    WHERE id = v_assigned_driver.driver_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'driver_id', v_assigned_driver.driver_id,
        'driver_name', v_assigned_driver.driver_name,
        'driver_phone', v_assigned_driver.driver_phone,
        'assignment_score', ROUND(v_assigned_driver.score::NUMERIC, 2),
        'distance_km', ROUND(v_assigned_driver.distance_km::NUMERIC, 2),
        'current_workload', v_assigned_driver.current_deliveries,
        'assigned_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update driver performance metrics after delivery completion
CREATE OR REPLACE FUNCTION update_driver_performance()
RETURNS TRIGGER AS $$
DECLARE
    v_delivery_time_minutes INT;
BEGIN
    IF NEW.status = 'delivered' AND OLD.status = 'in_transit' THEN
        -- Calculate delivery time
        v_delivery_time_minutes := EXTRACT(EPOCH FROM (NEW.delivered_at - NEW.assigned_at)) / 60;
        
        -- Update driver stats
        UPDATE delivery_drivers
        SET 
            completed_deliveries = completed_deliveries + 1,
            avg_delivery_time_minutes = (
                (avg_delivery_time_minutes * completed_deliveries + v_delivery_time_minutes) / 
                (completed_deliveries + 1)
            )::INT,
            performance_score = LEAST(1.5, performance_score + 0.01)
        WHERE id = NEW.driver_id;
        
    ELSIF NEW.status = 'failed' AND OLD.status IN ('assigned', 'picked_up', 'in_transit') THEN
        -- Update failed deliveries
        UPDATE delivery_drivers
        SET 
            failed_deliveries = failed_deliveries + 1,
            performance_score = GREATEST(0.5, performance_score - 0.05)
        WHERE id = NEW.driver_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for performance updates
DROP TRIGGER IF EXISTS trigger_update_driver_performance ON deliveries;
CREATE TRIGGER trigger_update_driver_performance
    AFTER UPDATE ON deliveries
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_driver_performance();

-- Function to get driver workload summary
CREATE OR REPLACE FUNCTION get_driver_workload(p_delivery_company_id UUID)
RETURNS TABLE (
    driver_id UUID,
    driver_name TEXT,
    current_deliveries BIGINT,
    completed_today BIGINT,
    avg_time_minutes INT,
    performance_score DECIMAL,
    is_available BOOLEAN,
    last_assignment_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dd.id AS driver_id,
        dd.name AS driver_name,
        (SELECT COUNT(*) FROM deliveries d WHERE d.driver_id = dd.id AND d.status IN ('assigned', 'picked_up', 'in_transit')) AS current_deliveries,
        (SELECT COUNT(*) FROM deliveries d WHERE d.driver_id = dd.id AND d.status = 'delivered' AND d.delivered_at::DATE = CURRENT_DATE) AS completed_today,
        dd.avg_delivery_time_minutes,
        dd.performance_score,
        dd.is_available,
        dd.last_assignment_at
    FROM delivery_drivers dd
    WHERE dd.delivery_company_id = p_delivery_company_id
    AND dd.is_active = TRUE
    ORDER BY dd.performance_score DESC, current_deliveries ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_driver_assignment_score TO authenticated;
GRANT EXECUTE ON FUNCTION smart_auto_assign_delivery TO authenticated;
GRANT EXECUTE ON FUNCTION get_driver_workload TO authenticated;

COMMENT ON FUNCTION smart_auto_assign_delivery IS 'Improved auto-assignment using weighted scoring: proximity (35%), workload (25%), performance (25%), fairness (15%)';
