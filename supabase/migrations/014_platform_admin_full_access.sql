-- ============================================
-- Migration: 014_platform_admin_full_access
-- Description: Ensure Platform Admins have full visibility and control
-- ============================================

-- STORES: Platform admins can view and manage all stores
CREATE POLICY "Platform admins can manage all stores"
ON public.stores FOR ALL
USING (is_platform_admin());

-- DELIVERY COMPANIES: Platform admins can view and manage all delivery companies
CREATE POLICY "Platform admins can manage all delivery companies"
ON public.delivery_companies FOR ALL
USING (is_platform_admin());

-- US JURISDICTIONS: Ensure Platform admins can manage all levels
-- Note: us_states already has an ALL policy for admin in 011, 
-- but we make sure they cover everything for consistency.

-- us_counties: Platform admins can manage all counties
CREATE POLICY "Platform admins can manage all counties_v2"
ON public.us_counties FOR ALL
USING (is_platform_admin());

-- us_cities: Platform admins can manage all cities
CREATE POLICY "Platform admins can manage all cities_v2"
ON public.us_cities FOR ALL
USING (is_platform_admin());

-- us_zip_codes: Platform admins can manage all zip codes
CREATE POLICY "Platform admins can manage all zip codes_v2"
ON public.us_zip_codes FOR ALL
USING (is_platform_admin());

-- PLATFORM SETTINGS (if not already covered)
-- Ensure this table is reachable by admins
CREATE POLICY "Platform admins can manage settings"
ON public.platform_settings FOR ALL
USING (is_platform_admin());
