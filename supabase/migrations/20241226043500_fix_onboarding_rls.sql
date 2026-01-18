-- ============================================
-- Fix RLS policies for onboarding flow
-- Run this in Supabase SQL Editor
-- ============================================

-- Ensure authenticated users can create tenants during onboarding
DROP POLICY IF EXISTS "Anyone can create a tenant (for onboarding)" ON tenants;
CREATE POLICY "Authenticated users can create tenant during onboarding"
ON tenants FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Ensure users can create their own membership
DROP POLICY IF EXISTS "Users can create own membership during onboarding" ON tenant_memberships;
CREATE POLICY "Users can create own membership during onboarding"
ON tenant_memberships FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Ensure store can be created during onboarding
DROP POLICY IF EXISTS "Users can create store during onboarding" ON stores;
CREATE POLICY "Users can create store during onboarding"
ON stores FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tenant_memberships tm
        WHERE tm.tenant_id = stores.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
    )
);

-- Ensure delivery company can be created during onboarding
DROP POLICY IF EXISTS "Users can create delivery company during onboarding" ON delivery_companies;
CREATE POLICY "Users can create delivery company during onboarding"
ON delivery_companies FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tenant_memberships tm
        WHERE tm.tenant_id = delivery_companies.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'owner'
    )
);

-- Also ensure the helper function exists
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM platform_admins 
        WHERE user_id = auth.uid() 
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
