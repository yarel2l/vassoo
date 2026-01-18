import { createClient } from '@/lib/supabase/client'

// Types for the marketplace service
export interface NearbyStore {
    id: string
    name: string
    slug: string
    logo_url: string | null
    thumbnail_url: string | null
    distance_miles: number
    rating: number
    review_count: number
    is_open: boolean
    location_id: string
    location_name: string
    address: {
        street: string
        city: string
        state: string
        zip: string
    }
    delivery_info: {
        minimum_order: number
        delivery_fee: number
        estimated_time: string
        is_delivery_available: boolean
    }
}

export interface StoreSearchParams {
    latitude: number
    longitude: number
    radius_miles?: number
    category?: string
    search?: string
    sort_by?: 'distance' | 'rating' | 'delivery_time'
    page?: number
    limit?: number
}

export interface ProductSearchParams {
    latitude?: number
    longitude?: number
    radius_miles?: number
    query?: string
    category?: string
    min_price?: number
    max_price?: number
    sort_by?: 'price' | 'rating' | 'distance' | 'relevance'
    page?: number
    limit?: number
}

export interface ProductWithPrices {
    id: string
    name: string
    brand: string | null
    category: string
    subcategory: string | null
    thumbnail_url: string | null
    images: string[] | null
    description: string | null
    age_restriction: number | null
    slug: string | null
    prices: StorePrice[]
    lowest_price: number
    highest_price: number
    price_range_text: string
}

export interface StoreCoupon {
    id: string
    code: string
    description: string | null
    type: 'percentage' | 'fixed'
    value: number
    minimum_order_amount: number | null
}

export interface StorePrice {
    inventory_id: string
    store_id: string
    store_name: string
    store_slug: string
    store_logo: string | null
    store_rating: number
    store_review_count: number
    location_id: string
    location_name: string
    distance_miles: number
    price: number
    original_price: number | null
    in_stock: boolean
    quantity: number
    delivery_fee: number
    free_delivery_threshold: number | null
    minimum_order_amount: number
    estimated_delivery: string
    estimated_pickup: string
    is_delivery_available: boolean
    is_pickup_available: boolean
    coupons: StoreCoupon[]
}

export interface StoreDetails extends NearbyStore {
    description: string | null
    email: string | null
    phone: string | null
    website: string | null
    banner_url: string | null
    hours: Record<string, { open: string; close: string }> | null
    is_featured: boolean
}

/**
 * Delivery settings interface
 */
interface DeliverySettings {
    store_id: string
    is_delivery_enabled: boolean
    is_pickup_enabled: boolean
    base_delivery_fee: number
    minimum_order_amount: number
    free_delivery_threshold: number | null
    delivery_radius_miles: number
    estimated_delivery_time: string
    estimated_pickup_time: string
}

/**
 * Default delivery settings when table doesn't exist or no data found
 */
const DEFAULT_DELIVERY_SETTINGS: Omit<DeliverySettings, 'store_id'> = {
    is_delivery_enabled: true,
    is_pickup_enabled: true,
    base_delivery_fee: 4.99,
    minimum_order_amount: 0,
    free_delivery_threshold: null,
    delivery_radius_miles: 10,
    estimated_delivery_time: '30-45 min',
    estimated_pickup_time: '15-20 min'
}

/**
 * Safely fetch delivery settings for stores, with fallback for missing table
 */
async function getDeliverySettingsForStores(storeIds: string[]): Promise<Map<string, DeliverySettings>> {
    if (!storeIds.length) return new Map()

    const supabase = createClient()

    try {
        const { data, error } = await supabase
            .from('store_delivery_settings')
            .select('*')
            .in('store_id', storeIds)

        // If table doesn't exist (404) or other error, return empty map (will use defaults)
        if (error) {
            if (error.code === 'PGRST116' || error.message?.includes('404')) {
                console.warn('store_delivery_settings table not found, using defaults')
            } else {
                console.error('Error fetching delivery settings:', error)
            }
            return new Map()
        }

        return new Map(data?.map(d => [d.store_id, d as DeliverySettings]) || [])
    } catch (err) {
        console.error('Error fetching delivery settings:', err)
        return new Map()
    }
}

/**
 * Get delivery settings for a single store
 */
async function getDeliverySettingsForStore(storeId: string): Promise<DeliverySettings | null> {
    const map = await getDeliverySettingsForStores([storeId])
    return map.get(storeId) || null
}

/**
 * Get nearby stores based on user location using PostGIS
 */
