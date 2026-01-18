-- ============================================
-- Migration: 033_add_profile_role
-- Description: Add role field to profiles table for user type identification
-- ============================================

-- Add role column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer' 
CHECK (role IN ('customer', 'driver', 'store_admin', 'delivery_admin'));

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing drivers: Set role to 'driver' for users who are in delivery_drivers
UPDATE public.profiles 
SET role = 'driver'
WHERE id IN (
    SELECT DISTINCT user_id 
    FROM public.delivery_drivers 
    WHERE user_id IS NOT NULL
);

-- Update existing store admins: Set role for users who own/manage stores
UPDATE public.profiles 
SET role = 'store_admin'
WHERE id IN (
    SELECT DISTINCT tm.user_id 
    FROM public.tenant_memberships tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE t.type = 'owner_store' 
    AND tm.role IN ('owner', 'admin')
    AND tm.is_active = true
);

-- Update existing delivery company admins
UPDATE public.profiles 
SET role = 'delivery_admin'
WHERE id IN (
    SELECT DISTINCT tm.user_id 
    FROM public.tenant_memberships tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE t.type = 'delivery_company' 
    AND tm.role IN ('owner', 'admin')
    AND tm.is_active = true
)
AND role = 'customer'; -- Don't overwrite if already set

-- Comment
COMMENT ON COLUMN profiles.role IS 'User role type: customer (default), driver (delivery driver), store_admin (store owner/admin), delivery_admin (delivery company admin)';
