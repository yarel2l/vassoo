-- ============================================
-- Migration: 003_tenants
-- Description: Multi-tenancy tables (tenants, memberships)
-- ============================================

-- ============================================
-- TENANTS
-- ============================================

CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic info
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type tenant_type NOT NULL,
    status tenant_status DEFAULT 'pending',
    
    -- Stripe Connect
    stripe_account_id TEXT,
    stripe_account_status stripe_account_status DEFAULT 'pending',
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    
    -- Contact
    email TEXT NOT NULL,
    phone TEXT,
    
    -- Configuration
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Onboarding
    onboarding_step INT DEFAULT 1,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TENANT MEMBERSHIPS
-- ============================================

CREATE TABLE public.tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role membership_role NOT NULL,
    
    -- Granular permissions
    permissions JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    invited_by UUID REFERENCES profiles(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, tenant_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_type ON tenants(type);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_stripe ON tenants(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

CREATE INDEX idx_tenant_memberships_user ON tenant_memberships(user_id);
CREATE INDEX idx_tenant_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX idx_tenant_memberships_active ON tenant_memberships(user_id, is_active) WHERE is_active = TRUE;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_memberships_updated_at
    BEFORE UPDATE ON tenant_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get user's tenants
CREATE OR REPLACE FUNCTION get_user_tenants(p_user_id UUID)
RETURNS TABLE (
    tenant_id UUID,
    tenant_name TEXT,
    tenant_type tenant_type,
    user_role membership_role
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.type,
        tm.role
    FROM tenants t
    JOIN tenant_memberships tm ON tm.tenant_id = t.id
    WHERE tm.user_id = p_user_id
    AND tm.is_active = TRUE
    AND t.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has role in tenant
CREATE OR REPLACE FUNCTION user_has_tenant_role(
    p_user_id UUID,
    p_tenant_id UUID,
    p_roles membership_role[]
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE user_id = p_user_id
        AND tenant_id = p_tenant_id
        AND role = ANY(p_roles)
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
