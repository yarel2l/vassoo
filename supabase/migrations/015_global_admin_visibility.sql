-- ============================================
-- Migration: 015_global_admin_visibility
-- Description: Ensure Platform Admins can see all operational data
-- ============================================

-- ORDERS & ITEMS
CREATE POLICY "Platform admins can view all orders"
ON public.orders FOR SELECT
USING (is_platform_admin() OR auth.uid() = customer_id);

CREATE POLICY "Platform admins can view all order items"
ON public.order_items FOR SELECT
USING (is_platform_admin() OR EXISTS (
    SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid()
));

CREATE POLICY "Platform admins can view order history"
ON public.order_status_history FOR SELECT
USING (is_platform_admin() OR EXISTS (
    SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid()
));

-- DELIVERIES
CREATE POLICY "Platform admins can view all deliveries"
ON public.deliveries FOR SELECT
USING (is_platform_admin());

CREATE POLICY "Platform admins can view delivery history"
ON public.delivery_status_history FOR SELECT
USING (is_platform_admin());

-- PROFILES
CREATE POLICY "Platform admins can view all profiles for resolution"
ON public.profiles FOR SELECT
USING (is_platform_admin() OR auth.uid() = id);

-- STORE LOCATIONS
CREATE POLICY "Platform admins can manage all store locations"
ON public.store_locations FOR ALL
USING (is_platform_admin());
