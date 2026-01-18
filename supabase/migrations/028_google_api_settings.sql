-- ============================================
-- Migration: 028_google_api_settings
-- Description: Add Google API configuration default settings
-- ============================================

-- Google API configuration (non-sensitive parts)
INSERT INTO platform_settings (key, value, description, category, is_public) VALUES
('google_api_config', '{
    "enabled": false,
    "services": {
        "places": true,
        "maps": true,
        "geocoding": true
    }
}', 'Google API configuration for Places, Maps and Geocoding', 'google', FALSE)
ON CONFLICT (key) DO NOTHING;