export async function getNearbyStores(params: StoreSearchParams): Promise<NearbyStore[]> {
    const supabase = createClient()
    const { latitude, longitude, radius_miles = 10, search, sort_by = 'distance', page = 1, limit = 20 } = params

    try {
        // Use the RPC function for nearby stores
        const { data: nearbyData, error: nearbyError } = await supabase
            .rpc('get_nearby_stores', {
                p_lat: latitude,
                p_lng: longitude,
                p_radius_miles: radius_miles
            })

        if (nearbyError) {
            console.error('Error fetching nearby stores:', nearbyError)
            return []
        }

        if (!nearbyData || nearbyData.length === 0) {
            return []
        }

        // Get full store details
        const storeIds = [...new Set(nearbyData.map((s: { store_id: string }) => s.store_id))]
        const locationIds = nearbyData.map((s: { location_id: string }) => s.location_id)

        const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select(`
                id,
                name,
                slug,
                logo_url,
                banner_url,
                average_rating,
                total_reviews,
                is_active
            `)
            .in('id', storeIds)
            .eq('is_active', true)

        if (storesError) {
            console.error('Error fetching store details:', storesError)
            return []
        }

        // Get location details with delivery settings
        const { data: locations, error: locationsError } = await supabase
            .from('store_locations')
            .select(`
                id,
                store_id,
                name,
                address_line1,
                city,
                state,
                zip_code,
                business_hours,
                is_delivery_available,
                is_pickup_available,
                is_active
            `)
            .in('id', locationIds)
            .eq('is_active', true)

        if (locationsError) {
            console.error('Error fetching location details:', locationsError)
        }

        // Get delivery settings for stores (with fallback for missing table)
        const deliveryMap = await getDeliverySettingsForStores(storeIds)

        // Combine the data
        const storesMap = new Map(stores?.map(s => [s.id, s]) || [])
        const locationsMap = new Map(locations?.map(l => [l.id, l]) || [])

        let result: NearbyStore[] = nearbyData.map((nearby: {
            store_id: string
            store_name: string
            location_id: string
            location_name: string
            distance_miles: number
        }) => {
            const store = storesMap.get(nearby.store_id)
            const location = locationsMap.get(nearby.location_id)
            const delivery = deliveryMap.get(nearby.store_id)

            // Check if store is currently open
            const isOpen = location?.business_hours
                ? checkIfStoreIsOpen(location.business_hours)
                : true

            return {
                id: nearby.store_id,
                name: store?.name || nearby.store_name,
                slug: store?.slug || nearby.store_id,
                logo_url: store?.logo_url || null,
                thumbnail_url: store?.banner_url || null,
                distance_miles: Number(nearby.distance_miles.toFixed(2)),
                rating: store?.average_rating || 0,
                review_count: store?.total_reviews || 0,
                is_open: isOpen,
                location_id: nearby.location_id,
                location_name: nearby.location_name,
                address: {
                    street: location?.address_line1 || '',
                    city: location?.city || '',
                    state: location?.state || '',
                    zip: location?.zip_code || ''
                },
                delivery_info: {
                    minimum_order: delivery?.minimum_order_amount || 0,
                    delivery_fee: delivery?.base_delivery_fee || 4.99,
                    estimated_time: delivery?.estimated_delivery_time || '30-45 min',
                    is_delivery_available: location?.is_delivery_available ?? true
                }
            }
        })

        // Filter by search term
        if (search) {
            const searchLower = search.toLowerCase()
            result = result.filter(s =>
                s.name.toLowerCase().includes(searchLower) ||
                s.address.city.toLowerCase().includes(searchLower)
            )
        }

        // Sort results
        if (sort_by === 'distance') {
            result.sort((a, b) => a.distance_miles - b.distance_miles)
        } else if (sort_by === 'rating') {
            result.sort((a, b) => b.rating - a.rating)
        }

        // Paginate
        const start = (page - 1) * limit
        return result.slice(start, start + limit)

    } catch (error) {
        console.error('Error in getNearbyStores:', error)
        return []
    }
}

/**
 * Search suggestion result type
 */
export interface SearchSuggestion {
    suggestion: string
    type: 'product' | 'brand'
    count: number
}

/**
 * Get search suggestions for autocomplete
 * Uses fuzzy matching to suggest products and brands
 */
export async function getSearchSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    const supabase = createClient()

    if (!query || query.trim().length < 2) {
        return []
    }

    try {
        const { data, error } = await supabase.rpc('get_search_suggestions', {
            p_query: query.trim(),
            p_limit: limit
        })

        if (error) {
            console.error('Error fetching search suggestions:', error)
            // Fallback to simple ILIKE search
            return fallbackSearchSuggestions(supabase, query, limit)
        }

        return (data || []).map((item: { suggestion: string; suggestion_type: string; match_count: number }) => ({
            suggestion: item.suggestion,
            type: item.suggestion_type as 'product' | 'brand',
            count: Number(item.match_count)
        }))
    } catch (error) {
        console.error('Error in getSearchSuggestions:', error)
        return []
    }
}

/**
 * Fallback search suggestions using simple ILIKE (if RPC not available)
 */
async function fallbackSearchSuggestions(
    supabase: ReturnType<typeof createClient>,
    query: string,
    limit: number
): Promise<SearchSuggestion[]> {
    const normalizedQuery = query.toLowerCase().trim()

    const { data: products } = await supabase
        .from('master_products')
        .select('name, brand')
        .eq('is_active', true)
        .or(`name.ilike.%${normalizedQuery}%,brand.ilike.%${normalizedQuery}%`)
        .limit(limit)

    if (!products) return []

    const suggestions: SearchSuggestion[] = []
    const seenNames = new Set<string>()
    const seenBrands = new Set<string>()

    products.forEach(p => {
        if (p.name && !seenNames.has(p.name.toLowerCase())) {
            seenNames.add(p.name.toLowerCase())
            suggestions.push({ suggestion: p.name, type: 'product', count: 1 })
        }
        if (p.brand && !seenBrands.has(p.brand.toLowerCase())) {
            seenBrands.add(p.brand.toLowerCase())
            suggestions.push({ suggestion: p.brand, type: 'brand', count: 1 })
        }
    })

    return suggestions.slice(0, limit)
}

/**
 * Search products across all stores with intelligent fuzzy matching
 * Handles misspellings, word reordering, and partial matches
 */
