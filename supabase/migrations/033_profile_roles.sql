-- ============================================
-- Migration: 033_profile_roles
-- Description: Add role field to profiles for quick role identification
-- ============================================

-- Create user role enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('customer', 'driver', 'store_staff', 'delivery_staff', 'platform_admin');
    END IF;
END $$;

-- Add role column to profiles with default 'customer'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'customer';

-- Update existing drivers to have 'driver' role
UPDATE public.profiles p
SET role = 'driver'
WHERE EXISTS (
    SELECT 1 FROM public.delivery_drivers dd 
    WHERE dd.user_id = p.id AND dd.is_active = TRUE
);

-- Update platform admins
UPDATE public.profiles p
SET role = 'platform_admin'
WHERE EXISTS (
    SELECT 1 FROM public.platform_admins pa 
    WHERE pa.user_id = p.id AND pa.is_active = TRUE
);

-- Create function to automatically set role when a driver is created
CREATE OR REPLACE FUNCTION set_driver_role()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.profiles 
        SET role = 'driver' 
        WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if user has other driver records, if not reset to customer
        IF NOT EXISTS (
            SELECT 1 FROM public.delivery_drivers 
            WHERE user_id = OLD.user_id AND id != OLD.id AND is_active = TRUE
        ) THEN
            UPDATE public.profiles 
            SET role = 'customer' 
            WHERE id = OLD.user_id
            AND NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = OLD.user_id AND is_active = TRUE);
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for driver role management
DROP TRIGGER IF EXISTS trigger_set_driver_role ON public.delivery_drivers;
CREATE TRIGGER trigger_set_driver_role
    AFTER INSERT OR DELETE ON public.delivery_drivers
    FOR EACH ROW
    EXECUTE FUNCTION set_driver_role();

-- Create function to automatically set role when a platform admin is created
CREATE OR REPLACE FUNCTION set_admin_role()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = TRUE THEN
        UPDATE public.profiles 
        SET role = 'platform_admin' 
        WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_active = FALSE) THEN
        -- Reset to customer if no longer admin (unless they're a driver)
        UPDATE public.profiles 
        SET role = CASE 
            WHEN EXISTS (SELECT 1 FROM public.delivery_drivers WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND is_active = TRUE)
            THEN 'driver'::user_role
            ELSE 'customer'::user_role
        END
        WHERE id = COALESCE(NEW.user_id, OLD.user_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for platform admin role management
DROP TRIGGER IF EXISTS trigger_set_admin_role ON public.platform_admins;
CREATE TRIGGER trigger_set_admin_role
    AFTER INSERT OR UPDATE OR DELETE ON public.platform_admins
    FOR EACH ROW
    EXECUTE FUNCTION set_admin_role();

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Comment
COMMENT ON COLUMN public.profiles.role IS 'Quick role identifier: customer, driver, store_staff, delivery_staff, platform_admin';
