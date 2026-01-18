-- ============================================
-- Migration: 007_products_and_inventory
-- Description: Master products catalog and store inventories
-- ============================================

-- ============================================
-- MASTER PRODUCTS (Global catalog)
-- ============================================

CREATE TABLE public.master_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    sku TEXT UNIQUE NOT NULL,
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
    -- Example: {"volume": "750ml", "alcohol_percentage": 40, "country": "Scotland", "type": "Single Malt"}
    
    -- Images
    images TEXT[] DEFAULT '{}',
    thumbnail_url TEXT,
    
    -- Restrictions
    age_restriction INT DEFAULT 21, -- Minimum age
    
    -- SEO
    slug TEXT UNIQUE,
    meta_title TEXT,
    meta_description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STORE INVENTORIES
-- ============================================

CREATE TABLE public.store_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    store_location_id UUID REFERENCES store_locations(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2), -- Original price (to show discounts)
    cost DECIMAL(10,2), -- Product cost
    
    -- Stock
    quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    
    -- Discounts
    discount_type TEXT, -- 'percentage', 'fixed'
    discount_value DECIMAL(10,2),
    discount_start_date TIMESTAMPTZ,
    discount_end_date TIMESTAMPTZ,
    
    -- Status
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, store_location_id, product_id)
);

-- ============================================
-- PRODUCT COLLECTIONS
-- ============================================

CREATE TABLE public.product_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- Collection type
    type TEXT DEFAULT 'manual', -- 'manual', 'automated'
    rules JSONB, -- For automated collections
    
    -- Display
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(store_id, slug)
);

-- ============================================
-- COLLECTION PRODUCTS
-- ============================================

CREATE TABLE public.collection_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES product_collections(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES store_inventories(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0,
    
    UNIQUE(collection_id, inventory_id)
);

-- ============================================
-- INVENTORY MOVEMENTS (Audit trail)
-- ============================================

CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES store_inventories(id) ON DELETE CASCADE,
    movement_type inventory_movement_type NOT NULL,
    quantity INT NOT NULL, -- positive or negative
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_id UUID, -- order_id, transfer_id, etc.
    reference_type TEXT, -- 'order', 'transfer', 'adjustment'
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVENTORY TRANSFERS
-- ============================================

CREATE TABLE public.inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_location_id UUID NOT NULL REFERENCES store_locations(id),
    to_location_id UUID NOT NULL REFERENCES store_locations(id),
    product_id UUID NOT NULL REFERENCES master_products(id),
    quantity INT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, in_transit, completed, cancelled
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRICE HISTORY (for charts)
-- ============================================

CREATE TABLE public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES store_inventories(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRICE ALERTS (Watchlist)
-- ============================================

CREATE TABLE public.price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
    target_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_master_products_sku ON master_products(sku);
CREATE INDEX idx_master_products_slug ON master_products(slug);
CREATE INDEX idx_master_products_category ON master_products(category);
CREATE INDEX idx_master_products_brand ON master_products(brand);
CREATE INDEX idx_master_products_name ON master_products USING GIN (to_tsvector('english', name));
CREATE INDEX idx_master_products_active ON master_products(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_store_inventories_store ON store_inventories(store_id);
CREATE INDEX idx_store_inventories_location ON store_inventories(store_location_id);
CREATE INDEX idx_store_inventories_product ON store_inventories(product_id);
CREATE INDEX idx_store_inventories_available ON store_inventories(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_store_inventories_featured ON store_inventories(store_id, is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_store_inventories_price ON store_inventories(price);

CREATE INDEX idx_product_collections_store ON product_collections(store_id);
CREATE INDEX idx_collection_products_collection ON collection_products(collection_id);

CREATE INDEX idx_inventory_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at);

CREATE INDEX idx_price_history_inventory ON price_history(inventory_id);
CREATE INDEX idx_price_history_date ON price_history(recorded_at);

CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_product ON price_alerts(product_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_master_products_updated_at
    BEFORE UPDATE ON master_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_inventories_updated_at
    BEFORE UPDATE ON store_inventories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_collections_updated_at
    BEFORE UPDATE ON product_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Track price changes
CREATE OR REPLACE FUNCTION track_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.price IS DISTINCT FROM NEW.price THEN
        INSERT INTO price_history (inventory_id, price)
        VALUES (NEW.id, NEW.price);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_inventory_price_change
    AFTER UPDATE ON store_inventories
    FOR EACH ROW
    EXECUTE FUNCTION track_price_change();

-- Insert initial price on inventory creation
CREATE OR REPLACE FUNCTION track_initial_price()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO price_history (inventory_id, price)
    VALUES (NEW.id, NEW.price);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_inventory_initial_price
    AFTER INSERT ON store_inventories
    FOR EACH ROW
    EXECUTE FUNCTION track_initial_price();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get effective price (with discount if applicable)
CREATE OR REPLACE FUNCTION get_effective_price(p_inventory_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_inv store_inventories%ROWTYPE;
    v_discount DECIMAL;
BEGIN
    SELECT * INTO v_inv FROM store_inventories WHERE id = p_inventory_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Check if discount is active
    IF v_inv.discount_value IS NOT NULL 
       AND (v_inv.discount_start_date IS NULL OR v_inv.discount_start_date <= NOW())
       AND (v_inv.discount_end_date IS NULL OR v_inv.discount_end_date >= NOW())
    THEN
        IF v_inv.discount_type = 'percentage' THEN
            v_discount := v_inv.price * (v_inv.discount_value / 100);
        ELSE
            v_discount := v_inv.discount_value;
        END IF;
        RETURN GREATEST(v_inv.price - v_discount, 0);
    END IF;
    
    RETURN v_inv.price;
END;
$$ LANGUAGE plpgsql;

-- Search products
CREATE OR REPLACE FUNCTION search_products(
    p_query TEXT,
    p_category TEXT DEFAULT NULL,
    p_brand TEXT DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_brand TEXT,
    product_category TEXT,
    thumbnail_url TEXT,
    min_price DECIMAL,
    max_price DECIMAL,
    store_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.id,
        mp.name,
        mp.brand,
        mp.category,
        mp.thumbnail_url,
        MIN(si.price),
        MAX(si.price),
        COUNT(DISTINCT si.store_id)
    FROM master_products mp
    JOIN store_inventories si ON si.product_id = mp.id
    JOIN stores s ON s.id = si.store_id
    WHERE mp.is_active = TRUE
    AND si.is_available = TRUE
    AND s.is_active = TRUE
    AND (p_query IS NULL OR mp.name ILIKE '%' || p_query || '%' OR mp.brand ILIKE '%' || p_query || '%')
    AND (p_category IS NULL OR mp.category = p_category)
    AND (p_brand IS NULL OR mp.brand = p_brand)
    AND (p_min_price IS NULL OR si.price >= p_min_price)
    AND (p_max_price IS NULL OR si.price <= p_max_price)
    GROUP BY mp.id
    ORDER BY mp.name
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