export async function searchProducts(params: ProductSearchParams): Promise<ProductWithPrices[]> {
    const supabase = createClient()
    const {
        latitude,
        longitude,
        radius_miles = 25,
        query,
        category,
        min_price,
        max_price,
        sort_by = 'relevance',
        page = 1,
        limit = 20
    } = params

    try {
        // Get nearby store IDs if location provided
        let nearbyStoreIds: string[] | null = null
        let storeDistances: Map<string, number> = new Map()

        if (latitude && longitude) {
            const { data: nearbyData } = await supabase
                .rpc('get_nearby_stores', {
                    p_lat: latitude,
                    p_lng: longitude,
                    p_radius_miles: radius_miles
                })

            if (nearbyData && nearbyData.length > 0) {
                nearbyStoreIds = [...new Set(nearbyData.map((s: { store_id: string }) => s.store_id))]
                nearbyData.forEach((s: { store_id: string; distance_miles: number }) => {
                    if (!storeDistances.has(s.store_id) || storeDistances.get(s.store_id)! > s.distance_miles) {
                        storeDistances.set(s.store_id, s.distance_miles)
                    }
                })
            }
        }

        // Use fuzzy search RPC function
        const { data: fuzzyResults, error: fuzzyError } = await supabase.rpc('fuzzy_search_products', {
            p_query: query || null,
            p_category: category || null,
            p_brand: null,
            p_min_price: min_price ?? null,
            p_max_price: max_price ?? null,
            p_store_ids: nearbyStoreIds,
            p_limit: 100, // Get more to allow for further processing
            p_offset: 0,
            p_similarity_threshold: 0.15
        })

        // If fuzzy search fails, fall back to simple search
        if (fuzzyError) {
            console.warn('Fuzzy search failed, falling back to simple search:', fuzzyError)
            return fallbackSearchProducts(params)
        }

        if (!fuzzyResults || fuzzyResults.length === 0) {
            // Try with lower threshold if no results
            const { data: relaxedResults } = await supabase.rpc('fuzzy_search_products', {
                p_query: query || null,
                p_category: category || null,
                p_brand: null,
                p_min_price: min_price ?? null,
                p_max_price: max_price ?? null,
                p_store_ids: nearbyStoreIds,
                p_limit: 100,
                p_offset: 0,
                p_similarity_threshold: 0.1
            })

            if (!relaxedResults || relaxedResults.length === 0) {
                return []
            }

            return processSearchResults(relaxedResults, storeDistances, supabase, sort_by, page, limit)
        }

        return processSearchResults(fuzzyResults, storeDistances, supabase, sort_by, page, limit)

    } catch (error) {
        console.error('Error in searchProducts:', error)
        return fallbackSearchProducts(params)
    }
}

/**
 * Process fuzzy search results and enrich with store/price data
 */
async function processSearchResults(
    results: Array<{
        product_id: string
        product_name: string
        product_brand: string | null
        product_category: string
        product_subcategory: string | null
        thumbnail_url: string | null
        images: string[] | null
        description: string | null
        age_restriction: number | null
        slug: string | null
        min_price: number
        max_price: number
        store_count: number
        relevance_score: number
    }>,
    storeDistances: Map<string, number>,
    supabase: ReturnType<typeof createClient>,
    sort_by: string,
    page: number,
    limit: number
): Promise<ProductWithPrices[]> {

    // Get detailed inventory for these products
    const productIds = results.map(r => r.product_id)

    const { data: inventories } = await supabase
        .from('store_inventories')
        .select(`
            id,
            product_id,
            store_id,
            price,
            compare_at_price,
            quantity,
            is_available,
            store:stores(id, name, slug, logo_url, is_active)
        `)
        .in('product_id', productIds)
        .eq('is_available', true)
        .gt('quantity', 0)

    // Get delivery settings (with fallback for missing table)
    const storeIds = [...new Set(inventories?.map(i => i.store_id) || [])]
    const deliveryMap = await getDeliverySettingsForStores(storeIds)

    // Group inventories by product
    const inventoryByProduct = new Map<string, typeof inventories>()
    inventories?.forEach(inv => {
        const store = inv.store as { is_active: boolean } | null
        if (store?.is_active !== false) {
            if (!inventoryByProduct.has(inv.product_id)) {
                inventoryByProduct.set(inv.product_id, [])
            }
            inventoryByProduct.get(inv.product_id)!.push(inv)
        }
    })

    // Build final results with relevance scores
    let processedResults: (ProductWithPrices & { relevance: number })[] = results
        .filter(result => inventoryByProduct.has(result.product_id))
        .map(result => {
            const productInventories = inventoryByProduct.get(result.product_id) || []

            const prices: StorePrice[] = productInventories.map(inv => {
                const store = inv.store as { id: string; name: string; slug: string; logo_url: string | null } | null
                const delivery = deliveryMap.get(inv.store_id)
                const distance = storeDistances.get(inv.store_id) || 0

                return {
                    inventory_id: inv.id,
                    store_id: inv.store_id,
                    store_name: store?.name || 'Unknown Store',
                    store_slug: store?.slug || inv.store_id,
                    store_logo: store?.logo_url || null,
                    store_rating: 0,
                    store_review_count: 0,
                    location_id: '',
                    location_name: 'Main Location',
                    distance_miles: Number(distance.toFixed(2)),
                    price: inv.price,
                    original_price: inv.compare_at_price,
                    in_stock: inv.quantity > 0,
                    quantity: inv.quantity,
                    delivery_fee: delivery?.base_delivery_fee || 4.99,
                    free_delivery_threshold: delivery?.free_delivery_threshold || null,
                    minimum_order_amount: delivery?.minimum_order_amount || 0,
                    estimated_delivery: delivery?.estimated_delivery_time || '30-45 min',
                    estimated_pickup: delivery?.estimated_pickup_time || '15-20 min',
                    is_delivery_available: true,
                    is_pickup_available: true,
                    coupons: []
                }
            })

            prices.sort((a, b) => a.price - b.price)

            const lowestPrice = prices.length > 0 ? prices[0].price : result.min_price
            const highestPrice = prices.length > 0 ? prices[prices.length - 1].price : result.max_price

            return {
                id: result.product_id,
                name: result.product_name,
                brand: result.product_brand,
                category: result.product_category,
                subcategory: result.product_subcategory,
                thumbnail_url: result.thumbnail_url,
                images: result.images,
                description: result.description,
                age_restriction: result.age_restriction,
                slug: result.slug,
                prices,
                lowest_price: lowestPrice,
                highest_price: highestPrice,
                price_range_text: lowestPrice === highestPrice
                    ? `$${lowestPrice.toFixed(2)}`
                    : `$${lowestPrice.toFixed(2)} - $${highestPrice.toFixed(2)}`,
                relevance: result.relevance_score
            }
        })

    // Sort results
    if (sort_by === 'price') {
        processedResults.sort((a, b) => a.lowest_price - b.lowest_price)
    } else if (sort_by === 'distance') {
        processedResults.sort((a, b) => {
            const aMinDist = Math.min(...a.prices.map(p => p.distance_miles))
            const bMinDist = Math.min(...b.prices.map(p => p.distance_miles))
            return aMinDist - bMinDist
        })
    } else {
        // Sort by relevance (default for search)
        processedResults.sort((a, b) => b.relevance - a.relevance)
    }

    // Paginate
    const start = (page - 1) * limit
    return processedResults.slice(start, start + limit)
}

