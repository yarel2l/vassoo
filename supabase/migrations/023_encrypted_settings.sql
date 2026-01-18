-- ============================================
-- Migration: 023_encrypted_settings
-- Description: Encrypted settings table for sensitive API keys
-- ============================================

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- ENCRYPTED SETTINGS TABLE
-- Stores sensitive data like API keys encrypted at rest
-- ============================================

CREATE TABLE public.encrypted_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Setting identifier
    setting_key TEXT NOT NULL UNIQUE,

    -- Category for grouping (stripe, email, etc.)
    setting_category TEXT NOT NULL DEFAULT 'general',

    -- Encrypted value (encrypted by application layer with AES-256-GCM)
    -- Format: base64(iv:ciphertext:authTag)
    encrypted_value TEXT NOT NULL,

    -- Metadata (not encrypted - for display purposes)
    description TEXT,

    -- Audit
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_encrypted_settings_category ON encrypted_settings(setting_category);
CREATE INDEX idx_encrypted_settings_key ON encrypted_settings(setting_key);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE encrypted_settings ENABLE ROW LEVEL SECURITY;

-- Only platform admins can access encrypted settings
CREATE POLICY "Platform admins can view encrypted settings"
ON encrypted_settings FOR SELECT
USING (is_platform_admin());

CREATE POLICY "Platform admins can insert encrypted settings"
ON encrypted_settings FOR INSERT
WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admins can update encrypted settings"
ON encrypted_settings FOR UPDATE
USING (is_platform_admin());

CREATE POLICY "Platform admins can delete encrypted settings"
ON encrypted_settings FOR DELETE
USING (is_platform_admin());

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_encrypted_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER encrypted_settings_updated_at
    BEFORE UPDATE ON encrypted_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_encrypted_settings_updated_at();

-- ============================================
-- ADD STRIPE AND EMAIL CATEGORIES TO platform_settings
-- ============================================

-- Stripe configuration (non-sensitive parts)
INSERT INTO platform_settings (key, value, description, category, is_public) VALUES
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
}', 'Stripe payment configuration', 'stripe', FALSE)
ON CONFLICT (key) DO NOTHING;

-- Email configuration (non-sensitive parts)
INSERT INTO platform_settings (key, value, description, category, is_public) VALUES
('email_config', '{
    "provider": "resend",
    "fromAddress": "noreply@vassoo.com",
    "fromName": "Vassoo",
    "smtpHost": "",
    "smtpPort": 587,
    "smtpSecure": true,
    "smtpUser": ""
}', 'Email service configuration', 'email', FALSE)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- HELPER: Log settings changes to audit_logs
-- ============================================

CREATE OR REPLACE FUNCTION log_encrypted_setting_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit(
            'create',
            'encrypted_setting',
            NEW.id,
            NULL,
            jsonb_build_object(
                'setting_key', NEW.setting_key,
                'setting_category', NEW.setting_category
            ),
            jsonb_build_object('action', 'Setting created')
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit(
            'update',
            'encrypted_setting',
            NEW.id,
            jsonb_build_object('setting_key', OLD.setting_key),
            jsonb_build_object('setting_key', NEW.setting_key),
            jsonb_build_object('action', 'Setting updated')
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit(
            'delete',
            'encrypted_setting',
            OLD.id,
            jsonb_build_object(
                'setting_key', OLD.setting_key,
                'setting_category', OLD.setting_category
            ),
            NULL,
            jsonb_build_object('action', 'Setting deleted')
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_encrypted_settings
    AFTER INSERT OR UPDATE OR DELETE ON encrypted_settings
    FOR EACH ROW
    EXECUTE FUNCTION log_encrypted_setting_change();
