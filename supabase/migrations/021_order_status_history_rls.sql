-- Migration 021: Add missing order_status_history RLS policies
-- Run this after migration 020 if you get "policy already exists" errors

-- Only add the new policies for order_status_history
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