/**
 * Fallback search when fuzzy search RPC is not available
 */
async function fallbackSearchProducts(params: ProductSearchParams): Promise<ProductWithPrices[]> {
    const supabase = createClient()
    const {
        latitude,
        longitude,
        radius_miles = 25,
        query,
        category,
        min_price,
        max_price,
        sort_by = 'price',
        page = 1,
        limit = 20
    } = params

    try {
        // Build the products query
        let productsQuery = supabase
            .from('master_products')
            .select(`
                id,
                name,
                brand,
                category,
                subcategory,
                thumbnail_url,
                images,
                description,
                age_restriction,
                slug
            `)
            .eq('is_active', true)

        // Text search with multiple patterns for flexibility
        if (query) {
            const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2)
            if (words.length > 0) {
                // Search for any word match
                const orConditions = words.map(word =>
                    `name.ilike.%${word}%,brand.ilike.%${word}%`
                ).join(',')
                productsQuery = productsQuery.or(orConditions)
            }
        }

        // Category filter
        if (category) {
            productsQuery = productsQuery.ilike('category', category)
        }

        const { data: products, error: productsError } = await productsQuery.limit(100)

        if (productsError || !products || products.length === 0) {
            return []
        }

        // Get nearby stores if location provided
        let nearbyStoreIds: string[] = []
        let storeDistances: Map<string, number> = new Map()

        if (latitude && longitude) {
            const { data: nearbyData } = await supabase
                .rpc('get_nearby_stores', {
                    p_lat: latitude,
                    p_lng: longitude,
                    p_radius_miles: radius_miles
                })

            if (nearbyData && nearbyData.length > 0) {
                nearbyStoreIds = [...new Set(nearbyData.map((s: { store_id: string }) => s.store_id))]
                nearbyData.forEach((s: { store_id: string; distance_miles: number }) => {
                    if (!storeDistances.has(s.store_id) || storeDistances.get(s.store_id)! > s.distance_miles) {
                        storeDistances.set(s.store_id, s.distance_miles)
                    }
                })
            }
        }

        // Get inventory for these products
        const productIds = products.map(p => p.id)
        let inventoryQuery = supabase
            .from('store_inventories')
            .select(`
                id,
                product_id,
                store_id,
                price,
                compare_at_price,
                quantity,
                is_available,
                store:stores(id, name, slug, logo_url, is_active)
            `)
            .in('product_id', productIds)
            .eq('is_available', true)
            .gt('quantity', 0)

        if (min_price !== undefined) {
            inventoryQuery = inventoryQuery.gte('price', min_price)
        }
        if (max_price !== undefined) {
            inventoryQuery = inventoryQuery.lte('price', max_price)
        }

        if (nearbyStoreIds.length > 0) {
            inventoryQuery = inventoryQuery.in('store_id', nearbyStoreIds)
        }

        const { data: inventories } = await inventoryQuery

        // Get delivery settings (with fallback for missing table)
        const storeIds = [...new Set(inventories?.map(i => i.store_id) || [])]
        const deliveryMap = await getDeliverySettingsForStores(storeIds)

        // Group inventories by product
        const inventoryByProduct = new Map<string, typeof inventories>()
        inventories?.forEach(inv => {
            if (!inventoryByProduct.has(inv.product_id)) {
                inventoryByProduct.set(inv.product_id, [])
            }
            inventoryByProduct.get(inv.product_id)!.push(inv)
        })

        // Build products with prices
        let result: ProductWithPrices[] = products
            .filter(product => inventoryByProduct.has(product.id))
            .map(product => {
                const productInventories = inventoryByProduct.get(product.id) || []

                const prices: StorePrice[] = productInventories.map(inv => {
                    const store = inv.store as { id: string; name: string; slug: string; logo_url: string | null } | null
                    const delivery = deliveryMap.get(inv.store_id)
                    const distance = storeDistances.get(inv.store_id) || 0

                    return {
                        inventory_id: inv.id,
                        store_id: inv.store_id,
                        store_name: store?.name || 'Unknown Store',
                        store_slug: store?.slug || inv.store_id,
                        store_logo: store?.logo_url || null,
                        store_rating: 0,
                        store_review_count: 0,
                        location_id: '',
                        location_name: 'Main Location',
                        distance_miles: Number(distance.toFixed(2)),
                        price: inv.price,
                        original_price: inv.compare_at_price,
                        in_stock: inv.quantity > 0,
                        quantity: inv.quantity,
                        delivery_fee: delivery?.base_delivery_fee || 4.99,
                        free_delivery_threshold: delivery?.free_delivery_threshold || null,
                        minimum_order_amount: delivery?.minimum_order_amount || 0,
                        estimated_delivery: delivery?.estimated_delivery_time || '30-45 min',
                        estimated_pickup: delivery?.estimated_pickup_time || '15-20 min',
                        is_delivery_available: true,
                        is_pickup_available: true,
                        coupons: []
                    }
                })

                prices.sort((a, b) => a.price - b.price)

                const lowestPrice = prices.length > 0 ? prices[0].price : 0
                const highestPrice = prices.length > 0 ? prices[prices.length - 1].price : 0

                return {
                    id: product.id,
                    name: product.name,
                    brand: product.brand,
                    category: product.category,
                    subcategory: product.subcategory,
                    thumbnail_url: product.thumbnail_url,
                    images: product.images,
                    description: product.description,
                    age_restriction: product.age_restriction,
                    slug: product.slug,
                    prices,
                    lowest_price: lowestPrice,
                    highest_price: highestPrice,
                    price_range_text: lowestPrice === highestPrice
                        ? `$${lowestPrice.toFixed(2)}`
                        : `$${lowestPrice.toFixed(2)} - $${highestPrice.toFixed(2)}`
                }
            })

        // Sort results
        if (sort_by === 'price') {
            result.sort((a, b) => a.lowest_price - b.lowest_price)
        } else if (sort_by === 'distance' && latitude && longitude) {
            result.sort((a, b) => {
                const aMinDist = Math.min(...a.prices.map(p => p.distance_miles))
                const bMinDist = Math.min(...b.prices.map(p => p.distance_miles))
                return aMinDist - bMinDist
            })
        }

        // Paginate
        const start = (page - 1) * limit
        return result.slice(start, start + limit)

    } catch (error) {
        console.error('Error in fallbackSearchProducts:', error)
        return []
    }
}

