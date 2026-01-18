import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

export interface UnifiedSearchResult {
    categories: Array<{
        id: string
        name: string
        slug: string
        description: string | null
        image_url: string | null
        productCount: number
    }>
    products: Array<{
        id: string
        name: string
        brand: string | null
        category: string
        thumbnail_url: string | null
        slug: string | null
        lowestPrice: number
        storeCount: number
        relevance?: number
    }>
    stores: Array<{
        id: string
        name: string
        slug: string
        logo_url: string | null
        description: string | null
        rating: number
        productCount: number
    }>
    totalResults: number
}

const emptyResult: UnifiedSearchResult = {
    categories: [],
    products: [],
    stores: [],
    totalResults: 0
}

export async function GET(request: Request) {
    try {
        // Check if Supabase is configured
        if (!supabase) {
            console.error('Search API: Supabase not configured - missing environment variables')
            return NextResponse.json({ ...emptyResult, error: 'Database not configured' })
        }

        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')?.trim() || ''
        const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10)

        if (!query || query.length < 2) {
            // Return popular/recent items when no query
            return NextResponse.json(await getPopularItems(limit))
        }

        // Search in parallel using fuzzy matching
        const [categoriesResult, productsResult, storesResult] = await Promise.all([
            searchCategoriesFuzzy(query, limit),
            searchProductsFuzzy(query, limit),
            searchStoresFuzzy(query, limit)
        ])

        const result: UnifiedSearchResult = {
            categories: categoriesResult,
            products: productsResult,
            stores: storesResult,
            totalResults: categoriesResult.length + productsResult.length + storesResult.length
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error in unified search:', error)
        return NextResponse.json({
            categories: [],
            products: [],
            stores: [],
            totalResults: 0
        })
    }
}

/**
 * Search categories using trigram similarity for fuzzy matching
 */
async function searchCategoriesFuzzy(query: string, limit: number) {
    try {
        // Use RPC function for fuzzy category search
        const { data: fuzzyCategories, error: rpcError } = await supabase.rpc('fuzzy_search_categories', {
            p_query: query,
            p_limit: limit,
            p_similarity_threshold: 0.2
        })

        if (!rpcError && fuzzyCategories && fuzzyCategories.length > 0) {
            return fuzzyCategories.map((cat: {
                category_id: string
                category_name: string
                category_slug: string
                category_description: string | null
                category_image_url: string | null
                product_count: number
            }) => ({
                id: cat.category_id,
                name: cat.category_name,
                slug: cat.category_slug,
                description: cat.category_description,
                image_url: cat.category_image_url,
                productCount: cat.product_count
            }))
        }

        // Fallback to ILIKE search if RPC fails or returns empty
        return searchCategoriesFallback(query, limit)
    } catch (error) {
        console.error('Error in fuzzy category search:', error)
        return searchCategoriesFallback(query, limit)
    }
}

/**
 * Fallback category search using ILIKE
 */
async function searchCategoriesFallback(query: string, limit: number) {
    const searchLower = query.toLowerCase()

    const { data: categories, error } = await supabase
        .from('product_categories')
        .select('id, name, slug, description, image_url')
        .eq('is_active', true)
        .or(`name.ilike.%${searchLower}%,description.ilike.%${searchLower}%`)
        .order('sort_order', { ascending: true })
        .limit(limit)

    if (error) {
        console.error('Error searching categories:', error)
        return []
    }

    // Get product counts for these categories
    const { data: products } = await supabase
        .from('master_products')
        .select('category')
        .eq('is_active', true)

    const categoryCounts = new Map<string, number>()
    products?.forEach(p => {
        if (p.category) {
            const lower = p.category.toLowerCase()
            categoryCounts.set(lower, (categoryCounts.get(lower) || 0) + 1)
        }
    })

    return (categories || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image_url: cat.image_url,
        productCount: categoryCounts.get(cat.name.toLowerCase()) || 0
    }))
}

/**
 * Search products using the fuzzy_search_products RPC function
 * This handles typos like "bodka" -> "vodka"
 */
async function searchProductsFuzzy(query: string, limit: number) {
    try {
        // Use the existing fuzzy_search_products RPC function
        const { data: fuzzyResults, error: fuzzyError } = await supabase.rpc('fuzzy_search_products', {
            p_query: query,
            p_category: null,
            p_brand: null,
            p_min_price: null,
            p_max_price: null,
            p_store_ids: null,
            p_limit: limit,
            p_offset: 0,
            p_similarity_threshold: 0.15
        })

        if (fuzzyError) {
            console.warn('Fuzzy product search failed, using fallback:', fuzzyError)
            return searchProductsFallback(query, limit)
        }

        if (!fuzzyResults || fuzzyResults.length === 0) {
            // Try with lower threshold
            const { data: relaxedResults } = await supabase.rpc('fuzzy_search_products', {
                p_query: query,
                p_category: null,
                p_brand: null,
                p_min_price: null,
                p_max_price: null,
                p_store_ids: null,
                p_limit: limit,
                p_offset: 0,
                p_similarity_threshold: 0.1
            })

            if (!relaxedResults || relaxedResults.length === 0) {
                return searchProductsFallback(query, limit)
            }

            return relaxedResults.map((p: {
                product_id: string
                product_name: string
                product_brand: string | null
                product_category: string
                thumbnail_url: string | null
                slug: string | null
                min_price: number
                store_count: number
                relevance_score: number
            }) => ({
                id: p.product_id,
                name: p.product_name,
                brand: p.product_brand,
                category: p.product_category,
                thumbnail_url: p.thumbnail_url,
                slug: p.slug,
                lowestPrice: p.min_price,
                storeCount: Number(p.store_count),
                relevance: p.relevance_score
            }))
        }

        return fuzzyResults.map((p: {
            product_id: string
            product_name: string
            product_brand: string | null
            product_category: string
            thumbnail_url: string | null
            slug: string | null
            min_price: number
            store_count: number
            relevance_score: number
        }) => ({
            id: p.product_id,
            name: p.product_name,
            brand: p.product_brand,
            category: p.product_category,
            thumbnail_url: p.thumbnail_url,
            slug: p.slug,
            lowestPrice: p.min_price,
            storeCount: Number(p.store_count),
            relevance: p.relevance_score
        }))
    } catch (error) {
        console.error('Error in fuzzy product search:', error)
        return searchProductsFallback(query, limit)
    }
}

