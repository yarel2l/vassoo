-- ============================================
-- Migration: 025_fuzzy_search_categories_stores
-- Description: Fuzzy search functions for categories and stores
-- Uses pg_trgm extension for similarity matching
-- ============================================

-- Ensure pg_trgm is enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- TRIGRAM INDEXES for categories
-- ============================================

-- Index for category name similarity search
CREATE INDEX IF NOT EXISTS idx_product_categories_name_trgm
ON product_categories USING GIN (name gin_trgm_ops);

-- ============================================
-- TRIGRAM INDEXES for stores
-- ============================================

-- Index for store name similarity search
CREATE INDEX IF NOT EXISTS idx_stores_name_trgm
ON stores USING GIN (name gin_trgm_ops);

-- Index for store description similarity search (if it exists)
CREATE INDEX IF NOT EXISTS idx_stores_description_trgm
ON stores USING GIN (description gin_trgm_ops);

-- ============================================
-- FUZZY SEARCH CATEGORIES FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION fuzzy_search_categories(
    p_query TEXT,
    p_limit INT DEFAULT 5,
    p_similarity_threshold FLOAT DEFAULT 0.2
)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    category_slug TEXT,
    category_description TEXT,
    category_image_url TEXT,
    product_count BIGINT,
    relevance_score FLOAT
) AS $$
DECLARE
    v_normalized_query TEXT;
BEGIN
    IF p_query IS NULL OR trim(p_query) = '' THEN
        -- Return popular categories when no query
        RETURN QUERY
        SELECT
            pc.id,
            pc.name,
            pc.slug,
            pc.description,
            pc.image_url,
            COALESCE(counts.cnt, 0)::BIGINT,
            1.0::FLOAT
        FROM product_categories pc
        LEFT JOIN (
            SELECT mp.category, COUNT(*)::BIGINT as cnt
            FROM master_products mp
            WHERE mp.is_active = TRUE
            GROUP BY mp.category
        ) counts ON lower(counts.category) = lower(pc.name)
        WHERE pc.is_active = TRUE
        ORDER BY COALESCE(counts.cnt, 0) DESC, pc.sort_order
        LIMIT p_limit;
        RETURN;
    END IF;

    v_normalized_query := lower(trim(p_query));

    RETURN QUERY
    SELECT
        pc.id,
        pc.name,
        pc.slug,
        pc.description,
        pc.image_url,
        COALESCE(counts.cnt, 0)::BIGINT,
        (
            -- Exact match (highest score)
            CASE WHEN lower(pc.name) = v_normalized_query THEN 100.0
                 WHEN lower(pc.name) LIKE v_normalized_query || '%' THEN 80.0
                 WHEN lower(pc.name) LIKE '%' || v_normalized_query || '%' THEN 60.0
                 ELSE 0.0
            END
            +
            -- Trigram similarity for name (handles typos)
            COALESCE(similarity(lower(pc.name), v_normalized_query) * 50.0, 0.0)
            +
            -- Description match
            CASE WHEN pc.description IS NOT NULL AND lower(pc.description) LIKE '%' || v_normalized_query || '%' THEN 20.0
                 ELSE 0.0
            END
        )::FLOAT AS relevance
    FROM product_categories pc
    LEFT JOIN (
        SELECT mp.category, COUNT(*)::BIGINT as cnt
        FROM master_products mp
        JOIN store_inventories si ON si.product_id = mp.id AND si.is_available = TRUE AND si.quantity > 0
        WHERE mp.is_active = TRUE
        GROUP BY mp.category
    ) counts ON lower(counts.category) = lower(pc.name)
    WHERE pc.is_active = TRUE
    AND (
        -- At least one of these conditions must match
        similarity(lower(pc.name), v_normalized_query) >= p_similarity_threshold
        OR lower(pc.name) LIKE '%' || v_normalized_query || '%'
        OR (pc.description IS NOT NULL AND lower(pc.description) LIKE '%' || v_normalized_query || '%')
    )
    ORDER BY relevance DESC, COALESCE(counts.cnt, 0) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUZZY SEARCH STORES FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION fuzzy_search_stores(
    p_query TEXT,
    p_limit INT DEFAULT 5,
    p_similarity_threshold FLOAT DEFAULT 0.2
)
RETURNS TABLE (
    store_id UUID,
    store_name TEXT,
    store_slug TEXT,
    store_logo_url TEXT,
    store_description TEXT,
    store_rating DECIMAL,
    product_count BIGINT,
    relevance_score FLOAT
) AS $$
DECLARE
    v_normalized_query TEXT;
