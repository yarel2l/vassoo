-- Migration: Fix orders and order_items RLS for store dashboard INSERT
-- The existing "Store members can manage orders" policy uses FOR ALL with USING
-- but doesn't explicitly handle INSERT with WITH CHECK

-- Drop and recreate the store members policy for orders
DROP POLICY IF EXISTS "Store members can manage orders" ON orders;

-- Separate policies for clarity and proper INSERT handling
CREATE POLICY "Store members can view orders"
ON orders FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = orders.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can insert orders"
ON orders FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can update orders"
ON orders FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = orders.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can delete orders"
ON orders FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = orders.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- Order items policies for store members
CREATE POLICY "Store members can insert order items"
ON order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.id = order_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can update order items"
ON order_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.id = order_items.order_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

CREATE POLICY "Store members can delete order items"
ON order_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.id = order_items.order_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- ============================================
-- ORDER STATUS HISTORY POLICIES
-- ============================================

-- Store members can insert order status history
CREATE POLICY "Store members can insert order status history"
ON order_status_history FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.id = order_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- Store members can view order status history
CREATE POLICY "Store members can view order status history"
ON order_status_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.id = order_status_history.order_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);
