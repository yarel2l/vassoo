-- ============================================
-- Migration: 022_hybrid_catalog
-- Description: Hybrid catalog model - store custom products with approval workflow
-- ============================================

-- ============================================
-- PRODUCT APPROVAL STATUS TYPE
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_approval_status') THEN
        CREATE TYPE product_approval_status AS ENUM (
            'draft',           -- Store is still editing, not submitted
            'pending_review',  -- Submitted for platform review
            'approved',        -- Approved for use in store
            'rejected',        -- Rejected by platform
            'promoted'         -- Promoted to master catalog
        );
    END IF;
END $$;

-- ============================================
-- STORE CUSTOM PRODUCTS
-- Products created by store owners that are not in master catalog
-- ============================================

CREATE TABLE IF NOT EXISTS public.store_custom_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- Identification (store-level unique)
    sku TEXT NOT NULL,
    upc TEXT,

    -- Basic info
    name TEXT NOT NULL,
    brand TEXT,
    description TEXT,

    -- Categorization
    category TEXT NOT NULL,
    subcategory TEXT,
    tags TEXT[] DEFAULT '{}',

    -- Specifications (flexible JSON)
    specifications JSONB DEFAULT '{}',

    -- Images
    images TEXT[] DEFAULT '{}',
    thumbnail_url TEXT,

    -- Restrictions
    age_restriction INT DEFAULT 21,

    -- SEO
    slug TEXT,
    meta_title TEXT,
    meta_description TEXT,

    -- Pricing (store-specific since it's their product)
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2),
    cost DECIMAL(10,2),

    -- Stock
    quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,

    -- Approval workflow
    approval_status product_approval_status DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,

    -- If promoted to master catalog, link to master product
    promoted_to_master_id UUID REFERENCES master_products(id),
    promoted_at TIMESTAMPTZ,

    -- Status
    is_available BOOLEAN DEFAULT FALSE, -- Only available after approval
    is_featured BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Store-level unique SKU
    UNIQUE(store_id, sku)
);

-- ============================================
-- PRODUCT APPROVAL HISTORY
-- Track all approval actions for audit
-- ============================================

CREATE TABLE IF NOT EXISTS public.product_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_product_id UUID NOT NULL REFERENCES store_custom_products(id) ON DELETE CASCADE,

    action TEXT NOT NULL, -- 'submitted', 'approved', 'rejected', 'promoted', 'returned_to_draft'
    from_status product_approval_status,
    to_status product_approval_status NOT NULL,

    notes TEXT,
    performed_by UUID REFERENCES profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- UNIFIED STORE PRODUCTS VIEW
-- Combines master products (via inventory) and custom products
-- ============================================

CREATE OR REPLACE VIEW store_products_unified AS
SELECT
    si.id AS inventory_id,
    si.store_id,
    mp.id AS product_id,
    NULL::UUID AS custom_product_id,
    'master' AS product_source,

    mp.sku,
    mp.upc,
    mp.name,
    mp.brand,
    mp.description,
    mp.category,
    mp.subcategory,
    mp.tags,
    mp.specifications,
    mp.images,
    mp.thumbnail_url,
    mp.age_restriction,
    mp.slug,

    si.price,
    si.compare_at_price,
    si.cost,
    si.quantity,
    si.low_stock_threshold,
    si.is_available,
    si.is_featured,

    'approved'::product_approval_status AS approval_status,

    si.created_at,
    si.updated_at
FROM store_inventories si
JOIN master_products mp ON mp.id = si.product_id
WHERE mp.is_active = TRUE

UNION ALL

SELECT
    scp.id AS inventory_id, -- Using custom product id as inventory_id for consistency
    scp.store_id,
    NULL::UUID AS product_id,
    scp.id AS custom_product_id,
    'custom' AS product_source,

    scp.sku,
    scp.upc,
    scp.name,
    scp.brand,
    scp.description,
    scp.category,
    scp.subcategory,
    scp.tags,
    scp.specifications,
    scp.images,
    scp.thumbnail_url,
    scp.age_restriction,
    scp.slug,

    scp.price,
    scp.compare_at_price,
    scp.cost,
    scp.quantity,
    scp.low_stock_threshold,
    scp.is_available,
    scp.is_featured,

    scp.approval_status,

    scp.created_at,
    scp.updated_at
FROM store_custom_products scp;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_store_custom_products_store ON store_custom_products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_custom_products_sku ON store_custom_products(store_id, sku);
CREATE INDEX IF NOT EXISTS idx_store_custom_products_status ON store_custom_products(approval_status);
CREATE INDEX IF NOT EXISTS idx_store_custom_products_pending ON store_custom_products(approval_status)
    WHERE approval_status = 'pending_review';
