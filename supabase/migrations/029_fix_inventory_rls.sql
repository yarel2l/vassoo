-- ============================================
-- Migration: 029_fix_inventory_rls
-- Description: Fix RLS policies for store_inventories to allow store owners to view/update all their inventory
-- ============================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Store members can manage inventory" ON store_inventories;
DROP POLICY IF EXISTS "Store members can view all inventory" ON store_inventories;

-- Create policy for store members to view ALL their inventory (regardless of is_available)
CREATE POLICY "Store members can view all inventory"
ON store_inventories FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- Create policy for store members to INSERT inventory
CREATE POLICY "Store members can insert inventory"
ON store_inventories FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- Create policy for store members to UPDATE inventory
CREATE POLICY "Store members can update inventory"
ON store_inventories FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- Create policy for store members to DELETE inventory
CREATE POLICY "Store members can delete inventory"
ON store_inventories FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- Also add platform admin policy to manage all inventories
DROP POLICY IF EXISTS "Platform admins can manage inventory" ON store_inventories;
CREATE POLICY "Platform admins can manage all inventory"
ON store_inventories FOR ALL
USING (is_platform_admin());