/**
 * Get active coupons for stores
 */
async function getActiveCouponsForStores(storeIds: string[]): Promise<Map<string, StoreCoupon[]>> {
    if (!storeIds.length) return new Map()

    const supabase = createClient()

    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('id, store_id, code, description, type, value, minimum_order_amount')
            .in('store_id', storeIds)
            .eq('is_active', true)
            .lte('start_date', new Date().toISOString())
            .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)

        if (error) {
            console.error('Error fetching coupons:', error)
            return new Map()
        }

        const couponMap = new Map<string, StoreCoupon[]>()
        data?.forEach(coupon => {
            if (!couponMap.has(coupon.store_id)) {
                couponMap.set(coupon.store_id, [])
            }
            couponMap.get(coupon.store_id)!.push({
                id: coupon.id,
                code: coupon.code,
                description: coupon.description,
                type: coupon.type as 'percentage' | 'fixed',
                value: coupon.value,
                minimum_order_amount: coupon.minimum_order_amount
            })
        })

        return couponMap
    } catch (err) {
        console.error('Error fetching coupons:', err)
        return new Map()
    }
}

/**
 * Get a single product by ID or slug with all store prices
 */
export async function getProduct(idOrSlug: string): Promise<ProductWithPrices | null> {
    const supabase = createClient()

    try {
        // Try to find by ID first, then by slug
        let query = supabase
            .from('master_products')
            .select(`
                id,
                name,
                brand,
                category,
                subcategory,
                thumbnail_url,
                images,
                description,
                age_restriction,
                slug
            `)
            .eq('is_active', true)

        // Check if it's a UUID or slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
        if (isUUID) {
            query = query.eq('id', idOrSlug)
        } else {
            query = query.eq('slug', idOrSlug)
        }

        const { data: product, error } = await query.single()

        if (error || !product) {
            console.error('Error fetching product:', error)
            return null
        }

        // Get all inventory for this product with store and location details
        const { data: inventories } = await supabase
            .from('store_inventories')
            .select(`
                id,
                product_id,
                store_id,
                store_location_id,
                price,
                compare_at_price,
                quantity,
                is_available,
                store:stores(id, name, slug, logo_url, is_active, average_rating, total_reviews),
                location:store_locations(id, name, address_line1, city, state, zip_code, is_delivery_available, is_pickup_available)
            `)
            .eq('product_id', product.id)
            .eq('is_available', true)

        // Get store IDs that are active
        const activeInventories = (inventories || []).filter(inv => {
            const store = inv.store as { is_active: boolean } | null
            return store?.is_active !== false
        })

        const storeIds = [...new Set(activeInventories.map(i => i.store_id))]

        // Fetch delivery settings and coupons in parallel
        const [deliveryMap, couponsMap] = await Promise.all([
            getDeliverySettingsForStores(storeIds),
            getActiveCouponsForStores(storeIds)
        ])

        const prices: StorePrice[] = activeInventories.map(inv => {
            const store = inv.store as {
                id: string
                name: string
                slug: string
                logo_url: string | null
                average_rating: number | null
                total_reviews: number | null
            } | null
            const location = inv.location as {
                id: string
                name: string
                address_line1: string | null
                city: string | null
                state: string | null
                zip_code: string | null
                is_delivery_available: boolean
                is_pickup_available: boolean
            } | null
            const delivery = deliveryMap.get(inv.store_id)
            const storeCoupons = couponsMap.get(inv.store_id) || []

            return {
                inventory_id: inv.id,
                store_id: inv.store_id,
                store_name: store?.name || 'Unknown Store',
                store_slug: store?.slug || inv.store_id,
                store_logo: store?.logo_url || null,
                store_rating: store?.average_rating || 0,
                store_review_count: store?.total_reviews || 0,
                location_id: location?.id || inv.store_location_id || '',
                location_name: location?.name || 'Main Location',
                distance_miles: 0, // Would need user location to calculate
                price: inv.price,
                original_price: inv.compare_at_price,
                in_stock: inv.quantity > 0,
                quantity: inv.quantity,
                delivery_fee: delivery?.base_delivery_fee ?? DEFAULT_DELIVERY_SETTINGS.base_delivery_fee,
                free_delivery_threshold: delivery?.free_delivery_threshold ?? null,
                minimum_order_amount: delivery?.minimum_order_amount ?? DEFAULT_DELIVERY_SETTINGS.minimum_order_amount,
                estimated_delivery: delivery?.estimated_delivery_time ?? DEFAULT_DELIVERY_SETTINGS.estimated_delivery_time,
                estimated_pickup: delivery?.estimated_pickup_time ?? DEFAULT_DELIVERY_SETTINGS.estimated_pickup_time,
                is_delivery_available: location?.is_delivery_available ?? delivery?.is_delivery_enabled ?? DEFAULT_DELIVERY_SETTINGS.is_delivery_enabled,
                is_pickup_available: location?.is_pickup_available ?? delivery?.is_pickup_enabled ?? DEFAULT_DELIVERY_SETTINGS.is_pickup_enabled,
                coupons: storeCoupons
            }
        })

        prices.sort((a, b) => a.price - b.price)

        const lowestPrice = prices.length > 0 ? prices[0].price : 0
        const highestPrice = prices.length > 0 ? prices[prices.length - 1].price : 0

        return {
            id: product.id,
            name: product.name,
            brand: product.brand,
            category: product.category,
            subcategory: product.subcategory,
            thumbnail_url: product.thumbnail_url,
            images: product.images,
            description: product.description,
            age_restriction: product.age_restriction,
            slug: product.slug,
            prices,
            lowest_price: lowestPrice,
            highest_price: highestPrice,
            price_range_text: lowestPrice === highestPrice
                ? `$${lowestPrice.toFixed(2)}`
                : `$${lowestPrice.toFixed(2)} - $${highestPrice.toFixed(2)}`
        }

    } catch (error) {
        console.error('Error in getProduct:', error)
        return null
    }
}

