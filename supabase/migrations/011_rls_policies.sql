-- ============================================
-- Migration: 011_rls_policies
-- Description: Row Level Security policies for all tables
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_special_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_zip_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_delivery_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER: Check if user is platform admin
-- ============================================

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

-- ============================================
-- HELPER: Get user's tenant IDs by type
-- ============================================

CREATE OR REPLACE FUNCTION get_user_tenant_ids(p_type tenant_type DEFAULT NULL)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT tm.tenant_id 
        FROM tenant_memberships tm
        JOIN tenants t ON t.id = tm.tenant_id
        WHERE tm.user_id = auth.uid() 
        AND tm.is_active = TRUE
        AND (p_type IS NULL OR t.type = p_type)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROFILES POLICIES
-- ============================================

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Platform admins can view all profiles"
ON profiles FOR SELECT
USING (is_platform_admin());

-- ============================================
-- USER ADDRESSES POLICIES
-- ============================================

CREATE POLICY "Users can manage own addresses"
ON user_addresses FOR ALL
USING (auth.uid() = user_id);

-- ============================================
-- PLATFORM ADMINS POLICIES
-- ============================================

CREATE POLICY "Users can view own admin status"
ON platform_admins FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all admins"
ON platform_admins FOR SELECT
USING (is_platform_admin());

-- ============================================
-- TENANTS POLICIES
-- ============================================

CREATE POLICY "Members can view their tenant"
ON tenants FOR SELECT
USING (
    id = ANY(get_user_tenant_ids())
    OR is_platform_admin()
);

CREATE POLICY "Owners can update their tenant"
ON tenants FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE tenant_id = tenants.id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND is_active = TRUE
    )
);

CREATE POLICY "Anyone can create a tenant (for onboarding)"
ON tenants FOR INSERT
WITH CHECK (TRUE);

CREATE POLICY "Platform admins can manage all tenants"
ON tenants FOR ALL
USING (is_platform_admin());

-- ============================================
-- TENANT MEMBERSHIPS POLICIES
-- ============================================

CREATE POLICY "Users can view own memberships"
ON tenant_memberships FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can view memberships"
ON tenant_memberships FOR SELECT
USING (
    tenant_id = ANY(get_user_tenant_ids())
);

CREATE POLICY "Tenant owners/admins can manage memberships"
ON tenant_memberships FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM tenant_memberships tm
        WHERE tm.tenant_id = tenant_memberships.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
        AND tm.is_active = TRUE
    )
);

-- ============================================
-- STORES POLICIES
-- ============================================

-- Public can view active stores
CREATE POLICY "Public can view active stores"
ON stores FOR SELECT
USING (is_active = TRUE);

-- Members can manage their stores
CREATE POLICY "Tenant members can manage stores"
ON stores FOR ALL
USING (
    tenant_id = ANY(get_user_tenant_ids('owner_store'))
);

-- ============================================
-- STORE LOCATIONS POLICIES
-- ============================================

-- Public can view active locations
CREATE POLICY "Public can view active locations"
ON store_locations FOR SELECT
USING (
    is_active = TRUE 
    AND EXISTS (
        SELECT 1 FROM stores s 
        WHERE s.id = store_locations.store_id 
        AND s.is_active = TRUE
    )
);

-- Store members can manage locations
CREATE POLICY "Store members can manage locations"
ON store_locations FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_locations.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- ============================================
-- PRODUCTS POLICIES
-- ============================================

-- Everyone can view active products
CREATE POLICY "Public can view active products"
ON master_products FOR SELECT
USING (is_active = TRUE);

-- Platform admins can manage products
CREATE POLICY "Platform admins can manage products"
ON master_products FOR ALL
USING (is_platform_admin());

-- ============================================
-- STORE INVENTORIES POLICIES
-- ============================================

-- Public can view available inventory (with age + location check in app)
CREATE POLICY "Public can view available inventory"
ON store_inventories FOR SELECT
USING (
    is_available = TRUE
    AND EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.is_active = TRUE
    )
);

-- Store members can manage inventory
CREATE POLICY "Store members can manage inventory"
ON store_inventories FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_inventories.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- ============================================
-- ORDERS POLICIES
-- ============================================

-- Customers can view own orders
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
USING (customer_id = auth.uid());

-- Customers can create orders
CREATE POLICY "Customers can create orders"
ON orders FOR INSERT
WITH CHECK (customer_id = auth.uid());

-- Store members can view/manage store orders
CREATE POLICY "Store members can manage orders"
ON orders FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = orders.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- ============================================
-- ORDER ITEMS POLICIES
-- ============================================

CREATE POLICY "Can view order items for accessible orders"
ON order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = order_items.order_id
        AND (
            o.customer_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM stores s
                WHERE s.id = o.store_id
                AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
            )
        )
    )
);

-- ============================================
-- DELIVERIES POLICIES
-- ============================================