BEGIN
    IF p_query IS NULL OR trim(p_query) = '' THEN
        -- Return popular stores when no query
        RETURN QUERY
        SELECT
            s.id,
            s.name,
            s.slug,
            s.logo_url,
            s.description,
            COALESCE(s.average_rating, 0)::DECIMAL,
            COALESCE(counts.cnt, 0)::BIGINT,
            1.0::FLOAT
        FROM stores s
        LEFT JOIN (
            SELECT si.store_id, COUNT(DISTINCT si.product_id)::BIGINT as cnt
            FROM store_inventories si
            WHERE si.is_available = TRUE AND si.quantity > 0
            GROUP BY si.store_id
        ) counts ON counts.store_id = s.id
        WHERE s.is_active = TRUE
        ORDER BY COALESCE(counts.cnt, 0) DESC, s.average_rating DESC NULLS LAST
        LIMIT p_limit;
        RETURN;
    END IF;

    v_normalized_query := lower(trim(p_query));

    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.slug,
        s.logo_url,
        s.description,
        COALESCE(s.average_rating, 0)::DECIMAL,
        COALESCE(counts.cnt, 0)::BIGINT,
        (
            -- Exact match (highest score)
            CASE WHEN lower(s.name) = v_normalized_query THEN 100.0
                 WHEN lower(s.name) LIKE v_normalized_query || '%' THEN 80.0
                 WHEN lower(s.name) LIKE '%' || v_normalized_query || '%' THEN 60.0
                 ELSE 0.0
            END
            +
            -- Trigram similarity for name (handles typos)
            COALESCE(similarity(lower(s.name), v_normalized_query) * 50.0, 0.0)
            +
            -- Description match
            CASE WHEN s.description IS NOT NULL AND lower(s.description) LIKE '%' || v_normalized_query || '%' THEN 20.0
                 ELSE 0.0
            END
            +
            -- Trigram similarity for description
            CASE WHEN s.description IS NOT NULL
                 THEN COALESCE(similarity(lower(s.description), v_normalized_query) * 15.0, 0.0)
                 ELSE 0.0
            END
        )::FLOAT AS relevance
    FROM stores s
    LEFT JOIN (
        SELECT si.store_id, COUNT(DISTINCT si.product_id)::BIGINT as cnt
        FROM store_inventories si
        WHERE si.is_available = TRUE AND si.quantity > 0
        GROUP BY si.store_id
    ) counts ON counts.store_id = s.id
    WHERE s.is_active = TRUE
    AND (
        -- At least one of these conditions must match
        similarity(lower(s.name), v_normalized_query) >= p_similarity_threshold
        OR lower(s.name) LIKE '%' || v_normalized_query || '%'
        OR (s.description IS NOT NULL AND (
            lower(s.description) LIKE '%' || v_normalized_query || '%'
            OR similarity(lower(s.description), v_normalized_query) >= p_similarity_threshold
        ))
    )
    ORDER BY relevance DESC, COALESCE(counts.cnt, 0) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION fuzzy_search_categories TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fuzzy_search_stores TO authenticated, anon;

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION fuzzy_search_categories IS
'Fuzzy search for product categories with trigram similarity matching.
Handles misspellings and partial matches.';

COMMENT ON FUNCTION fuzzy_search_stores IS
'Fuzzy search for stores with trigram similarity matching.
Handles misspellings and partial matches in both name and description.';
