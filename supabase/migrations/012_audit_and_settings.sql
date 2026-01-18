-- ============================================
-- Migration: 012_audit_and_settings
-- Description: Audit logs and platform settings
-- ============================================

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who
    user_id UUID REFERENCES profiles(id),
    tenant_id UUID REFERENCES tenants(id),
    
    -- What
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
    entity_type TEXT NOT NULL, -- 'order', 'product', 'user', etc.
    entity_id UUID,
    
    -- Details
    old_values JSONB,
    new_values JSONB,
    
    -- Request info
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLATFORM SETTINGS
-- ============================================

CREATE TABLE public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general', -- 'general', 'payments', 'notifications', etc.
    is_public BOOLEAN DEFAULT FALSE, -- If true, visible to all authenticated users
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TYPE notification_type AS ENUM (
    'order_placed', 'order_confirmed', 'order_ready', 'order_delivered',
    'delivery_assigned', 'delivery_pickup', 'delivery_complete',
    'review_received', 'review_response',
    'promotion_started', 'price_alert',
    'stock_low', 'license_expiring',
    'payment_received', 'payout_processed',
    'system_announcement'
);

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Content
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}', -- Additional data (order_id, etc.)
    
    -- Link
    action_url TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- Delivery
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    sms_sent BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Audit logs: only platform admins
CREATE POLICY "Platform admins can view audit logs"
ON audit_logs FOR SELECT
USING (is_platform_admin());

CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (TRUE);

-- Platform settings: public settings visible, admin can manage
CREATE POLICY "Public can view public settings"
ON platform_settings FOR SELECT
USING (is_public = TRUE);

CREATE POLICY "Platform admins can manage all settings"
ON platform_settings FOR ALL
USING (is_platform_admin());

-- Notifications: users can see their own
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- ============================================
-- SEED: Default Platform Settings
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
('maintenance_mode', 'false', 'Whether platform is in maintenance mode', 'system', TRUE);

-- ============================================
-- HELPER FUNCTION: Create notification
-- ============================================

CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_body TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}',
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, body, data, action_url)
    VALUES (p_user_id, p_type, p_title, p_body, p_data, p_action_url)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Log audit event
-- ============================================

CREATE OR REPLACE FUNCTION log_audit(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_user_id UUID;
    v_tenant_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Try to get tenant from context if available
    -- This would be set by the application
    
    INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id,
        old_values, new_values, metadata
    )
    VALUES (
        v_user_id, p_action, p_entity_type, p_entity_id,
        p_old_values, p_new_values, p_metadata
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
