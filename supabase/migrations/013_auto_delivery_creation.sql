-- ============================================
-- Migration: 013_auto_delivery_creation
-- Description: Automatically create delivery records when orders are confirmed
-- ============================================

-- Function to handle delivery creation on order status change
CREATE OR REPLACE FUNCTION handle_order_delivery_creation()
RETURNS TRIGGER AS $$
DECLARE
    v_delivery_company_id UUID;
    v_distance_miles DECIMAL := 5.0; -- Default placeholder
    v_delivery_fee DECIMAL;
BEGIN
    -- Only act when status changes to 'confirmed' and it's a delivery order
    IF (NEW.status = 'confirmed' AND OLD.status != 'confirmed') 
       AND NEW.fulfillment_type = 'delivery' THEN
        
        -- Try to find a preferred delivery company for this store
        SELECT delivery_company_id INTO v_delivery_company_id
        FROM store_delivery_preferences
        WHERE store_id = NEW.store_id
        AND is_enabled = TRUE
        ORDER BY priority ASC
        LIMIT 1;

        -- If no preference, pick any active delivery company (fallback)
        IF v_delivery_company_id IS NULL THEN
            SELECT id INTO v_delivery_company_id
            FROM delivery_companies
            WHERE is_active = TRUE
            LIMIT 1;
        END IF;

        -- If we found a company, create the delivery record
        IF v_delivery_company_id IS NOT NULL THEN
            -- Calculate initial fee (using the helper function from 010_delivery.sql)
            v_delivery_fee := calculate_delivery_fee(v_delivery_company_id, v_distance_miles);

            INSERT INTO deliveries (
                order_id,
                delivery_company_id,
                status,
                pickup_location,
                pickup_address,
                dropoff_location,
                dropoff_address,
                distance_miles,
                delivery_fee,
                tip_amount
            )
            SELECT 
                NEW.id,
                v_delivery_company_id,
                'pending',
                sl.location,
                jsonb_build_object(
                    'street', sl.address_line1,
                    'city', sl.city,
                    'state', sl.state,
                    'zipCode', sl.postal_code,
                    'phone', sl.phone
                ),
                NEW.delivery_coordinates,
                NEW.delivery_address,
                v_distance_miles,
                v_delivery_fee,
                NEW.tip_amount
            FROM store_locations sl
            WHERE sl.store_id = NEW.store_id
            AND sl.is_primary = TRUE
            LIMIT 1;
            
            -- If successfully created, try to auto-assign if company settings allow
            -- We can call auto_assign_delivery(id) here or later. 
            -- Let's stick to creating it as 'pending' for now.
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_create_delivery_on_confirmation ON orders;
CREATE TRIGGER trg_create_delivery_on_confirmation
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_delivery_creation();
