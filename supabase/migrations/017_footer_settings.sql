-- ============================================
-- Migration: 017_footer_settings
-- Description: Refactor platform_settings to key-value and add footer settings
-- ============================================

-- 1. Backup existing settings
CREATE TEMP TABLE platform_settings_backup AS SELECT * FROM platform_settings;

-- 2. Drop and Recreate platform_settings with key-value schema
DROP TABLE IF EXISTS platform_settings CASCADE;

CREATE TABLE public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Restore settings from backup
INSERT INTO platform_settings (key, value, description, category, is_public)
SELECT 'platform_name', to_jsonb(platform_name), 'Name of the platform', 'general', TRUE FROM platform_settings_backup
UNION ALL
SELECT 'default_currency', to_jsonb(default_currency), 'Default currency for the platform', 'general', TRUE FROM platform_settings_backup
UNION ALL
SELECT 'default_language', to_jsonb(default_language), 'Default language for the platform', 'general', TRUE FROM platform_settings_backup
UNION ALL
SELECT 'maintenance_mode', to_jsonb(maintenance_mode), 'Whether platform is in maintenance mode', 'system', TRUE FROM platform_settings_backup;

-- 4. Add footer specific settings
INSERT INTO platform_settings (key, value, description, category, is_public) VALUES
('footer_description', '"Your premium destination for spirits, wines, and liquors. Discover the finest selection from multiple stores with competitive prices and fast delivery."', 'Short description for the marketplace footer', 'general', TRUE),
('social_links', '{"facebook": "#", "twitter": "#", "instagram": "#", "youtube": "#"}', 'Social media links for the platform', 'general', TRUE),
('app_links', '{"apple": "#", "android": "#"}', 'Download links for mobile applications', 'general', TRUE),
('contact_info', '{"address": "123 Liquor Street, New York, NY 10001", "phone": "(555) 123-4567", "email": "info@liquorhub.com"}', 'Platform contact information', 'general', TRUE),
('platform_tagline', '"Premium Spirits Marketplace"', 'Platform tagline', 'general', TRUE);

-- 5. Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view public settings"
ON platform_settings FOR SELECT
USING (is_public = TRUE);

CREATE POLICY "Platform admins can manage all settings"
ON platform_settings FOR ALL
USING (is_platform_admin());
