-- =====================================================
-- SEED DATA: Admin User + Demo Store
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, create test users in Supabase Auth (you need to do this via the Auth UI or API)
-- Then run this script to set up the profiles and demo data

-- =====================================================
-- 1. CREATE ADMIN USER PROFILE
-- Email: admin@vassoo.com
-- =====================================================

-- Note: First create the user in Supabase Auth Dashboard with:
-- Email: admin@vassoo.com
-- Password: Admin123!@#

-- After creating the auth user, get the UUID and update below:
-- Replace 'ADMIN_USER_UUID' with actual UUID from Supabase Auth

DO $$
DECLARE
    admin_user_id UUID;
    store_owner_id UUID;
    tenant_store_id UUID;
    store_id UUID;
    location_id UUID;
BEGIN
    -- Check if admin profile exists (by email in metadata)
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@vassoo.com' LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user not found. Please create user admin@vassoo.com in Supabase Auth first.';
    ELSE
        -- Update profile to make them admin
        UPDATE public.profiles 
        SET 
            full_name = 'Platform Admin',
            phone = '+1 555-000-0001',
            age_verified = true,
            age_verified_at = NOW(),
            birth_date = '1990-01-01'
        WHERE id = admin_user_id;
        
        -- Make them platform admin
        INSERT INTO public.platform_admins (user_id, role, permissions, is_active)
        VALUES (admin_user_id, 'super_admin', '["*"]'::jsonb, true)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Admin user configured: %', admin_user_id;
    END IF;

    -- =====================================================
    -- 2. CREATE STORE OWNER PROFILE
    -- Email: storeowner@vassoo.com
    -- =====================================================
    
    SELECT id INTO store_owner_id FROM auth.users WHERE email = 'storeowner@vassoo.com' LIMIT 1;
    
    IF store_owner_id IS NULL THEN
        RAISE NOTICE 'Store owner not found. Please create user storeowner@vassoo.com in Supabase Auth first.';
    ELSE
        -- Update profile
        UPDATE public.profiles 
        SET 
            full_name = 'John Store Owner',
            phone = '+1 555-123-4567',
            age_verified = true,
            age_verified_at = NOW(),
            birth_date = '1985-05-15'
        WHERE id = store_owner_id;
        
        -- =====================================================
        -- 3. CREATE DEMO TENANT (STORE)
        -- =====================================================
        
        INSERT INTO public.tenants (
            id, name, slug, type, email, phone, status, 
            stripe_account_id, stripe_account_status, stripe_onboarding_complete
        )
        VALUES (
            gen_random_uuid(),
            'Premium Spirits NYC',
            'premium-spirits-nyc',
            'owner_store',
            'contact@premiumspirits.com',
            '+1 555-123-4567',
            'active',
            'acct_demo_123456', -- Demo Stripe account
            'active',
            true
        )
        ON CONFLICT (slug) DO UPDATE SET status = 'active'
        RETURNING id INTO tenant_store_id;
        
        -- Create membership for store owner
        INSERT INTO public.tenant_memberships (user_id, tenant_id, role, is_active, accepted_at)
        VALUES (store_owner_id, tenant_store_id, 'owner', true, NOW())
        ON CONFLICT DO NOTHING;
        
        -- =====================================================
        -- 4. CREATE STORE RECORD
        -- =====================================================
        
        INSERT INTO public.stores (
            id, tenant_id, name, slug, description, email, phone,
            is_active, license_number, license_state, license_expiry,
            minimum_order_amount, delivery_fee, delivery_radius_miles,
            average_rating, total_reviews
        )
        VALUES (
            gen_random_uuid(),
            tenant_store_id,
            'Premium Spirits NYC',
            'premium-spirits-nyc',
            'New York''s premier destination for fine spirits, wines, and craft beers. We offer a curated selection of premium alcoholic beverages from around the world.',
            'contact@premiumspirits.com',
            '+1 555-123-4567',
            true,
            'NY-LIQ-2024-001234',
            'NY',
            '2025-12-31',
            25.00,
            4.99,
            10.0,
            4.8,
            234
        )
        ON CONFLICT (slug) DO UPDATE SET is_active = true
        RETURNING id INTO store_id;
        
        -- =====================================================
        -- 5. CREATE STORE LOCATION
        -- =====================================================
        
        INSERT INTO public.store_locations (
            id, store_id, name, address_line1, city, state, postal_code, country,
            phone, is_primary, is_active,
            location, operating_hours
        )
        VALUES (
            gen_random_uuid(),
            store_id,
            'Main Store',
            '123 Main Street',
            'New York',
            'NY',
            '10001',
            'US',
            '+1 555-123-4567',
            true,
            true,
            ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326), -- NYC coordinates
            '{
                "monday": {"open": "09:00", "close": "21:00"},
                "tuesday": {"open": "09:00", "close": "21:00"},
                "wednesday": {"open": "09:00", "close": "21:00"},
                "thursday": {"open": "09:00", "close": "21:00"},
                "friday": {"open": "09:00", "close": "22:00"},
                "saturday": {"open": "10:00", "close": "22:00"},
                "sunday": {"open": "11:00", "close": "20:00"}
            }'::jsonb
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO location_id;
        
        RAISE NOTICE 'Store created: % with location %', store_id, location_id;
        
        -- =====================================================
        -- 6. CREATE DEMO PRODUCTS (Master Catalog)
        -- =====================================================
        
        INSERT INTO public.master_products (id, sku, name, brand, category, subcategory, description, age_restriction, is_active)
        VALUES 
            (gen_random_uuid(), 'JW-BLUE-750', 'Johnnie Walker Blue Label', 'Johnnie Walker', 'Whisky', 'Scotch', 'Premium blended Scotch whisky with exceptional depth and character.', 21, true),
            (gen_random_uuid(), 'MC-BRUT-750', 'Moët & Chandon Brut Impérial', 'Moët & Chandon', 'Champagne', 'Brut', 'The House''s iconic champagne with bright fruitiness and elegant maturity.', 21, true),
            (gen_random_uuid(), 'HY-XO-750', 'Hennessy XO', 'Hennessy', 'Cognac', 'XO', 'Rich, complex cognac with notes of candied fruit and spice.', 21, true),
            (gen_random_uuid(), 'GG-VDK-750', 'Grey Goose Vodka', 'Grey Goose', 'Vodka', 'Premium', 'French wheat vodka with a smooth, subtle taste.', 21, true),
            (gen_random_uuid(), 'DJ-1942-750', 'Don Julio 1942', 'Don Julio', 'Tequila', 'Añejo', 'Luxury tequila with warm oak, vanilla, and roasted agave notes.', 21, true),
            (gen_random_uuid(), 'PT-SLV-750', 'Patrón Silver', 'Patrón', 'Tequila', 'Blanco', 'Ultra-premium silver tequila with a smooth, sweet taste.', 21, true),
            (gen_random_uuid(), 'MC-18-750', 'The Macallan 18 Year', 'The Macallan', 'Whisky', 'Single Malt', 'Rich dried fruit, ginger, and wood smoke. Full-bodied and complex.', 21, true),
            (gen_random_uuid(), 'RM-XO-750', 'Rémy Martin XO', 'Rémy Martin', 'Cognac', 'XO', 'Opulent cognac with rich fruity and spicy flavors.', 21, true),
            (gen_random_uuid(), 'BV-RSRV-750', 'Beaulieu Vineyard Reserve Cabernet', 'BV', 'Wine', 'Red', 'Full-bodied Cabernet Sauvignon with dark fruit and oak.', 21, true),
            (gen_random_uuid(), 'VP-CLQT-750', 'Veuve Clicquot Yellow Label', 'Veuve Clicquot', 'Champagne', 'Brut', 'Bold and fresh champagne with apple and toasty notes.', 21, true)
        ON CONFLICT (sku) DO NOTHING;
        
        -- =====================================================
        -- 7. CREATE STORE INVENTORY (Link products to store)
        -- =====================================================
        
        INSERT INTO public.store_inventories (store_id, product_id, location_id, price, cost_price, quantity, low_stock_threshold, is_available)
        SELECT 
            store_id,
            mp.id,
            location_id,
            CASE mp.sku
                WHEN 'JW-BLUE-750' THEN 189.99
                WHEN 'MC-BRUT-750' THEN 54.99
                WHEN 'HY-XO-750' THEN 199.99
                WHEN 'GG-VDK-750' THEN 34.99
                WHEN 'DJ-1942-750' THEN 169.99
                WHEN 'PT-SLV-750' THEN 49.99
                WHEN 'MC-18-750' THEN 299.99
                WHEN 'RM-XO-750' THEN 179.99
                WHEN 'BV-RSRV-750' THEN 44.99
                WHEN 'VP-CLQT-750' THEN 59.99
            END,
            CASE mp.sku
                WHEN 'JW-BLUE-750' THEN 140.00
                WHEN 'MC-BRUT-750' THEN 38.00
                WHEN 'HY-XO-750' THEN 150.00
                WHEN 'GG-VDK-750' THEN 22.00
                WHEN 'DJ-1942-750' THEN 120.00
                WHEN 'PT-SLV-750' THEN 32.00
                WHEN 'MC-18-750' THEN 220.00
                WHEN 'RM-XO-750' THEN 130.00
                WHEN 'BV-RSRV-750' THEN 28.00
                WHEN 'VP-CLQT-750' THEN 42.00
            END,
            FLOOR(RANDOM() * 50 + 5)::INT, -- Random quantity 5-55
            10,
            true
        FROM public.master_products mp
        WHERE mp.sku IN ('JW-BLUE-750', 'MC-BRUT-750', 'HY-XO-750', 'GG-VDK-750', 'DJ-1942-750', 'PT-SLV-750', 'MC-18-750', 'RM-XO-750', 'BV-RSRV-750', 'VP-CLQT-750')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Demo products and inventory created';
        
    END IF;
    
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check admin user
SELECT 'Platform Admins' as entity, COUNT(*) as count FROM platform_admins;

-- Check tenants
SELECT 'Tenants' as entity, COUNT(*) as count FROM tenants;

-- Check stores
SELECT 'Stores' as entity, COUNT(*) as count FROM stores;

-- Check products
SELECT 'Master Products' as entity, COUNT(*) as count FROM master_products;

-- Check inventory
SELECT 'Store Inventories' as entity, COUNT(*) as count FROM store_inventories;

-- Show store details
SELECT s.name, s.slug, s.is_active, t.status as tenant_status
FROM stores s
JOIN tenants t ON s.tenant_id = t.id;
