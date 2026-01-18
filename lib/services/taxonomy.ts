import { createClient } from '@/lib/supabase/client'

export interface ProductCategory {
    id: string
    name: string
    slug: string
    description: string | null
    image_url: string | null
    parent_id: string | null
    sort_order: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface ProductBrand {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    website_url: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface CreateCategoryInput {
    name: string
    description?: string
    image_url?: string
    parent_id?: string
    sort_order?: number
}

export interface CreateBrandInput {
    name: string
    description?: string
    logo_url?: string
    website_url?: string
}

// Generate slug from name
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
}

export const taxonomyService = {
    // ==================== CATEGORIES ====================

    async getCategories(activeOnly = true): Promise<ProductCategory[]> {
        const supabase = createClient()

        let query = supabase
            .from('product_categories')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true })

        if (activeOnly) {
            query = query.eq('is_active', true)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching categories:', error)
            throw error
        }

        return data || []
    },

    async getCategoryById(id: string): Promise<ProductCategory | null> {
        const supabase = createClient()

        const { data, error } = await supabase
            .from('product_categories')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching category:', error)
            return null
        }

        return data
    },

    async createCategory(input: CreateCategoryInput): Promise<ProductCategory> {
        const supabase = createClient()

        const slug = generateSlug(input.name)

        const { data, error } = await supabase
            .from('product_categories')
            .insert({
                name: input.name,
                slug,
                description: input.description || null,
                image_url: input.image_url || null,
                parent_id: input.parent_id || null,
                sort_order: input.sort_order || 0,
                is_active: true,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating category:', error)
            throw error
        }

        return data
    },

    async updateCategory(id: string, updates: Partial<CreateCategoryInput>): Promise<ProductCategory> {
        const supabase = createClient()

        const updateData: Record<string, unknown> = { ...updates }
        if (updates.name) {
            updateData.slug = generateSlug(updates.name)
        }

        const { data, error } = await supabase
            .from('product_categories')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating category:', error)
            throw error
        }

        return data
    },

    async toggleCategoryActive(id: string, isActive: boolean): Promise<void> {
        const supabase = createClient()

        const { error } = await supabase
            .from('product_categories')
            .update({ is_active: isActive })
            .eq('id', id)

        if (error) {
            console.error('Error toggling category:', error)
            throw error
        }
    },

    async deleteCategory(id: string): Promise<void> {
        const supabase = createClient()

        const { error } = await supabase
            .from('product_categories')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting category:', error)
            throw error
        }
    },

    // ==================== BRANDS ====================

    async getBrands(activeOnly = true): Promise<ProductBrand[]> {
        const supabase = createClient()

        let query = supabase
            .from('product_brands')
            .select('*')
            .order('name', { ascending: true })

        if (activeOnly) {
            query = query.eq('is_active', true)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching brands:', error)
            throw error
        }

        return data || []
    },

    async getBrandById(id: string): Promise<ProductBrand | null> {
        const supabase = createClient()

        const { data, error } = await supabase
            .from('product_brands')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching brand:', error)
            return null
        }

        return data
    },

    async createBrand(input: CreateBrandInput): Promise<ProductBrand> {
        const supabase = createClient()

        const slug = generateSlug(input.name)

        const { data, error } = await supabase
            .from('product_brands')
            .insert({
                name: input.name,
                slug,
                description: input.description || null,
                logo_url: input.logo_url || null,
                website_url: input.website_url || null,
                is_active: true,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating brand:', error)
            throw error
        }

        return data
    },

    async updateBrand(id: string, updates: Partial<CreateBrandInput>): Promise<ProductBrand> {
        const supabase = createClient()

        const updateData: Record<string, unknown> = { ...updates }
        if (updates.name) {
            updateData.slug = generateSlug(updates.name)
        }

        const { data, error } = await supabase
            .from('product_brands')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating brand:', error)
            throw error
        }

        return data
    },

    async toggleBrandActive(id: string, isActive: boolean): Promise<void> {
        const supabase = createClient()

        const { error } = await supabase
            .from('product_brands')
            .update({ is_active: isActive })
            .eq('id', id)

        if (error) {
            console.error('Error toggling brand:', error)
            throw error
        }
    },

    async deleteBrand(id: string): Promise<void> {
        const supabase = createClient()

        const { error } = await supabase
            .from('product_brands')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting brand:', error)
            throw error
        }
    },
}