/**
 * Fallback product search using ILIKE
 */
async function searchProductsFallback(query: string, limit: number) {
    const searchLower = query.toLowerCase()

    const { data: products, error } = await supabase
        .from('master_products')
        .select('id, name, brand, category, thumbnail_url, slug')
        .eq('is_active', true)
        .or(`name.ilike.%${searchLower}%,brand.ilike.%${searchLower}%,category.ilike.%${searchLower}%`)
        .limit(limit * 2)

    if (error) {
        console.error('Error searching products:', error)
        return []
    }

    if (!products || products.length === 0) return []

    // Get inventory for these products
    const productIds = products.map(p => p.id)
    const { data: inventories } = await supabase
        .from('store_inventories')
        .select('product_id, price, store_id')
        .in('product_id', productIds)
        .eq('is_available', true)
        .gt('quantity', 0)

    // Group inventories by product
    const productPrices = new Map<string, { lowestPrice: number; storeCount: number }>()
    inventories?.forEach(inv => {
        const existing = productPrices.get(inv.product_id)
        if (!existing) {
            productPrices.set(inv.product_id, { lowestPrice: inv.price, storeCount: 1 })
        } else {
            existing.lowestPrice = Math.min(existing.lowestPrice, inv.price)
            existing.storeCount++
        }
    })

    return products
        .filter(p => productPrices.has(p.id))
        .slice(0, limit)
        .map(p => {
            const priceInfo = productPrices.get(p.id)!
            return {
                id: p.id,
                name: p.name,
                brand: p.brand,
                category: p.category,
                thumbnail_url: p.thumbnail_url,
                slug: p.slug,
                lowestPrice: priceInfo.lowestPrice,
                storeCount: priceInfo.storeCount
            }
        })
}

/**
 * Search stores using trigram similarity for fuzzy matching
 */
async function searchStoresFuzzy(query: string, limit: number) {
    try {
        // Use RPC function for fuzzy store search
        const { data: fuzzyStores, error: rpcError } = await supabase.rpc('fuzzy_search_stores', {
            p_query: query,
            p_limit: limit,
            p_similarity_threshold: 0.2
        })

        if (!rpcError && fuzzyStores && fuzzyStores.length > 0) {
            return fuzzyStores.map((store: {
                store_id: string
                store_name: string
                store_slug: string
                store_logo_url: string | null
                store_description: string | null
                store_rating: number
                product_count: number
            }) => ({
                id: store.store_id,
                name: store.store_name,
                slug: store.store_slug,
                logo_url: store.store_logo_url,
                description: store.store_description,
                rating: store.store_rating || 0,
                productCount: store.product_count
            }))
        }

        // Fallback to ILIKE search if RPC fails
        return searchStoresFallback(query, limit)
    } catch (error) {
        console.error('Error in fuzzy store search:', error)
        return searchStoresFallback(query, limit)
    }
}

/**
 * Fallback store search using ILIKE
 */
async function searchStoresFallback(query: string, limit: number) {
    const searchLower = query.toLowerCase()

    const { data: stores, error } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, description, average_rating, total_reviews')
        .eq('is_active', true)
        .or(`name.ilike.%${searchLower}%,description.ilike.%${searchLower}%`)
        .limit(limit)

    if (error) {
        console.error('Error searching stores:', error)
        return []
    }

    // Get product counts for stores
    const storeIds = (stores || []).map(s => s.id)
    const { data: inventories } = await supabase
        .from('store_inventories')
        .select('store_id')
        .in('store_id', storeIds)
        .eq('is_available', true)
        .gt('quantity', 0)

    const storeCounts = new Map<string, number>()
    inventories?.forEach(inv => {
        storeCounts.set(inv.store_id, (storeCounts.get(inv.store_id) || 0) + 1)
    })

    return (stores || []).map(store => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        logo_url: store.logo_url,
        description: store.description,
        rating: store.average_rating || 0,
        productCount: storeCounts.get(store.id) || 0
    }))
}

async function getPopularItems(limit: number): Promise<UnifiedSearchResult> {
    try {
        // Get popular categories (by product count)
        const { data: categories } = await supabase
            .from('product_categories')
            .select('id, name, slug, description, image_url')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .limit(limit)

        // Get product counts
        const { data: products } = await supabase
            .from('master_products')
            .select('category')
            .eq('is_active', true)

        const categoryCounts = new Map<string, number>()
        products?.forEach(p => {
            if (p.category) {
                const lower = p.category.toLowerCase()
                categoryCounts.set(lower, (categoryCounts.get(lower) || 0) + 1)
            }
        })

        const popularCategories = (categories || [])
            .map(cat => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                description: cat.description,
                image_url: cat.image_url,
                productCount: categoryCounts.get(cat.name.toLowerCase()) || 0
            }))
            .sort((a, b) => b.productCount - a.productCount)
            .slice(0, limit)

        return {
            categories: popularCategories,
            products: [],
            stores: [],
            totalResults: popularCategories.length
        }
    } catch (error) {
        console.error('Error getting popular items:', error)
        return { categories: [], products: [], stores: [], totalResults: 0 }
    }
}