CREATE INDEX IF NOT EXISTS idx_store_custom_products_category ON store_custom_products(category);
CREATE INDEX IF NOT EXISTS idx_store_custom_products_available ON store_custom_products(store_id, is_available)
    WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_store_custom_products_name ON store_custom_products
    USING GIN (to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_product_approval_history_product ON product_approval_history(custom_product_id);
CREATE INDEX IF NOT EXISTS idx_product_approval_history_date ON product_approval_history(created_at);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_store_custom_products_updated_at
    BEFORE UPDATE ON store_custom_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-set submitted_at when status changes to pending_review
CREATE OR REPLACE FUNCTION set_product_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.approval_status = 'pending_review' AND OLD.approval_status != 'pending_review' THEN
        NEW.submitted_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_custom_product_submitted_at
    BEFORE UPDATE ON store_custom_products
    FOR EACH ROW
    EXECUTE FUNCTION set_product_submitted_at();

-- Auto-set is_available based on approval status
CREATE OR REPLACE FUNCTION update_product_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Only approved products can be available
    IF NEW.approval_status != 'approved' AND NEW.approval_status != 'promoted' THEN
        NEW.is_available := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_custom_product_availability
    BEFORE INSERT OR UPDATE ON store_custom_products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_availability();

-- Track approval history automatically
CREATE OR REPLACE FUNCTION track_approval_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
        INSERT INTO product_approval_history (
            custom_product_id,
            action,
            from_status,
            to_status,
            performed_by
        ) VALUES (
            NEW.id,
            CASE NEW.approval_status
                WHEN 'pending_review' THEN 'submitted'
                WHEN 'approved' THEN 'approved'
                WHEN 'rejected' THEN 'rejected'
                WHEN 'promoted' THEN 'promoted'
                WHEN 'draft' THEN 'returned_to_draft'
                ELSE 'status_changed'
            END,
            OLD.approval_status,
            NEW.approval_status,
            NEW.reviewed_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_custom_product_approval
    AFTER UPDATE ON store_custom_products
    FOR EACH ROW
    EXECUTE FUNCTION track_approval_status_change();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Submit product for review
CREATE OR REPLACE FUNCTION submit_custom_product_for_review(p_product_id UUID)
RETURNS store_custom_products AS $$
DECLARE
    v_product store_custom_products;
BEGIN
    UPDATE store_custom_products
    SET approval_status = 'pending_review'
    WHERE id = p_product_id
    AND approval_status IN ('draft', 'rejected')
    RETURNING * INTO v_product;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or cannot be submitted';
    END IF;

    RETURN v_product;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve product
CREATE OR REPLACE FUNCTION approve_custom_product(
    p_product_id UUID,
    p_reviewer_id UUID
)
RETURNS store_custom_products AS $$
DECLARE
    v_product store_custom_products;
BEGIN
    UPDATE store_custom_products
    SET
        approval_status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = p_reviewer_id,
        is_available = TRUE
    WHERE id = p_product_id
    AND approval_status = 'pending_review'
    RETURNING * INTO v_product;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or not pending review';
    END IF;

    RETURN v_product;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject product
CREATE OR REPLACE FUNCTION reject_custom_product(
    p_product_id UUID,
    p_reviewer_id UUID,
    p_reason TEXT
)
RETURNS store_custom_products AS $$
DECLARE
    v_product store_custom_products;
BEGIN
    UPDATE store_custom_products
    SET
        approval_status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = p_reviewer_id,
        rejection_reason = p_reason,
        is_available = FALSE
    WHERE id = p_product_id
    AND approval_status = 'pending_review'
    RETURNING * INTO v_product;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or not pending review';
    END IF;

    RETURN v_product;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Promote custom product to master catalog
CREATE OR REPLACE FUNCTION promote_custom_to_master(
    p_custom_product_id UUID,
    p_reviewer_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_custom store_custom_products;
    v_master_id UUID;
    v_new_sku TEXT;
BEGIN
    -- Get custom product
    SELECT * INTO v_custom
    FROM store_custom_products
    WHERE id = p_custom_product_id
    AND approval_status = 'approved';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or not approved';
    END IF;

    -- Generate unique SKU for master catalog
    v_new_sku := 'MP-' || UPPER(SUBSTRING(v_custom.category FROM 1 FOR 3)) || '-' ||
                 LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');

    -- Insert into master products
    INSERT INTO master_products (
        sku,
        upc,
        name,
        brand,
        description,
        category,
        subcategory,
        tags,
        specifications,
        images,
        thumbnail_url,
        age_restriction,
        slug,
        meta_title,
        meta_description,
        is_active
    ) VALUES (
        v_new_sku,
        v_custom.upc,
        v_custom.name,
        v_custom.brand,
        v_custom.description,
        v_custom.category,
        v_custom.subcategory,
        v_custom.tags,
        v_custom.specifications,
        v_custom.images,
        v_custom.thumbnail_url,
        v_custom.age_restriction,
        v_custom.slug,
        v_custom.meta_title,
        v_custom.meta_description,
        TRUE
    ) RETURNING id INTO v_master_id;

    -- Update custom product as promoted
    UPDATE store_custom_products
    SET
        approval_status = 'promoted',
        promoted_to_master_id = v_master_id,
        promoted_at = NOW(),
        reviewed_by = p_reviewer_id
    WHERE id = p_custom_product_id;

    -- Create inventory entry for the store
    INSERT INTO store_inventories (
        store_id,
        product_id,
        price,
        compare_at_price,
        cost,
        quantity,
        low_stock_threshold,
        is_available,
        is_featured
    ) VALUES (
        v_custom.store_id,
        v_master_id,
        v_custom.price,
        v_custom.compare_at_price,
        v_custom.cost,
        v_custom.quantity,
        v_custom.low_stock_threshold,
        TRUE,
        v_custom.is_featured
    );

    RETURN v_master_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending products for platform review
CREATE OR REPLACE FUNCTION get_pending_custom_products(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    store_id UUID,
    store_name TEXT,
    sku TEXT,
    name TEXT,
    brand TEXT,
    category TEXT,
    price DECIMAL,
    thumbnail_url TEXT,
    submitted_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        scp.id,
        scp.store_id,
        s.name AS store_name,
        scp.sku,
        scp.name,
        scp.brand,
        scp.category,
        scp.price,
        scp.thumbnail_url,
        scp.submitted_at
    FROM store_custom_products scp
    JOIN stores s ON s.id = scp.store_id
    WHERE scp.approval_status = 'pending_review'
    ORDER BY scp.submitted_at ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE store_custom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_approval_history ENABLE ROW LEVEL SECURITY;

-- Store members can view their store's custom products
CREATE POLICY "Store members can view custom products"
    ON store_custom_products FOR SELECT
    USING (
        store_id IN (
            SELECT s.id FROM stores s
            JOIN tenant_memberships tm ON tm.tenant_id = s.tenant_id
            WHERE tm.user_id = auth.uid() AND tm.is_active = TRUE
        )
    );

-- Store owners/managers can create custom products
CREATE POLICY "Store managers can create custom products"
    ON store_custom_products FOR INSERT
    WITH CHECK (
        store_id IN (
            SELECT s.id FROM stores s
            JOIN tenant_memberships tm ON tm.tenant_id = s.tenant_id
            WHERE tm.user_id = auth.uid()
            AND tm.is_active = TRUE
            AND tm.role IN ('owner', 'manager', 'admin')
        )
    );

-- Store owners/managers can update their custom products
CREATE POLICY "Store managers can update custom products"
    ON store_custom_products FOR UPDATE
    USING (
        store_id IN (
            SELECT s.id FROM stores s
            JOIN tenant_memberships tm ON tm.tenant_id = s.tenant_id
            WHERE tm.user_id = auth.uid()
            AND tm.is_active = TRUE
            AND tm.role IN ('owner', 'manager', 'admin')
        )
    );

-- Store owners can delete draft products
CREATE POLICY "Store owners can delete draft products"
    ON store_custom_products FOR DELETE
    USING (
        approval_status = 'draft'
        AND store_id IN (
            SELECT s.id FROM stores s
            JOIN tenant_memberships tm ON tm.tenant_id = s.tenant_id
            WHERE tm.user_id = auth.uid()
            AND tm.is_active = TRUE
            AND tm.role = 'owner'
        )
    );

-- Platform admins can do everything
CREATE POLICY "Platform admins full access to custom products"
    ON store_custom_products FOR ALL
    USING (
        auth.uid() IN (SELECT user_id FROM platform_admins WHERE is_active = TRUE)
    );

-- Approval history policies
CREATE POLICY "Store members can view approval history"
    ON product_approval_history FOR SELECT
    USING (
        custom_product_id IN (
            SELECT id FROM store_custom_products scp
            WHERE scp.store_id IN (
                SELECT s.id FROM stores s
                JOIN tenant_memberships tm ON tm.tenant_id = s.tenant_id
                WHERE tm.user_id = auth.uid() AND tm.is_active = TRUE
            )
        )
    );

CREATE POLICY "Platform admins full access to approval history"
    ON product_approval_history FOR ALL
    USING (
        auth.uid() IN (SELECT user_id FROM platform_admins WHERE is_active = TRUE)
    );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON store_custom_products TO authenticated;
GRANT SELECT, INSERT ON product_approval_history TO authenticated;
GRANT SELECT ON store_products_unified TO authenticated;

GRANT EXECUTE ON FUNCTION submit_custom_product_for_review TO authenticated;
GRANT EXECUTE ON FUNCTION approve_custom_product TO authenticated;
GRANT EXECUTE ON FUNCTION reject_custom_product TO authenticated;
GRANT EXECUTE ON FUNCTION promote_custom_to_master TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_custom_products TO authenticated;
