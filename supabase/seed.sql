-- ============================================
-- MULTIVENDOR STORE - SEED DATA
-- ============================================
-- This file contains all initial/demo data for the database.
-- Run this AFTER schema.sql has been executed.
--
-- Prerequisites:
--   1. schema.sql must be run first
--   2. For admin/store users, create them in Supabase Auth first:
--      - admin@vassoo.com (Password: Admin123!@#)
--      - storeowner@vassoo.com (Password: Store123!@#)
--
-- ============================================

-- ============================================
-- SECTION 1: US STATES (50 + DC)
-- ============================================

INSERT INTO us_states (fips_code, usps_code, name, timezone) VALUES
('01', 'AL', 'Alabama', 'America/Chicago'),
('02', 'AK', 'Alaska', 'America/Anchorage'),
('04', 'AZ', 'Arizona', 'America/Phoenix'),
('05', 'AR', 'Arkansas', 'America/Chicago'),
('06', 'CA', 'California', 'America/Los_Angeles'),
('08', 'CO', 'Colorado', 'America/Denver'),
('09', 'CT', 'Connecticut', 'America/New_York'),
('10', 'DE', 'Delaware', 'America/New_York'),
('11', 'DC', 'District of Columbia', 'America/New_York'),
('12', 'FL', 'Florida', 'America/New_York'),
('13', 'GA', 'Georgia', 'America/New_York'),
('15', 'HI', 'Hawaii', 'Pacific/Honolulu'),
('16', 'ID', 'Idaho', 'America/Boise'),
('17', 'IL', 'Illinois', 'America/Chicago'),
('18', 'IN', 'Indiana', 'America/Indiana/Indianapolis'),
('19', 'IA', 'Iowa', 'America/Chicago'),
('20', 'KS', 'Kansas', 'America/Chicago'),
('21', 'KY', 'Kentucky', 'America/New_York'),
('22', 'LA', 'Louisiana', 'America/Chicago'),
('23', 'ME', 'Maine', 'America/New_York'),
('24', 'MD', 'Maryland', 'America/New_York'),
('25', 'MA', 'Massachusetts', 'America/New_York'),
('26', 'MI', 'Michigan', 'America/Detroit'),
('27', 'MN', 'Minnesota', 'America/Chicago'),
('28', 'MS', 'Mississippi', 'America/Chicago'),
('29', 'MO', 'Missouri', 'America/Chicago'),
('30', 'MT', 'Montana', 'America/Denver'),
('31', 'NE', 'Nebraska', 'America/Chicago'),
('32', 'NV', 'Nevada', 'America/Los_Angeles'),
('33', 'NH', 'New Hampshire', 'America/New_York'),
('34', 'NJ', 'New Jersey', 'America/New_York'),
('35', 'NM', 'New Mexico', 'America/Denver'),
('36', 'NY', 'New York', 'America/New_York'),
('37', 'NC', 'North Carolina', 'America/New_York'),
('38', 'ND', 'North Dakota', 'America/Chicago'),
('39', 'OH', 'Ohio', 'America/New_York'),
('40', 'OK', 'Oklahoma', 'America/Chicago'),
('41', 'OR', 'Oregon', 'America/Los_Angeles'),
('42', 'PA', 'Pennsylvania', 'America/New_York'),
('44', 'RI', 'Rhode Island', 'America/New_York'),
('45', 'SC', 'South Carolina', 'America/New_York'),
('46', 'SD', 'South Dakota', 'America/Chicago'),
('47', 'TN', 'Tennessee', 'America/Chicago'),
('48', 'TX', 'Texas', 'America/Chicago'),
('49', 'UT', 'Utah', 'America/Denver'),
('50', 'VT', 'Vermont', 'America/New_York'),
('51', 'VA', 'Virginia', 'America/New_York'),
('53', 'WA', 'Washington', 'America/Los_Angeles'),
('54', 'WV', 'West Virginia', 'America/New_York'),
('55', 'WI', 'Wisconsin', 'America/Chicago'),
('56', 'WY', 'Wyoming', 'America/Denver')
ON CONFLICT (usps_code) DO NOTHING;

-- ============================================
-- SECTION 2: DEFAULT PLATFORM FEES
-- ============================================

INSERT INTO platform_fees (scope, name, fee_type, calculation_type, value, effective_date) VALUES
('global', 'Marketplace Commission', 'marketplace_commission', 'percentage', 0.10, CURRENT_DATE),
('global', 'Payment Processing Fee', 'processing_fee', 'percentage', 0.029, CURRENT_DATE),
('global', 'Delivery Platform Fee', 'delivery_platform_fee', 'percentage', 0.05, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ============================================
-- SECTION 3: PRODUCT CATEGORIES
-- ============================================

INSERT INTO public.product_categories (name, slug) VALUES 
('Spirits', 'spirits'),
('Wine', 'wine'),
('Beer', 'beer'),
('Mixers', 'mixers'),
('Accessories', 'accessories')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SECTION 4: PRODUCT BRANDS
-- ============================================

INSERT INTO public.product_brands (name, slug) VALUES 
('Johnnie Walker', 'johnnie-walker'),
('Grey Goose', 'grey-goose'),
('Casamigos', 'casamigos'),
('Moët & Chandon', 'moet-chandon'),
('Stella Artois', 'stella-artois'),
('Hennessy', 'hennessy'),
('Don Julio', 'don-julio'),
('Patrón', 'patron'),
('The Macallan', 'the-macallan'),
('Rémy Martin', 'remy-martin'),
('Veuve Clicquot', 'veuve-clicquot')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SECTION 5: PLATFORM SETTINGS
-- ============================================

INSERT INTO platform_settings (key, value, description, category, is_public) VALUES
('platform_name', '"Vassoo"', 'Name of the platform', 'general', TRUE),
('platform_tagline', '"Premium Spirits Marketplace"', 'Platform tagline', 'general', TRUE),
('support_email', '"support@vassoo.com"', 'Support email address', 'general', TRUE),
('support_phone', '"+1 (800) 555-0123"', 'Support phone number', 'general', TRUE),
('min_order_amount', '15.00', 'Minimum order amount in USD', 'orders', TRUE),
('max_delivery_distance_miles', '25', 'Maximum delivery distance in miles', 'delivery', TRUE),
('age_verification_required', 'true', 'Whether age verification is required', 'compliance', TRUE),
('min_age_for_alcohol', '21', 'Minimum age for alcohol purchase', 'compliance', TRUE),
('order_cancellation_window_minutes', '5', 'Minutes allowed for order cancellation', 'orders', FALSE),
('driver_assignment_timeout_seconds', '60', 'Seconds before reassigning delivery', 'delivery', FALSE),
('default_tip_percentages', '[15, 18, 20, 25]', 'Default tip percentage options', 'orders', TRUE),
('payment_methods_enabled', '["card", "apple_pay", "google_pay"]', 'Enabled payment methods', 'payments', TRUE),
('maintenance_mode', 'false', 'Whether platform is in maintenance mode', 'system', TRUE),
('footer_description', '"Your premium destination for spirits, wines, and liquors. Discover the finest selection from multiple stores with competitive prices and fast delivery."', 'Short description for the marketplace footer', 'general', TRUE),
('social_links', '{"facebook": "#", "twitter": "#", "instagram": "#", "youtube": "#"}', 'Social media links for the platform', 'general', TRUE),
('app_links', '{"apple": "#", "android": "#"}', 'Download links for mobile applications', 'general', TRUE),
('contact_info', '{"address": "123 Liquor Street, New York, NY 10001", "phone": "(555) 123-4567", "email": "info@liquorhub.com"}', 'Platform contact information', 'general', TRUE),
('stripe_config', '{
    "publishableKey": "",
    "mode": "test",
    "webhookEndpoint": "/api/stripe/webhooks",
    "connect": {
        "enabled": true,
        "accountType": "express",
        "platformFeePercent": 10,
        "capabilities": {
            "card_payments": true,
            "transfers": true
        }
    }
}', 'Stripe payment configuration', 'stripe', FALSE),
('email_config', '{
    "provider": "resend",
    "fromAddress": "noreply@vassoo.com",
    "fromName": "Vassoo",
    "smtpHost": "",
    "smtpPort": 587,
    "smtpSecure": true,
    "smtpUser": ""
}', 'Email service configuration', 'email', FALSE),
('google_api_config', '{
    "enabled": false,
    "services": {
        "places": true,
        "maps": true,
        "geocoding": true
    }
}', 'Google API configuration for Places, Maps and Geocoding', 'google', FALSE)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================
-- SECTION 6: PAGE CONTENT (CMS)
-- ============================================

INSERT INTO page_content (slug, title, category, content, is_published) VALUES
-- About Us pages
('about/who-we-are', 'Who We Are', 'about',
'<h1>Who We Are</h1>
<p>Welcome to our premium beverage marketplace. We are dedicated to bringing you the finest selection of spirits, wines, and liquors from trusted vendors across the region.</p>
<h2>Our Story</h2>
<p>Founded with a passion for quality beverages, we have grown to become a trusted platform connecting discerning customers with reputable stores.</p>
<h2>Our Values</h2>
<ul>
<li><strong>Quality</strong>: We partner only with verified, licensed retailers</li>
<li><strong>Convenience</strong>: Shop from multiple stores in one place</li>
<li><strong>Trust</strong>: Secure payments and reliable delivery</li>
<li><strong>Selection</strong>: Extensive catalog of premium beverages</li>
</ul>', TRUE),

('about/our-mission', 'Our Mission', 'about',
'<h1>Our Mission</h1>
<p>Our mission is to revolutionize how you discover and purchase premium beverages by creating a seamless marketplace that connects you with the best local and national retailers.</p>
<h2>What We Believe</h2>
<p>We believe everyone deserves access to quality spirits, exceptional service, and competitive prices. Our platform makes this possible by:</p>
<ul>
<li>Aggregating inventory from multiple trusted vendors</li>
<li>Providing transparent pricing and delivery options</li>
<li>Ensuring age verification and responsible sales</li>
<li>Supporting local businesses and communities</li>
</ul>', TRUE),

('about/location-hours', 'Location & Hours', 'about',
'<h1>Location &amp; Hours</h1>
<h2>Contact Us</h2>
<p>Our customer support team is available to assist you with any questions or concerns.</p>
<p><strong>Customer Support Hours:</strong></p>
<ul>
<li>Monday - Friday: 9:00 AM - 8:00 PM EST</li>
<li>Saturday: 10:00 AM - 6:00 PM EST</li>
<li>Sunday: 12:00 PM - 5:00 PM EST</li>
</ul>
<p><strong>Delivery Hours:</strong></p>
<p>Delivery times vary by store and location. Please check individual store pages for their specific delivery schedules.</p>
<h2>Headquarters</h2>
<p>Contact information can be found in our footer or contact page.</p>', TRUE),

('about/work-with-us', 'Work With Us', 'about',
'<h1>Work With Us</h1>
<h2>Join Our Team</h2>
<p>We are always looking for talented individuals to join our growing team. Check back for current openings.</p>
<h2>Become a Partner Store</h2>
<p>Are you a licensed retailer looking to expand your reach? Partner with us to:</p>
<ul>
<li>Access a larger customer base</li>
<li>Benefit from our marketing and technology platform</li>
<li>Streamline your delivery operations</li>
<li>Grow your business with data-driven insights</li>
</ul>
<p>Contact us to learn more about partnership opportunities.</p>
<h2>Delivery Partners</h2>
<p>We work with professional delivery services to ensure safe, timely delivery of orders. If you are interested in becoming a delivery partner, please reach out to our partnerships team.</p>', TRUE),

-- Customer Support pages
('support/faq', 'Frequently Asked Questions', 'support',
'<h1>Frequently Asked Questions</h1>
<h2>Orders &amp; Delivery</h2>
<p><strong>How long does delivery take?</strong></p>
<p>Delivery times vary by store and location. Most orders are delivered within 1-3 business days. Express delivery may be available in select areas.</p>
<p><strong>Can I track my order?</strong></p>
<p>Yes! Once your order is shipped, you will receive a tracking number via email.</p>
<p><strong>What if my order arrives damaged?</strong></p>
<p>Contact our support team immediately with photos of the damage. We will arrange a replacement or refund.</p>
<h2>Payments</h2>
<p><strong>What payment methods do you accept?</strong></p>
<p>We accept all major credit cards, debit cards, and select digital wallets.</p>
<p><strong>Is my payment information secure?</strong></p>
<p>Yes, we use industry-standard encryption and never store your full card details.</p>
<h2>Account</h2>
<p><strong>How do I create an account?</strong></p>
<p>Click "Sign Up" and follow the prompts. You will need to verify your age to complete registration.</p>
<p><strong>I forgot my password. What do I do?</strong></p>
<p>Click "Forgot Password" on the login page and follow the instructions sent to your email.</p>', TRUE),

('support/shipping-delivery', 'Shipping & Delivery', 'support',
'<h1>Shipping &amp; Delivery</h1>
<h2>Delivery Options</h2>
<p>Delivery options vary by store and your location. Available options may include:</p>
<ul>
<li><strong>Standard Delivery</strong>: 2-5 business days</li>
<li><strong>Express Delivery</strong>: Same-day or next-day (where available)</li>
<li><strong>Scheduled Delivery</strong>: Choose a specific date and time window</li>
</ul>
<h2>Delivery Fees</h2>
<p>Delivery fees are calculated based on:</p>
<ul>
<li>Distance from the store</li>
<li>Order total (free delivery thresholds may apply)</li>
<li>Delivery speed selected</li>
</ul>
<h2>Delivery Requirements</h2>
<ul>
<li>Someone 21+ must be present to receive the order</li>
<li>Valid ID will be checked upon delivery</li>
<li>Signature may be required</li>
</ul>', TRUE),

('support/returns-refunds', 'Returns & Refunds', 'support',
'<h1>Returns &amp; Refunds</h1>
<h2>Return Policy</h2>
<p>Due to the nature of our products, we can only accept returns for:</p>
<ul>
<li>Damaged or defective products</li>
<li>Incorrect items received</li>
<li>Products that do not match the description</li>
</ul>
<h2>How to Request a Return</h2>
<ol>
<li>Contact our support team within 48 hours of delivery</li>
<li>Provide your order number and photos of the issue</li>
<li>Our team will review and respond within 24 hours</li>
</ol>
<h2>Refund Timeline</h2>
<p>Once approved, refunds are processed within 5-7 business days.</p>', TRUE),

('support/contact-us', 'Contact Us', 'support',
'<h1>Contact Us</h1>
<h2>Get in Touch</h2>
<p>We are here to help! Choose the best way to reach us:</p>
<h3>Customer Support</h3>
<ul>
<li><strong>Email:</strong> support@vassoo.com</li>
<li><strong>Phone:</strong> +1 (800) 555-0123</li>
<li><strong>Hours:</strong> Mon-Fri 9AM-8PM, Sat 10AM-6PM, Sun 12PM-5PM EST</li>
</ul>
<h3>Business Inquiries</h3>
<ul>
<li><strong>Email:</strong> partnerships@vassoo.com</li>
</ul>
<h3>Press & Media</h3>
<ul>
<li><strong>Email:</strong> press@vassoo.com</li>
</ul>', TRUE),

-- Legal pages
('legal/terms-of-service', 'Terms of Service', 'legal',
'<h1>Terms of Service</h1>
<p>Last updated: January 2026</p>
<h2>1. Acceptance of Terms</h2>
<p>By accessing or using our services, you agree to be bound by these Terms of Service.</p>
<h2>2. Age Requirement</h2>
<p>You must be at least 21 years of age to use our services and purchase alcohol products.</p>
<h2>3. Account Responsibility</h2>
<p>You are responsible for maintaining the security of your account and all activities under it.</p>
<h2>4. Prohibited Activities</h2>
<p>You may not use our services for any illegal purpose, including but not limited to purchasing alcohol for minors.</p>
<h2>5. Modifications</h2>
<p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance of changes.</p>', TRUE),

('legal/privacy-policy', 'Privacy Policy', 'legal',
'<h1>Privacy Policy</h1>
<p>Last updated: January 2026</p>
<h2>1. Information We Collect</h2>
<p>We collect information you provide directly, including name, email, address, payment details, and age verification data.</p>
<h2>2. How We Use Your Information</h2>
<p>We use your information to process orders, verify age, communicate with you, and improve our services.</p>
<h2>3. Information Sharing</h2>
<p>We share information with stores fulfilling your orders, payment processors, and delivery partners as necessary.</p>
<h2>4. Data Security</h2>
<p>We implement industry-standard security measures to protect your personal information.</p>
<h2>5. Your Rights</h2>
<p>You may access, correct, or delete your personal information by contacting us.</p>', TRUE),

('legal/cookie-policy', 'Cookie Policy', 'legal',
'<h1>Cookie Policy</h1>
<p>Last updated: January 2026</p>
<h2>What Are Cookies</h2>
<p>Cookies are small text files stored on your device when you visit our website.</p>
<h2>How We Use Cookies</h2>
<ul>
<li><strong>Essential Cookies:</strong> Required for site functionality</li>
<li><strong>Analytics Cookies:</strong> Help us understand how you use our site</li>
<li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
</ul>
<h2>Managing Cookies</h2>
<p>You can control cookies through your browser settings.</p>', TRUE),

('legal/accessibility', 'Accessibility Statement', 'legal',
'<h1>Accessibility Statement</h1>
<p>We are committed to ensuring digital accessibility for people with disabilities.</p>
<h2>Our Commitment</h2>
<p>We strive to meet WCAG 2.1 Level AA standards across our platform.</p>
<h2>Feedback</h2>
<p>If you encounter accessibility barriers, please contact us at accessibility@vassoo.com.</p>', TRUE)

ON CONFLICT (slug) DO UPDATE SET content = EXCLUDED.content, is_published = EXCLUDED.is_published;

-- ============================================
-- SECTION 7: DEMO DATA (Admin & Store)
-- Note: Run this section AFTER creating users in Supabase Auth
-- ============================================

DO $$
DECLARE
    admin_user_id UUID;
    store_owner_id UUID;
    tenant_store_id UUID;
    store_id UUID;
    location_id UUID;
BEGIN
    -- Check if admin profile exists
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

    -- Check if store owner profile exists
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
        
        -- Create demo tenant
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
            'acct_demo_123456',
            'active',
            true
        )
        ON CONFLICT (slug) DO UPDATE SET status = 'active'
        RETURNING id INTO tenant_store_id;
        
        -- Create membership for store owner
        INSERT INTO public.tenant_memberships (user_id, tenant_id, role, is_active, accepted_at)
        VALUES (store_owner_id, tenant_store_id, 'owner', true, NOW())
        ON CONFLICT DO NOTHING;
        
        -- Create store record
        INSERT INTO public.stores (
            id, tenant_id, name, slug, description, email, phone,
            is_active, license_number, license_state, license_expiry,
            average_rating, total_reviews
        )
        VALUES (
            gen_random_uuid(),
            tenant_store_id,
            'Premium Spirits NYC',
            'premium-spirits-nyc',
            'New York''s premier destination for fine spirits, wines, and craft beers.',
            'contact@premiumspirits.com',
            '+1 555-123-4567',
            true,
            'NY-LIQ-2024-001234',
            'NY',
            '2025-12-31',
            4.8,
            234
        )
        ON CONFLICT (slug) DO UPDATE SET is_active = true
        RETURNING id INTO store_id;
        
        -- Create store location
        INSERT INTO public.store_locations (
            id, store_id, name, address_line1, city, state, zip_code, country,
            is_primary, is_active,
            coordinates
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
            true,
            true,
            ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326)::geography
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO location_id;
        
        RAISE NOTICE 'Store created: % with location %', store_id, location_id;
        
        -- Create master products
        INSERT INTO public.master_products (id, sku, name, brand, category, subcategory, description, thumbnail_url, age_restriction, is_active)
        VALUES 
            (gen_random_uuid(), 'JW-BLUE-750', 'Johnnie Walker Blue Label', 'Johnnie Walker', 'Whisky', 'Scotch', 'Premium blended Scotch whisky with exceptional depth and character.', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400', 21, true),
            (gen_random_uuid(), 'MC-BRUT-750', 'Moët & Chandon Brut Impérial', 'Moët & Chandon', 'Champagne', 'Brut', 'The House''s iconic champagne with bright fruitiness and elegant maturity.', 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=400', 21, true),
            (gen_random_uuid(), 'HY-XO-750', 'Hennessy XO', 'Hennessy', 'Cognac', 'XO', 'Rich, complex cognac with notes of candied fruit and spice.', 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=400', 21, true),
            (gen_random_uuid(), 'GG-VDK-750', 'Grey Goose Vodka', 'Grey Goose', 'Vodka', 'Premium', 'French wheat vodka with a smooth, subtle taste.', 'https://images.unsplash.com/photo-1608885898957-a559228e8749?w=400', 21, true),
            (gen_random_uuid(), 'DJ-1942-750', 'Don Julio 1942', 'Don Julio', 'Tequila', 'Añejo', 'Luxury tequila with warm oak, vanilla, and roasted agave notes.', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400', 21, true),
            (gen_random_uuid(), 'PT-SLV-750', 'Patrón Silver', 'Patrón', 'Tequila', 'Blanco', 'Ultra-premium silver tequila with a smooth, sweet taste.', 'https://images.unsplash.com/photo-1585975754487-acc8f37b8c4c?w=400', 21, true),
            (gen_random_uuid(), 'MC-18-750', 'The Macallan 18 Year', 'The Macallan', 'Whisky', 'Single Malt', 'Rich dried fruit, ginger, and wood smoke. Full-bodied and complex.', 'https://images.unsplash.com/photo-1602091220693-5c3b4e6e0e4c?w=400', 21, true),
            (gen_random_uuid(), 'RM-XO-750', 'Rémy Martin XO', 'Rémy Martin', 'Cognac', 'XO', 'Opulent cognac with rich fruity and spicy flavors.', 'https://images.unsplash.com/photo-1598977123118-4e30ba3c4f5b?w=400', 21, true),
            (gen_random_uuid(), 'BV-RSRV-750', 'Beaulieu Vineyard Reserve Cabernet', 'BV', 'Wine', 'Red', 'Full-bodied Cabernet Sauvignon with dark fruit and oak.', 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=400', 21, true),
            (gen_random_uuid(), 'VP-CLQT-750', 'Veuve Clicquot Yellow Label', 'Veuve Clicquot', 'Champagne', 'Brut', 'Bold and fresh champagne with apple and toasty notes.', 'https://images.unsplash.com/photo-1571104508999-893933ded431?w=400', 21, true)
        ON CONFLICT (sku) DO NOTHING;
        
        -- Create store inventory
        INSERT INTO public.store_inventories (store_id, store_location_id, product_id, price, cost, quantity, low_stock_threshold, is_available)
        SELECT 
            store_id,
            location_id,
            mp.id,
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
            FLOOR(RANDOM() * 50 + 5)::INT,
            10,
            true
        FROM public.master_products mp
        WHERE mp.sku IN ('JW-BLUE-750', 'MC-BRUT-750', 'HY-XO-750', 'GG-VDK-750', 'DJ-1942-750', 'PT-SLV-750', 'MC-18-750', 'RM-XO-750', 'BV-RSRV-750', 'VP-CLQT-750')
        ON CONFLICT DO NOTHING;
        
        -- Create store delivery settings
        INSERT INTO store_delivery_settings (
            store_id,
            is_delivery_enabled,
            is_pickup_enabled,
            base_delivery_fee,
            minimum_order_amount,
            free_delivery_threshold,
            delivery_radius_miles,
            auto_assign_delivery
        )
        VALUES (
            store_id,
            true,
            true,
            4.99,
            25.00,
            75.00,
            10.0,
            false
        )
        ON CONFLICT (store_id) DO NOTHING;
        
        RAISE NOTICE 'Demo products and inventory created';
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

SELECT 'US States' as entity, COUNT(*) as count FROM us_states;
SELECT 'Platform Fees' as entity, COUNT(*) as count FROM platform_fees;
SELECT 'Product Categories' as entity, COUNT(*) as count FROM product_categories;
SELECT 'Product Brands' as entity, COUNT(*) as count FROM product_brands;
SELECT 'Platform Settings' as entity, COUNT(*) as count FROM platform_settings;
SELECT 'Page Content' as entity, COUNT(*) as count FROM page_content;
SELECT 'Platform Admins' as entity, COUNT(*) as count FROM platform_admins;
SELECT 'Tenants' as entity, COUNT(*) as count FROM tenants;
SELECT 'Stores' as entity, COUNT(*) as count FROM stores;
SELECT 'Master Products' as entity, COUNT(*) as count FROM master_products;
SELECT 'Store Inventories' as entity, COUNT(*) as count FROM store_inventories;

-- ============================================
-- END OF SEED DATA
-- ============================================
