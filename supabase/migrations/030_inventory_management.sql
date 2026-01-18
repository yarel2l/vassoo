-- ============================================
-- Migration: 030_inventory_management
-- Description: Add functions for safe inventory management
-- ============================================

-- Function to safely decrement inventory
-- Returns true if successful, false if insufficient stock
CREATE OR REPLACE FUNCTION decrement_inventory(
    p_inventory_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
BEGIN
    -- Get current quantity with row lock
    SELECT quantity INTO v_current_quantity
    FROM store_inventories
    WHERE id = p_inventory_id
    FOR UPDATE;

    -- Check if inventory exists
    IF v_current_quantity IS NULL THEN
        RAISE NOTICE 'Inventory not found: %', p_inventory_id;
        RETURN FALSE;
    END IF;

    -- Calculate new quantity (never go below 0)
    v_new_quantity := GREATEST(0, v_current_quantity - p_quantity);

    -- Update the inventory
    UPDATE store_inventories
    SET quantity = v_new_quantity,
        updated_at = NOW()
    WHERE id = p_inventory_id;

    -- Log the inventory movement
    INSERT INTO inventory_movements (
        inventory_id,
        movement_type,
        quantity,
        reference_type,
        notes
    ) VALUES (
        p_inventory_id,
        'sale',
        -p_quantity,
        'order',
        'Automatic deduction from order'
    );

    RETURN TRUE;
END;
$$;

-- Function to check inventory availability before purchase
-- Returns array of items with insufficient stock
CREATE OR REPLACE FUNCTION check_inventory_availability(
    p_items JSONB -- Array of {inventory_id, quantity}
)
RETURNS TABLE (
    inventory_id UUID,
    requested_quantity INTEGER,
    available_quantity INTEGER,
    is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (item->>'inventory_id')::UUID as inventory_id,
        (item->>'quantity')::INTEGER as requested_quantity,
        COALESCE(si.quantity, 0) as available_quantity,
        COALESCE(si.quantity, 0) >= (item->>'quantity')::INTEGER as is_available
    FROM jsonb_array_elements(p_items) as item
    LEFT JOIN store_inventories si ON si.id = (item->>'inventory_id')::UUID
    WHERE si.is_available = TRUE OR si.id IS NULL;
END;
$$;

-- Function to decrement inventory for custom products (store_custom_products table)
CREATE OR REPLACE FUNCTION decrement_custom_product_inventory(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_quantity INTEGER;
    v_new_quantity INTEGER;
BEGIN
    -- Get current quantity with row lock
    SELECT quantity INTO v_current_quantity
    FROM store_custom_products
    WHERE id = p_product_id
    FOR UPDATE;

    -- Check if product exists
    IF v_current_quantity IS NULL THEN
        RAISE NOTICE 'Custom product not found: %', p_product_id;
        RETURN FALSE;
    END IF;

    -- Calculate new quantity (never go below 0)
    v_new_quantity := GREATEST(0, v_current_quantity - p_quantity);

    -- Update the product inventory
    UPDATE store_custom_products
    SET quantity = v_new_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;

    RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION decrement_inventory(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_inventory(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION check_inventory_availability(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION check_inventory_availability(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_custom_product_inventory(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_custom_product_inventory(UUID, INTEGER) TO service_role;
