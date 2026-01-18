-- Migration: Fix price_history trigger functions to bypass RLS
-- The trigger functions that insert into price_history fail because RLS is enabled
-- but no insert policies exist. Using SECURITY DEFINER allows the trigger to run
-- with owner privileges, bypassing RLS.

-- Drop existing triggers first
DROP TRIGGER IF EXISTS track_inventory_price_change ON store_inventories;
DROP TRIGGER IF EXISTS track_inventory_initial_price ON store_inventories;

-- Recreate the track_price_change function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION track_price_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        INSERT INTO price_history (inventory_id, price)
        VALUES (NEW.id, NEW.price);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the track_initial_price function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION track_initial_price()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO price_history (inventory_id, price)
    VALUES (NEW.id, NEW.price);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER track_inventory_price_change
    AFTER UPDATE ON store_inventories
    FOR EACH ROW
    EXECUTE FUNCTION track_price_change();

CREATE TRIGGER track_inventory_initial_price
    AFTER INSERT ON store_inventories
    FOR EACH ROW
    EXECUTE FUNCTION track_initial_price();

-- Also add RLS policies for price_history for direct access if needed
CREATE POLICY "Store owners can view their price history"
    ON price_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM store_inventories si
            JOIN stores s ON si.store_id = s.id
            JOIN tenant_memberships tm ON s.tenant_id = tm.tenant_id
            WHERE si.id = price_history.inventory_id
              AND tm.user_id = auth.uid()
        )
    );
