-- ============================================
-- Migration: 035_delivery_drivers_rls
-- Description: Add RLS policies for delivery_drivers table
-- ============================================

-- Enable RLS on delivery_drivers if not already enabled
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

-- Policy: Drivers can view their own record
DROP POLICY IF EXISTS "Drivers can view own record" ON delivery_drivers;
CREATE POLICY "Drivers can view own record"
    ON delivery_drivers FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Drivers can update their own record (for status, location, etc)
DROP POLICY IF EXISTS "Drivers can update own record" ON delivery_drivers;
CREATE POLICY "Drivers can update own record"
    ON delivery_drivers FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: Delivery company staff can view their company's drivers
DROP POLICY IF EXISTS "Company staff can view company drivers" ON delivery_drivers;
CREATE POLICY "Company staff can view company drivers"
    ON delivery_drivers FOR SELECT
    USING (
        delivery_company_id IN (
            SELECT dc.id FROM delivery_companies dc
            JOIN tenant_memberships tm ON tm.tenant_id = dc.tenant_id
            WHERE tm.user_id = auth.uid()
        )
    );

-- Policy: Delivery company staff can manage their company's drivers
DROP POLICY IF EXISTS "Company staff can manage company drivers" ON delivery_drivers;
CREATE POLICY "Company staff can manage company drivers"
    ON delivery_drivers FOR ALL
    USING (
        delivery_company_id IN (
            SELECT dc.id FROM delivery_companies dc
            JOIN tenant_memberships tm ON tm.tenant_id = dc.tenant_id
            WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin', 'manager')
        )
    );

-- Policy: Platform admins can do anything
DROP POLICY IF EXISTS "Platform admins full access to drivers" ON delivery_drivers;
CREATE POLICY "Platform admins full access to drivers"
    ON delivery_drivers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM platform_admins 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- Also grant the RPC function permission to update drivers
-- (This is handled by SECURITY DEFINER in the function)

COMMENT ON TABLE delivery_drivers IS 'Delivery drivers with RLS policies for self-update and company management';
