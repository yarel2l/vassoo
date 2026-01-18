import { createClient } from '@/lib/supabase/client'

// Note: The store_custom_products table requires migration 022_hybrid_catalog.sql to be applied
// After applying the migration, regenerate types with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID

// Helper to get typed supabase client that bypasses strict table checking
// This is needed because store_custom_products table may not exist in generated types yet
const getSupabaseClient = () => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabase as any
}

// Types for hybrid catalog model
export type ProductApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'promoted'

export interface MasterProduct {
    id: string
    sku: string
    upc: string | null
    name: string
    brand: string | null
    description: string | null
    category: string
    subcategory: string | null
    tags: string[]
    specifications: Record<string, unknown>
    images: string[]
    thumbnail_url: string | null
    age_restriction: number | null
    slug: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface StoreInventory {
    id: string
    store_id: string
    store_location_id: string | null
    product_id: string
    price: number
    compare_at_price: number | null
    cost: number | null
    quantity: number
    low_stock_threshold: number
    discount_type: string | null
    discount_value: number | null
    discount_start_date: string | null
    discount_end_date: string | null
    is_available: boolean
    is_featured: boolean
    created_at: string
    updated_at: string
    // Joined product
    product?: MasterProduct
}

export interface StoreCustomProduct {
    id: string
    store_id: string
    sku: string
    upc: string | null
    name: string
    brand: string | null
    description: string | null
    category: string
    subcategory: string | null
    tags: string[]
    specifications: Record<string, unknown>
    images: string[]
    thumbnail_url: string | null
    age_restriction: number | null
    slug: string | null
    price: number
    compare_at_price: number | null
    cost: number | null
    quantity: number
    low_stock_threshold: number
    approval_status: ProductApprovalStatus
    submitted_at: string | null
    reviewed_at: string | null
    reviewed_by: string | null
    rejection_reason: string | null
    promoted_to_master_id: string | null
    promoted_at: string | null
    is_available: boolean
    is_featured: boolean
    created_at: string
    updated_at: string
}

// Unified product view for store dashboard
export interface UnifiedStoreProduct {
    inventory_id: string
    store_id: string
    product_id: string | null
    custom_product_id: string | null
    product_source: 'master' | 'custom'
    sku: string
    upc: string | null
    name: string
    brand: string | null
    description: string | null
    category: string
    subcategory: string | null
    tags: string[]
    specifications: Record<string, unknown>
    images: string[]
    thumbnail_url: string | null
    age_restriction: number | null
    slug: string | null
    price: number
    compare_at_price: number | null
    cost: number | null
    quantity: number
    low_stock_threshold: number
    is_available: boolean
    is_featured: boolean
    approval_status: ProductApprovalStatus
    created_at: string
    updated_at: string
}

export interface CreateCustomProductInput {
    store_id: string
    sku: string
    upc?: string
    name: string
    brand?: string
    description?: string
    category: string
    subcategory?: string
    tags?: string[]
    specifications?: Record<string, unknown>
    images?: string[]
    thumbnail_url?: string
    age_restriction?: number
    price: number
    compare_at_price?: number
    cost?: number
    quantity: number
    low_stock_threshold?: number
}

export interface ImportFromCatalogInput {
    store_id: string
    product_id: string
    price: number
    compare_at_price?: number
    cost?: number
    quantity: number
    low_stock_threshold?: number
    is_featured?: boolean
}

// Store Products Service
export const storeProductsService = {
    // Get all products for a store (unified view)
    async getStoreProducts(storeId: string): Promise<UnifiedStoreProduct[]> {
        const supabase = getSupabaseClient()

        // Get master products via store_inventories
        const { data: inventories, error: invError } = await supabase
            .from('store_inventories')
            .select(`
                id,
                store_id,
                product_id,
                price,
                compare_at_price,
                cost,
                quantity,
                low_stock_threshold,
                is_available,
                is_featured,
                created_at,
                updated_at,
                product:master_products (
                    id,
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
                    is_active
                )
            `)
            .eq('store_id', storeId)

        if (invError) {
            console.error('Error fetching store inventories:', invError)
            throw invError
        }

        // Get custom products (table may not exist if migration not applied)
        let customProducts: StoreCustomProduct[] = []
        try {
            const { data, error: customError } = await getSupabaseClient()
                .from('store_custom_products')
                .select('*')
                .eq('store_id', storeId)

            if (customError) {
                // Table doesn't exist yet - migration not applied
                if (customError.code === 'PGRST205') {
                    // Migration not applied - this is expected in some environments
                } else {
                    console.error('Error fetching custom products:', customError)
                    throw customError
                }
            } else {
                customProducts = data || []
            }
        } catch (err) {
            // Silently handle custom products fetch errors
        }

        // Transform to unified format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const masterProducts: UnifiedStoreProduct[] = (inventories || [])
            .filter((inv: any) => inv.product)
            .map((inv: any) => ({
                inventory_id: inv.id,
                store_id: inv.store_id,
                product_id: inv.product_id,
                custom_product_id: null,
                product_source: 'master' as const,
                sku: (inv.product as MasterProduct).sku,
                upc: (inv.product as MasterProduct).upc,
                name: (inv.product as MasterProduct).name,
                brand: (inv.product as MasterProduct).brand,
                description: (inv.product as MasterProduct).description,
                category: (inv.product as MasterProduct).category,
                subcategory: (inv.product as MasterProduct).subcategory,
                tags: (inv.product as MasterProduct).tags || [],
                specifications: (inv.product as MasterProduct).specifications || {},
                images: (inv.product as MasterProduct).images || [],
                thumbnail_url: (inv.product as MasterProduct).thumbnail_url,
                age_restriction: (inv.product as MasterProduct).age_restriction,
                slug: (inv.product as MasterProduct).slug,
                price: inv.price,
                compare_at_price: inv.compare_at_price,
                cost: inv.cost,
                quantity: inv.quantity,
                low_stock_threshold: inv.low_stock_threshold,
                is_available: inv.is_available,
                is_featured: inv.is_featured,
                approval_status: 'approved' as ProductApprovalStatus,
                created_at: inv.created_at,
                updated_at: inv.updated_at,
            }))

        const customProductsList: UnifiedStoreProduct[] = (customProducts || []).map(cp => ({
            inventory_id: cp.id,
            store_id: cp.store_id,
            product_id: null,
            custom_product_id: cp.id,
            product_source: 'custom' as const,
            sku: cp.sku,
            upc: cp.upc,
            name: cp.name,
            brand: cp.brand,
            description: cp.description,
            category: cp.category,
            subcategory: cp.subcategory,
            tags: cp.tags || [],
            specifications: cp.specifications || {},
            images: cp.images || [],
            thumbnail_url: cp.thumbnail_url,
            age_restriction: cp.age_restriction,
            slug: cp.slug,
            price: cp.price,
            compare_at_price: cp.compare_at_price,
            cost: cp.cost,
            quantity: cp.quantity,
            low_stock_threshold: cp.low_stock_threshold,
            is_available: cp.is_available,
            is_featured: cp.is_featured,
            approval_status: cp.approval_status as ProductApprovalStatus,
            created_at: cp.created_at,
            updated_at: cp.updated_at,
        }))

        const allProducts = [...masterProducts, ...customProductsList]
        return allProducts
    },

    // Get master catalog products available to import
    async getMasterCatalog(search?: string, category?: string): Promise<MasterProduct[]> {
        const supabase = getSupabaseClient()

        let query = supabase
            .from('master_products')
            .select('*')
            .eq('is_active', true)
            .order('name')

        if (search) {
            query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,sku.ilike.%${search}%`)
        }

        if (category) {
            query = query.eq('category', category)
        }

        const { data, error } = await query.limit(100)

        if (error) {
            console.error('Error fetching master catalog:', error)
            throw error
        }

        return (data || []) as MasterProduct[]
    },

    // Import product from master catalog to store
    async importFromCatalog(input: ImportFromCatalogInput): Promise<StoreInventory> {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('store_inventories')
            .insert({
                store_id: input.store_id,
                product_id: input.product_id,
                price: input.price,
                compare_at_price: input.compare_at_price || null,
                cost: input.cost || null,
                quantity: input.quantity,
                low_stock_threshold: input.low_stock_threshold || 10,
                is_available: true,
                is_featured: input.is_featured || false,
            })
            .select()
            .single()

        if (error) {
            console.error('Error importing product:', error)
            throw error
        }

        return data as StoreInventory
    },

    // Create custom product
    async createCustomProduct(input: CreateCustomProductInput): Promise<StoreCustomProduct> {
        const { data, error } = await getSupabaseClient()
            .from('store_custom_products')
            .insert({
                store_id: input.store_id,
                sku: input.sku,
                upc: input.upc || null,
                name: input.name,
                brand: input.brand || null,
                description: input.description || null,
                category: input.category,
                subcategory: input.subcategory || null,
                tags: input.tags || [],
                specifications: input.specifications || {},
                images: input.images || [],
                thumbnail_url: input.thumbnail_url || null,
                age_restriction: input.age_restriction || 21,
                price: input.price,
                compare_at_price: input.compare_at_price || null,
                cost: input.cost || null,
                quantity: input.quantity,
                low_stock_threshold: input.low_stock_threshold || 10,
                approval_status: 'draft',
                is_available: false,
                is_featured: false,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating custom product:', error)
            throw error
        }

        return data
    },

    // Update custom product
    async updateCustomProduct(id: string, updates: Partial<CreateCustomProductInput>): Promise<StoreCustomProduct> {
        const { data, error } = await getSupabaseClient()
            .from('store_custom_products')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating custom product:', error)
            throw error
        }

        return data
    },

    // Submit custom product for review
    async submitForReview(productId: string): Promise<StoreCustomProduct> {
        const { data, error } = await getSupabaseClient()
            .from('store_custom_products')
            .update({
                approval_status: 'pending_review',
                submitted_at: new Date().toISOString(),
            })
            .eq('id', productId)
            .in('approval_status', ['draft', 'rejected'])
            .select()
            .single()

        if (error) {
            console.error('Error submitting for review:', error)
            throw error
        }

        return data
    },

    // Update store inventory (for master products)
    async updateInventory(
        inventoryId: string,
        updates: {
            price?: number
            cost?: number
            quantity?: number
            is_available?: boolean
            is_featured?: boolean
            low_stock_threshold?: number
        }
    ): Promise<StoreInventory> {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('store_inventories')
            .update(updates)
            .eq('id', inventoryId)
            .select()
            .single()

        if (error) {
            console.error('Error updating inventory:', error)
            throw error
        }

        return data as StoreInventory
    },

    // Remove product from store (inventory)
    async removeFromStore(inventoryId: string): Promise<void> {
        const { error } = await getSupabaseClient()
            .from('store_inventories')
            .delete()
            .eq('id', inventoryId)

        if (error) {
            console.error('Error removing from store:', error)
            throw error
        }
    },

    // Delete custom product (only drafts)
    async deleteCustomProduct(productId: string): Promise<void> {
        const { error } = await getSupabaseClient()
            .from('store_custom_products')
            .delete()
            .eq('id', productId)
            .eq('approval_status', 'draft')

        if (error) {
            console.error('Error deleting custom product:', error)
            throw error
        }
    },

    // Get categories from master catalog
    async getCategories(): Promise<string[]> {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('master_products')
            .select('category')
            .eq('is_active', true)

        if (error) {
            console.error('Error fetching categories:', error)
            throw error
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const categories = [...new Set((data || []).map((p: any) => p.category as string))].sort()
        return categories
    },
}

// Platform Admin Products Service
export const platformProductsService = {
    // Get all pending custom products for review
    async getPendingProducts(): Promise<(StoreCustomProduct & { store_name: string })[]> {
        const { data, error } = await getSupabaseClient()
            .from('store_custom_products')
            .select(`
                *,
                store:stores (
                    id,
                    name
                )
            `)
            .eq('approval_status', 'pending_review')
            .order('submitted_at', { ascending: true })

        if (error) {
            // Table doesn't exist yet - migration not applied
            if (error.code === 'PGRST205') {
                return []
            }
            console.error('Error fetching pending products:', error)
            throw error
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (data || []).map((p: any) => ({
            ...p,
            store_name: (p.store as { name: string })?.name || 'Unknown Store',
        }))
    },

    // Approve custom product
    async approveProduct(productId: string, reviewerId: string): Promise<StoreCustomProduct> {
        const { data, error } = await getSupabaseClient()
            .from('store_custom_products')
            .update({
                approval_status: 'approved',
                reviewed_at: new Date().toISOString(),
                reviewed_by: reviewerId,
                is_available: true,
            })
            .eq('id', productId)
            .eq('approval_status', 'pending_review')
            .select()
            .single()

        if (error) {
            console.error('Error approving product:', error)
            throw error
        }

        return data
    },

    // Reject custom product
    async rejectProduct(productId: string, reviewerId: string, reason: string): Promise<StoreCustomProduct> {
        const { data, error } = await getSupabaseClient()
            .from('store_custom_products')
            .update({
                approval_status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by: reviewerId,
                rejection_reason: reason,
                is_available: false,
            })
            .eq('id', productId)
            .eq('approval_status', 'pending_review')
            .select()
            .single()

        if (error) {
            console.error('Error rejecting product:', error)
            throw error
        }

        return data
    },

    // Promote custom product to master catalog
    async promoteToMaster(productId: string, reviewerId: string): Promise<string> {
        const supabase = getSupabaseClient()

        // Get the custom product first
        const { data: customProduct, error: fetchError } = await supabase
            .from('store_custom_products')
            .select('*')
            .eq('id', productId)
            .eq('approval_status', 'approved')
            .single()

        if (fetchError || !customProduct) {
            throw new Error('Product not found or not approved')
        }

        // Generate unique SKU
        const prefix = (customProduct.category || 'GEN').substring(0, 3).toUpperCase()
        const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
        const newSku = `MP-${prefix}-${randomNum}`

        // Create master product
        const { data: masterProduct, error: insertError } = await supabase
            .from('master_products')
            .insert({
                sku: newSku,
                upc: customProduct.upc,
                name: customProduct.name,
                brand: customProduct.brand,
                description: customProduct.description,
                category: customProduct.category,
                subcategory: customProduct.subcategory,
                tags: customProduct.tags,
                specifications: customProduct.specifications,
                images: customProduct.images,
                thumbnail_url: customProduct.thumbnail_url,
                age_restriction: customProduct.age_restriction,
                slug: customProduct.slug,
                is_active: true,
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating master product:', insertError)
            throw insertError
        }

        // Update custom product as promoted
        await supabase
            .from('store_custom_products')
            .update({
                approval_status: 'promoted',
                promoted_to_master_id: masterProduct.id,
                promoted_at: new Date().toISOString(),
                reviewed_by: reviewerId,
            })
            .eq('id', productId)

        // Create inventory entry for the store
        await supabase
            .from('store_inventories')
            .insert({
                store_id: customProduct.store_id,
                product_id: masterProduct.id,
                price: customProduct.price,
                compare_at_price: customProduct.compare_at_price,
                cost: customProduct.cost,
                quantity: customProduct.quantity,
                low_stock_threshold: customProduct.low_stock_threshold,
                is_available: true,
                is_featured: customProduct.is_featured,
            })

        return masterProduct.id
    },

    // Get all master products
    async getAllMasterProducts(): Promise<MasterProduct[]> {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('master_products')
            .select('*')
            .order('name')

        if (error) {
            console.error('Error fetching master products:', error)
            throw error
        }

        return (data || []) as MasterProduct[]
    },

    // Create master product
    async createMasterProduct(product: Omit<MasterProduct, 'id' | 'created_at' | 'updated_at'>): Promise<MasterProduct> {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('master_products')
            .insert(product)
            .select()
            .single()

        if (error) {
            console.error('Error creating master product:', error)
            throw error
        }

        return data as MasterProduct
    },

    // Update master product
    async updateMasterProduct(id: string, updates: Partial<MasterProduct>): Promise<MasterProduct> {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
            .from('master_products')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating master product:', error)
            throw error
        }

        return data as MasterProduct
    },

    // Deactivate master product
    async deactivateMasterProduct(id: string): Promise<void> {
        const { error } = await getSupabaseClient()
            .from('master_products')
            .update({ is_active: false })
            .eq('id', id)

        if (error) {
            console.error('Error deactivating master product:', error)
            throw error
        }
    },
}