/**
 * Get store details by slug
 */
export async function getStoreDetails(slug: string): Promise<StoreDetails | null> {
    const supabase = createClient()

    try {
        const { data: store, error } = await supabase
            .from('stores')
            .select(`
                id,
                name,
                slug,
                logo_url,
                banner_url,
                description,
                email,
                phone,
                website,
                average_rating,
                total_reviews,
                is_active,
                is_featured
            `)
            .eq('slug', slug)
            .eq('is_active', true)
            .single()

        if (error || !store) {
            console.error('Error fetching store:', error)
            return null
        }

        // Get primary location
        const { data: location } = await supabase
            .from('store_locations')
            .select('*')
            .eq('store_id', store.id)
            .eq('is_primary', true)
            .single()

        // Get delivery settings (with fallback for missing table)
        const delivery = await getDeliverySettingsForStore(store.id)

        const isOpen = location?.business_hours
            ? checkIfStoreIsOpen(location.business_hours)
            : true

        return {
            id: store.id,
            name: store.name,
            slug: store.slug,
            logo_url: store.logo_url,
            thumbnail_url: store.banner_url,
            banner_url: store.banner_url,
            description: store.description,
            email: store.email,
            phone: store.phone,
            website: store.website,
            distance_miles: 0, // Would need user location
            rating: store.average_rating || 0,
            review_count: store.total_reviews || 0,
            is_open: isOpen,
            is_featured: store.is_featured || false,
            location_id: location?.id || '',
            location_name: location?.name || 'Main Location',
            address: {
                street: location?.address_line1 || '',
                city: location?.city || '',
                state: location?.state || '',
                zip: location?.zip_code || ''
            },
            delivery_info: {
                minimum_order: delivery?.minimum_order_amount || 0,
                delivery_fee: delivery?.base_delivery_fee || 4.99,
                estimated_time: delivery?.estimated_delivery_time || '30-45 min',
                is_delivery_available: location?.is_delivery_available ?? true
            },
            hours: location?.business_hours as Record<string, { open: string; close: string }> | null
        }

    } catch (error) {
        console.error('Error in getStoreDetails:', error)
        return null
    }
}

/**
 * Get products for a specific store
 */
export async function getStoreProducts(
    storeId: string,
    params: { category?: string; search?: string; page?: number; limit?: number } = {}
): Promise<ProductWithPrices[]> {
    const supabase = createClient()
    const { category, search, page = 1, limit = 20 } = params

    try {
        let query = supabase
            .from('store_inventories')
            .select(`
                id,
                price,
                compare_at_price,
                quantity,
                is_available,
                product:master_products(
                    id,
                    name,
                    brand,
                    category,
                    subcategory,
                    thumbnail_url,
                    images,
                    description,
                    age_restriction,
                    slug
                ),
                store:stores(id, name, slug, logo_url)
            `)
            .eq('store_id', storeId)
            .eq('is_available', true)

        const { data: inventories, error } = await query

        if (error) {
            console.error('Error fetching store products:', error)
            return []
        }

        let products: ProductWithPrices[] = (inventories || [])
            .filter(inv => inv.product)
            .map(inv => {
                const product = inv.product as {
                    id: string
                    name: string
                    brand: string | null
                    category: string
                    subcategory: string | null
                    thumbnail_url: string | null
                    images: string[] | null
                    description: string | null
                    age_restriction: number | null
                    slug: string | null
                }
                const store = inv.store as { id: string; name: string; slug: string; logo_url: string | null }

                return {
                    id: product.id,
                    name: product.name,
                    brand: product.brand,
                    category: product.category,
                    subcategory: product.subcategory,
                    thumbnail_url: product.thumbnail_url,
                    images: product.images,
                    description: product.description,
                    age_restriction: product.age_restriction,
                    slug: product.slug,
                    prices: [{
                        inventory_id: inv.id,
                        store_id: storeId,
                        store_name: store?.name || 'Unknown',
                        store_slug: store?.slug || storeId,
                        store_logo: store?.logo_url || null,
                        store_rating: 0,
                        store_review_count: 0,
                        location_id: '',
                        location_name: 'Main Location',
                        distance_miles: 0,
                        price: inv.price,
                        original_price: inv.compare_at_price,
                        in_stock: inv.quantity > 0,
                        quantity: inv.quantity,
                        delivery_fee: 4.99,
                        free_delivery_threshold: null,
                        minimum_order_amount: 0,
                        estimated_delivery: '30-45 min',
                        estimated_pickup: '15-20 min',
                        is_delivery_available: true,
                        is_pickup_available: true,
                        coupons: []
                    }],
                    lowest_price: inv.price,
                    highest_price: inv.price,
                    price_range_text: `$${inv.price.toFixed(2)}`
                }
            })

        // Filter by category
        if (category) {
            products = products.filter(p => p.category.toLowerCase() === category.toLowerCase())
        }

        // Filter by search
        if (search) {
            const searchLower = search.toLowerCase()
            products = products.filter(p =>
                p.name.toLowerCase().includes(searchLower) ||
                p.brand?.toLowerCase().includes(searchLower) ||
                p.description?.toLowerCase().includes(searchLower)
            )
        }

        // Paginate
        const start = (page - 1) * limit
        return products.slice(start, start + limit)

    } catch (error) {
        console.error('Error in getStoreProducts:', error)
        return []
    }
}

