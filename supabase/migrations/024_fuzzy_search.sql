-- ============================================
-- Migration: 024_fuzzy_search
-- Description: Intelligent fuzzy search for products
-- Uses pg_trgm extension for similarity matching
-- ============================================

-- Ensure pg_trgm is enabled (should already be from 001)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- TRIGRAM INDEXES for fuzzy matching
-- ============================================

-- Index for name similarity search
CREATE INDEX IF NOT EXISTS idx_master_products_name_trgm
ON master_products USING GIN (name gin_trgm_ops);

-- Index for brand similarity search
CREATE INDEX IF NOT EXISTS idx_master_products_brand_trgm
ON master_products USING GIN (brand gin_trgm_ops);

-- Combined search field (name + brand)
ALTER TABLE master_products
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(brand, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'D')
) STORED;

-- Index for full-text search vector
CREATE INDEX IF NOT EXISTS idx_master_products_search_vector
ON master_products USING GIN (search_vector);

-- ============================================
-- FUZZY SEARCH FUNCTION
-- Combines multiple search strategies:
-- 1. Exact match (highest priority)
-- 2. Full-text search (tsquery)
-- 3. Trigram similarity (for typos)
-- 4. Word order flexibility
-- ============================================

CREATE OR REPLACE FUNCTION fuzzy_search_products(
    p_query TEXT,
    p_category TEXT DEFAULT NULL,
    p_brand TEXT DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_store_ids UUID[] DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0,
    p_similarity_threshold FLOAT DEFAULT 0.15
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_brand TEXT,
    product_category TEXT,
    product_subcategory TEXT,
    thumbnail_url TEXT,
    images TEXT[],
    description TEXT,
    age_restriction INT,
    slug TEXT,
    min_price DECIMAL,
    max_price DECIMAL,
    store_count BIGINT,
    relevance_score FLOAT
) AS $$
DECLARE
    v_normalized_query TEXT;
    v_words TEXT[];
    v_tsquery tsquery;
BEGIN
    -- Return empty if no query
    IF p_query IS NULL OR trim(p_query) = '' THEN
        RETURN QUERY
        SELECT
            mp.id,
            mp.name,
            mp.brand,
            mp.category,
            mp.subcategory,
            mp.thumbnail_url,
            mp.images,
            mp.description,
            mp.age_restriction,
            mp.slug,
            MIN(si.price)::DECIMAL,
            MAX(si.price)::DECIMAL,
            COUNT(DISTINCT si.store_id),
            1.0::FLOAT
        FROM master_products mp
        JOIN store_inventories si ON si.product_id = mp.id AND si.is_available = TRUE AND si.quantity > 0
        JOIN stores s ON s.id = si.store_id AND s.is_active = TRUE
        WHERE mp.is_active = TRUE
        AND (p_category IS NULL OR mp.category ILIKE p_category)
        AND (p_brand IS NULL OR mp.brand ILIKE p_brand)
        AND (p_min_price IS NULL OR si.price >= p_min_price)
        AND (p_max_price IS NULL OR si.price <= p_max_price)
        AND (p_store_ids IS NULL OR si.store_id = ANY(p_store_ids))
        GROUP BY mp.id
        ORDER BY mp.name
        LIMIT p_limit
        OFFSET p_offset;
        RETURN;
    END IF;

    -- Normalize the query: lowercase, trim, remove extra spaces
    v_normalized_query := lower(trim(regexp_replace(p_query, '\s+', ' ', 'g')));

    -- Split into words for flexible matching
    v_words := string_to_array(v_normalized_query, ' ');

    -- Build tsquery for full-text search (with OR between words for flexibility)
    v_tsquery := to_tsquery('english', array_to_string(v_words, ' | '));

    RETURN QUERY
    WITH scored_products AS (
        SELECT
            mp.id,
            mp.name,
            mp.brand,
            mp.category,
            mp.subcategory,
            mp.thumbnail_url,
            mp.images,
            mp.description,
            mp.age_restriction,
            mp.slug,
            -- Calculate relevance score combining multiple strategies
            (
                -- Exact match in name (highest score)
                CASE WHEN lower(mp.name) = v_normalized_query THEN 100.0
                     WHEN lower(mp.name) LIKE v_normalized_query || '%' THEN 80.0
                     WHEN lower(mp.name) LIKE '%' || v_normalized_query || '%' THEN 60.0
                     ELSE 0.0
                END
                +
                -- Brand exact match
                CASE WHEN lower(coalesce(mp.brand, '')) = v_normalized_query THEN 50.0
                     WHEN lower(coalesce(mp.brand, '')) LIKE '%' || v_normalized_query || '%' THEN 30.0
                     ELSE 0.0
                END
                +
                -- Trigram similarity for name (handles typos)
                COALESCE(similarity(lower(mp.name), v_normalized_query) * 40.0, 0.0)
                +
                -- Trigram similarity for brand
                COALESCE(similarity(lower(coalesce(mp.brand, '')), v_normalized_query) * 20.0, 0.0)
                +
                -- Full-text search ranking
                COALESCE(ts_rank(mp.search_vector, v_tsquery) * 30.0, 0.0)
                +
                -- Word containment (all words present anywhere)
                (
                    SELECT COUNT(*)::FLOAT * 15.0
                    FROM unnest(v_words) word
                    WHERE lower(mp.name || ' ' || coalesce(mp.brand, '')) LIKE '%' || word || '%'
                )
                +
                -- Combined name+brand trigram (for queries like "grey vodka" matching "Grey Goose Vodka")
                COALESCE(
                    similarity(
                        lower(mp.name || ' ' || coalesce(mp.brand, '')),
                        v_normalized_query
                    ) * 25.0,
                    0.0
                )
            ) AS relevance
        FROM master_products mp
        WHERE mp.is_active = TRUE
        AND (
            -- At least one of these conditions must match
            similarity(lower(mp.name), v_normalized_query) >= p_similarity_threshold
            OR similarity(lower(coalesce(mp.brand, '')), v_normalized_query) >= p_similarity_threshold
            OR lower(mp.name) LIKE '%' || v_normalized_query || '%'
            OR lower(coalesce(mp.brand, '')) LIKE '%' || v_normalized_query || '%'
            OR mp.search_vector @@ v_tsquery
            -- Word-by-word matching (for queries with reordered words)
            OR (
                SELECT bool_and(
                    lower(mp.name || ' ' || coalesce(mp.brand, '') || ' ' || coalesce(mp.description, ''))
                    LIKE '%' || word || '%'
                    OR similarity(lower(mp.name || ' ' || coalesce(mp.brand, '')), word) >= p_similarity_threshold
                )
                FROM unnest(v_words) word
                WHERE length(word) >= 3  -- Only check words with 3+ chars
            )
        )
        AND (p_category IS NULL OR mp.category ILIKE p_category)
        AND (p_brand IS NULL OR mp.brand ILIKE p_brand)
    )
    SELECT
        sp.id,
        sp.name,
        sp.brand,
        sp.category,
        sp.subcategory,
        sp.thumbnail_url,
        sp.images,
        sp.description,
        sp.age_restriction,
        sp.slug,
        MIN(si.price)::DECIMAL,
        MAX(si.price)::DECIMAL,
        COUNT(DISTINCT si.store_id),
        sp.relevance
    FROM scored_products sp
    JOIN store_inventories si ON si.product_id = sp.id AND si.is_available = TRUE AND si.quantity > 0
    JOIN stores s ON s.id = si.store_id AND s.is_active = TRUE
    WHERE (p_min_price IS NULL OR si.price >= p_min_price)
    AND (p_max_price IS NULL OR si.price <= p_max_price)
    AND (p_store_ids IS NULL OR si.store_id = ANY(p_store_ids))
    GROUP BY sp.id, sp.name, sp.brand, sp.category, sp.subcategory,
             sp.thumbnail_url, sp.images, sp.description, sp.age_restriction, sp.slug, sp.relevance
    HAVING sp.relevance > 0
    ORDER BY sp.relevance DESC, sp.name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- SEARCH SUGGESTIONS FUNCTION