-- Delivery company members can view/manage deliveries
CREATE POLICY "Delivery company members can manage deliveries"
ON deliveries FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM delivery_companies dc
        WHERE dc.id = deliveries.delivery_company_id
        AND dc.tenant_id = ANY(get_user_tenant_ids('delivery_company'))
    )
);

-- Drivers can view their assigned deliveries
CREATE POLICY "Drivers can view assigned deliveries"
ON deliveries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM delivery_drivers dd
        WHERE dd.id = deliveries.driver_id
        AND dd.user_id = auth.uid()
    )
);

-- Drivers can update their deliveries
CREATE POLICY "Drivers can update assigned deliveries"
ON deliveries FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM delivery_drivers dd
        WHERE dd.id = deliveries.driver_id
        AND dd.user_id = auth.uid()
    )
);

-- Customers can view their delivery
CREATE POLICY "Customers can view their delivery"
ON deliveries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = deliveries.order_id
        AND o.customer_id = auth.uid()
    )
);

-- ============================================
-- JURISDICTION TABLES (Public read)
-- ============================================

CREATE POLICY "Public can view US states"
ON us_states FOR SELECT
USING (TRUE);

CREATE POLICY "Public can view US counties"
ON us_counties FOR SELECT
USING (TRUE);

CREATE POLICY "Public can view US cities"
ON us_cities FOR SELECT
USING (TRUE);

CREATE POLICY "Public can view US zip codes"
ON us_zip_codes FOR SELECT
USING (TRUE);

-- Only platform admins can modify jurisdiction data
CREATE POLICY "Platform admins can manage jurisdictions"
ON us_states FOR ALL
USING (is_platform_admin());

CREATE POLICY "Platform admins can manage counties"
ON us_counties FOR ALL
USING (is_platform_admin());

CREATE POLICY "Platform admins can manage cities"
ON us_cities FOR ALL
USING (is_platform_admin());

CREATE POLICY "Platform admins can manage zip codes"
ON us_zip_codes FOR ALL
USING (is_platform_admin());

-- ============================================
-- TAXES AND FEES (Public read, admin write)
-- ============================================

CREATE POLICY "Public can view active tax rates"
ON tax_rates FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Platform admins can manage tax rates"
ON tax_rates FOR ALL
USING (is_platform_admin());

CREATE POLICY "Public can view active platform fees"
ON platform_fees FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Platform admins can manage platform fees"
ON platform_fees FOR ALL
USING (is_platform_admin());

-- ============================================
-- PROMOTIONS & COUPONS
-- ============================================

-- Public can view active promotions
CREATE POLICY "Public can view active promotions"
ON promotions FOR SELECT
USING (
    is_active = TRUE
    AND start_date <= NOW()
    AND (end_date IS NULL OR end_date >= NOW())
);

-- Store members can manage promotions
CREATE POLICY "Store members can manage promotions"
ON promotions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = promotions.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- Public can view active coupons (for validation)
CREATE POLICY "Public can view active coupons"
ON coupons FOR SELECT
USING (is_active = TRUE);

-- Store members can manage coupons
CREATE POLICY "Store members can manage coupons"
ON coupons FOR ALL
USING (
    store_id IS NULL -- Platform coupons only by admin
    OR EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = coupons.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- ============================================
-- REVIEWS
-- ============================================

-- Public can view visible reviews
CREATE POLICY "Public can view visible reviews"
ON store_reviews FOR SELECT
USING (is_visible = TRUE);

-- Customers can create reviews for their orders
CREATE POLICY "Customers can create reviews"
ON store_reviews FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = store_reviews.order_id
        AND o.customer_id = auth.uid()
        AND o.status = 'completed'
    )
);

-- Store members can respond to reviews
CREATE POLICY "Store members can respond to reviews"
ON store_reviews FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM stores s
        WHERE s.id = store_reviews.store_id
        AND s.tenant_id = ANY(get_user_tenant_ids('owner_store'))
    )
);

-- ============================================
-- PRICE ALERTS (User's own)
-- ============================================

CREATE POLICY "Users can manage own price alerts"
ON price_alerts FOR ALL
USING (user_id = auth.uid());

-- ============================================
-- DELIVERY COMPANIES (Public view, member manage)
-- ============================================

CREATE POLICY "Public can view active delivery companies"
ON delivery_companies FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Tenant members can manage delivery company"
ON delivery_companies FOR ALL
USING (
    tenant_id = ANY(get_user_tenant_ids('delivery_company'))
);

-- ============================================
-- DELIVERY DRIVERS
-- ============================================

CREATE POLICY "Company members can manage drivers"
ON delivery_drivers FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM delivery_companies dc
        WHERE dc.id = delivery_drivers.delivery_company_id
        AND dc.tenant_id = ANY(get_user_tenant_ids('delivery_company'))
    )
);

CREATE POLICY "Drivers can view/update own profile"
ON delivery_drivers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Drivers can update own status and location"
ON delivery_drivers FOR UPDATE
USING (user_id = auth.uid());