/**
 * Get available products for homepage
 * Shows unique products from master_products that are available in at least one store
 * Products are not duplicated even if available in multiple stores
 */
export async function getFeaturedProducts(limit: number = 12): Promise<ProductWithPrices[]> {
    const supabase = createClient()

    try {
        // First, get active products from master_products
        const { data: products, error: productsError } = await supabase
            .from('master_products')
            .select(`
                id,
                name,
                brand,
                category,
                subcategory,
                thumbnail_url,
                images,
                description,
                age_restriction,
                slug
            `)
            .eq('is_active', true)
            .limit(100) // Get more than limit to filter by availability

        if (productsError) {
            console.error('Error fetching products:', productsError)
            return []
        }

        if (!products || products.length === 0) {
            return []
        }

        // Get all inventory for these products (available with stock)
        const productIds = products.map(p => p.id)
        const { data: inventories, error: inventoryError } = await supabase
            .from('store_inventories')
            .select(`
                id,
                product_id,
                store_id,
                price,
                compare_at_price,
                quantity,
                is_available,
                store:stores(id, name, slug, logo_url, is_active)
            `)
            .in('product_id', productIds)
            .eq('is_available', true)
            .gt('quantity', 0)

        if (inventoryError) {
            console.error('Error fetching inventory:', inventoryError)
            return []
        }

        // Get delivery settings for stores (with fallback for missing table)
        const storeIds = [...new Set(inventories?.map(i => i.store_id) || [])]
        const deliveryMap = await getDeliverySettingsForStores(storeIds)

        // Group inventories by product
        const inventoryByProduct = new Map<string, typeof inventories>()
        inventories?.forEach(inv => {
            // Only include if store is active
            const store = inv.store as { is_active: boolean } | null
            if (store?.is_active !== false) {
                if (!inventoryByProduct.has(inv.product_id)) {
                    inventoryByProduct.set(inv.product_id, [])
                }
                inventoryByProduct.get(inv.product_id)!.push(inv)
            }
        })

        // Build products with prices (only those with available inventory)
        const result: ProductWithPrices[] = products
            .filter(product => inventoryByProduct.has(product.id))
            .map(product => {
                const productInventories = inventoryByProduct.get(product.id) || []

                const prices: StorePrice[] = productInventories.map(inv => {
                    const store = inv.store as { id: string; name: string; slug: string; logo_url: string | null } | null
                    const delivery = deliveryMap.get(inv.store_id)

                    return {
                        inventory_id: inv.id,
                        store_id: inv.store_id,
                        store_name: store?.name || 'Unknown Store',
                        store_slug: store?.slug || inv.store_id,
                        store_logo: store?.logo_url || null,
                        store_rating: 0,
                        store_review_count: 0,
                        location_id: '',
                        location_name: 'Main Location',
                        distance_miles: 0,
                        price: inv.price,
                        original_price: inv.compare_at_price,
                        in_stock: inv.quantity > 0,
                        quantity: inv.quantity,
                        delivery_fee: delivery?.base_delivery_fee || 4.99,
                        free_delivery_threshold: delivery?.free_delivery_threshold || null,
                        minimum_order_amount: delivery?.minimum_order_amount || 0,
                        estimated_delivery: delivery?.estimated_delivery_time || '30-45 min',
                        estimated_pickup: delivery?.estimated_pickup_time || '15-20 min',
                        is_delivery_available: true,
                        is_pickup_available: true,
                        coupons: []
                    }
                })

                // Sort prices by price (lowest first)
                prices.sort((a, b) => a.price - b.price)

                const lowestPrice = prices.length > 0 ? prices[0].price : 0
                const highestPrice = prices.length > 0 ? prices[prices.length - 1].price : 0

                return {
                    id: product.id,
                    name: product.name,
                    brand: product.brand,
                    category: product.category,
                    subcategory: product.subcategory,
                    thumbnail_url: product.thumbnail_url,
                    images: product.images,
                    description: product.description,
                    age_restriction: product.age_restriction,
                    slug: product.slug,
                    prices,
                    lowest_price: lowestPrice,
                    highest_price: highestPrice,
                    price_range_text: lowestPrice === highestPrice
                        ? `$${lowestPrice.toFixed(2)}`
                        : `$${lowestPrice.toFixed(2)} - $${highestPrice.toFixed(2)}`
                }
            })

        // Sort by lowest price and return the requested limit
        result.sort((a, b) => a.lowest_price - b.lowest_price)
        return result.slice(0, limit)

    } catch (error) {
        console.error('Error in getFeaturedProducts:', error)
        return []
    }
}

// Helper function to check if store is open based on business hours
function checkIfStoreIsOpen(businessHours: unknown): boolean {
    try {
        if (!businessHours || typeof businessHours !== 'object') return true

        const hours = businessHours as Record<string, { open: string; close: string }>
        const now = new Date()
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const today = dayNames[now.getDay()]

        const todayHours = hours[today]
        if (!todayHours || !todayHours.open || !todayHours.close) return true

        const currentTime = now.getHours() * 60 + now.getMinutes()
        const [openHour, openMin] = todayHours.open.split(':').map(Number)
        const [closeHour, closeMin] = todayHours.close.split(':').map(Number)

        const openTime = openHour * 60 + openMin
        const closeTime = closeHour * 60 + closeMin

        return currentTime >= openTime && currentTime <= closeTime
    } catch {
        return true
    }
}