-- Returns autocomplete suggestions based on partial input
-- ============================================

CREATE OR REPLACE FUNCTION get_search_suggestions(
    p_query TEXT,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    suggestion TEXT,
    suggestion_type TEXT,
    match_count BIGINT
) AS $$
DECLARE
    v_normalized_query TEXT;
BEGIN
    IF p_query IS NULL OR length(trim(p_query)) < 2 THEN
        RETURN;
    END IF;

    v_normalized_query := lower(trim(p_query));

    RETURN QUERY
    (
        -- Product name suggestions
        SELECT DISTINCT
            mp.name AS suggestion,
            'product'::TEXT AS suggestion_type,
            COUNT(DISTINCT si.store_id) AS match_count
        FROM master_products mp
        JOIN store_inventories si ON si.product_id = mp.id AND si.is_available = TRUE AND si.quantity > 0
        WHERE mp.is_active = TRUE
        AND (
            lower(mp.name) LIKE v_normalized_query || '%'
            OR similarity(lower(mp.name), v_normalized_query) > 0.3
        )
        GROUP BY mp.name
        ORDER BY
            CASE WHEN lower(mp.name) LIKE v_normalized_query || '%' THEN 0 ELSE 1 END,
            similarity(lower(mp.name), v_normalized_query) DESC
        LIMIT p_limit / 2
    )
    UNION ALL
    (
        -- Brand suggestions
        SELECT DISTINCT
            mp.brand AS suggestion,
            'brand'::TEXT AS suggestion_type,
            COUNT(DISTINCT mp.id) AS match_count
        FROM master_products mp
        JOIN store_inventories si ON si.product_id = mp.id AND si.is_available = TRUE AND si.quantity > 0
        WHERE mp.is_active = TRUE
        AND mp.brand IS NOT NULL
        AND (
            lower(mp.brand) LIKE v_normalized_query || '%'
            OR similarity(lower(mp.brand), v_normalized_query) > 0.3
        )
        GROUP BY mp.brand
        ORDER BY
            CASE WHEN lower(mp.brand) LIKE v_normalized_query || '%' THEN 0 ELSE 1 END,
            similarity(lower(mp.brand), v_normalized_query) DESC
        LIMIT p_limit / 2
    )
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION fuzzy_search_products TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_search_suggestions TO authenticated, anon;

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION fuzzy_search_products IS
'Intelligent product search with fuzzy matching. Handles:
- Exact matches (highest priority)
- Partial matches
- Misspellings via trigram similarity
- Word reordering (e.g., "Vodka Grey" finds "Grey Goose Vodka")
- Full-text search with weighted fields';

COMMENT ON FUNCTION get_search_suggestions IS
'Returns autocomplete suggestions for product names and brands based on partial input';