// Utility for distance calculation (Haversine formula)
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 3959 // Earth's radius in miles
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180)
}

// Default fallback categories (used when database is empty)
export const categories = [
    { id: 'spirits', name: 'Spirits', icon: '' },
    { id: 'wine', name: 'Wine', icon: '' },
    { id: 'beer', name: 'Beer', icon: '' },
    { id: 'mixers', name: 'Mixers', icon: '' },
    { id: 'accessories', name: 'Accessories', icon: '' },
]

export interface CategoryWithCount {
    id: string
    name: string
    slug: string
    description: string | null
    image_url: string | null
    parent_id: string | null
    count: number
    sort_order: number
}

/**
 * Get all product categories from database with product counts
 */
export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
    const supabase = createClient()

    try {
        // Get categories from the product_categories table
        const { data: categoriesData, error: catError } = await supabase
            .from('product_categories')
            .select('id, name, slug, description, image_url, parent_id, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (catError) {
            console.error('Error fetching categories:', catError)
            return categories.map(c => ({
                id: c.id,
                name: c.name,
                slug: c.id,
                description: null,
                image_url: null,
                parent_id: null,
                count: 0,
                sort_order: 0
            }))
        }

        if (!categoriesData || categoriesData.length === 0) {
            return categories.map(c => ({
                id: c.id,
                name: c.name,
                slug: c.id,
                description: null,
                image_url: null,
                parent_id: null,
                count: 0,
                sort_order: 0
            }))
        }

        // Get product counts per category
        const { data: productsData } = await supabase
            .from('master_products')
            .select('category')
            .eq('is_active', true)

        // Count products per category name
        const categoryCounts = new Map<string, number>()
        productsData?.forEach(item => {
            if (item.category) {
                const lowerName = item.category.toLowerCase()
                const count = categoryCounts.get(lowerName) || 0
                categoryCounts.set(lowerName, count + 1)
            }
        })

        // Build result with counts
        const result: CategoryWithCount[] = categoriesData.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            image_url: cat.image_url,
            parent_id: cat.parent_id,
            count: categoryCounts.get(cat.name.toLowerCase()) || 0,
            sort_order: cat.sort_order || 0
        }))

        return result

    } catch (error) {
        console.error('Error in getCategoriesWithCounts:', error)
        return categories.map(c => ({
            id: c.id,
            name: c.name,
            slug: c.id,
            description: null,
            image_url: null,
            parent_id: null,
            count: 0,
            sort_order: 0
        }))
    }
}

/**
 * Location selection result for cart items
 */
export interface NearestLocationResult {
    locationId: string
    locationName: string
    inventoryId: string
    distanceMiles: number | null
    quantity: number
    address: {
        street: string
        city: string
        state: string
        zipCode: string
    }
}

/**
 * Get the nearest location with stock for a product
 * Used when adding items to cart to determine which location will fulfill the order
 */
export async function getNearestLocationWithStock(
    storeId: string,
    productId: string,
    customerLat?: number | null,
    customerLng?: number | null,
    fulfillmentType: 'delivery' | 'pickup' = 'delivery'
): Promise<NearestLocationResult | null> {
    const supabase = createClient()

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)('get_nearest_location_with_stock', {
            p_store_id: storeId,
            p_product_id: productId,
            p_customer_lat: customerLat || null,
            p_customer_lng: customerLng || null,
            p_fulfillment_type: fulfillmentType
        })

        if (error) {
            console.error('Error getting nearest location:', error)
            return null
        }

        if (!data || data.length === 0) {
            return null
        }

        const location = data[0]
        return {
            locationId: location.location_id,
            locationName: location.location_name,
            inventoryId: location.inventory_id,
            distanceMiles: location.distance_miles,
            quantity: location.quantity,
            address: {
                street: location.address_line1 || '',
                city: location.city || '',
                state: location.state || '',
                zipCode: location.zip_code || ''
            }
        }
    } catch (error) {
        console.error('Error in getNearestLocationWithStock:', error)
        return null
    }
}

/**
 * Get all available locations for a product with distances
 * Used to show customer which locations have the product available
 */
export async function getAvailableLocationsForProduct(
    storeId: string,
    productId: string,
    customerLat?: number | null,
    customerLng?: number | null
): Promise<Array<{
    locationId: string
    locationName: string
    inventoryId: string
    distanceMiles: number | null
    quantity: number
    price: number
    isDeliveryAvailable: boolean
    isPickupAvailable: boolean
    isWithinDeliveryRange: boolean
    address: {
        street: string
        city: string
        state: string
        zipCode: string
    }
}>> {
    const supabase = createClient()

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)('get_available_locations_for_product', {
            p_store_id: storeId,
            p_product_id: productId,
            p_customer_lat: customerLat || null,
            p_customer_lng: customerLng || null
        })

        if (error) {
            console.error('Error getting available locations:', error)
            return []
        }

        return (data || []).map((loc: {
            location_id: string
            location_name: string
            inventory_id: string
            distance_miles: number | null
            quantity: number
            price: number
            is_delivery_available: boolean
            is_pickup_available: boolean
            is_within_delivery_range: boolean
            address_line1: string
            city: string
            state: string
            zip_code: string
        }) => ({
            locationId: loc.location_id,
            locationName: loc.location_name,
            inventoryId: loc.inventory_id,
            distanceMiles: loc.distance_miles,
            quantity: loc.quantity,
            price: loc.price,
            isDeliveryAvailable: loc.is_delivery_available,
            isPickupAvailable: loc.is_pickup_available,
            isWithinDeliveryRange: loc.is_within_delivery_range,
            address: {
                street: loc.address_line1 || '',
                city: loc.city || '',
                state: loc.state || '',
                zipCode: loc.zip_code || ''
            }
        }))
    } catch (error) {
        console.error('Error in getAvailableLocationsForProduct:', error)
        return []
    }
}
