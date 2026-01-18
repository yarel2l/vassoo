import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface MixMatchDeal {
    id: string
    title: string
    description: string
    discount: number
    discountType: 'percentage' | 'fixed'
    minItems: number
    maxItems: number
    storeId: string
    storeName: string
    category: string | null
    products: Array<{
        id: string
        name: string
        price: number
        image: string
        // Location info for fulfillment
        inventoryId: string
        locationId: string | null
        locationName: string | null
    }>
}

export async function GET() {
    try {
        const now = new Date().toISOString()

        // Fetch mix & match promotions
        const { data: promotions, error } = await supabase
            .from('promotions')
            .select(`
                id,
                name,
                description,
                config,
                eligible_product_ids,
                eligible_categories,
                minimum_quantity,
                store_id,
                stores!inner(id, name)
            `)
            .eq('is_active', true)
            .in('type', ['mix_match', 'bundle'])
            .lte('start_date', now)
            .or(`end_date.is.null,end_date.gte.${now}`)
            .limit(6)

        if (error) {
            console.error('Error fetching mix & match deals:', error)
            return NextResponse.json({ deals: [], count: 0 })
        }

        const deals: MixMatchDeal[] = []

        for (const promo of promotions || []) {
            const config = promo.config as Record<string, unknown>
            const store = promo.stores as unknown as { id: string; name: string }

            const discountType = (config?.discount_type as string) === 'fixed' ? 'fixed' : 'percentage'
            const discountValue = Number(config?.discount_value) || Number(config?.discount_percentage) || 0
            const minItems = promo.minimum_quantity || Number(config?.min_items) || 2
            const maxItems = Number(config?.max_items) || minItems + 3

            // Fetch sample products for this deal
            let products: Array<{ id: string; name: string; price: number; image: string; inventoryId: string; locationId: string | null; locationName: string | null }> = []

            if (promo.eligible_product_ids && promo.eligible_product_ids.length > 0) {
                const { data: productData } = await supabase
                    .from('store_inventories')
                    .select(`
                        id,
                        price,
                        store_location_id,
                        product:master_products!inner(
                            id,
                            name,
                            thumbnail_url
                        ),
                        location:store_locations(
                            id,
                            name
                        )
                    `)
                    .eq('store_id', promo.store_id)
                    .in('product_id', promo.eligible_product_ids)
                    .eq('is_available', true)
                    .gt('quantity', 0)
                    .limit(3)

                products = (productData || []).map(inv => {
                    const product = inv.product as unknown as { id: string; name: string; thumbnail_url: string | null }
                    const location = inv.location as unknown as { id: string; name: string } | null
                    return {
                        id: product.id,
                        name: product.name,
                        price: inv.price,
                        image: product.thumbnail_url || '/placeholder.svg',
                        inventoryId: inv.id,
                        locationId: location?.id || inv.store_location_id || null,
                        locationName: location?.name || null
                    }
                })
            } else if (promo.eligible_categories && promo.eligible_categories.length > 0) {
                // Fetch products by category
                const { data: productData } = await supabase
                    .from('store_inventories')
                    .select(`
                        id,
                        price,
                        store_location_id,
                        product:master_products!inner(
                            id,
                            name,
                            thumbnail_url,
                            category
                        ),
                        location:store_locations(
                            id,
                            name
                        )
                    `)
                    .eq('store_id', promo.store_id)
                    .eq('is_available', true)
                    .gt('quantity', 0)
                    .limit(10)

                // Filter by category
                const categoryProducts = (productData || []).filter(inv => {
                    const product = inv.product as unknown as { category: string }
                    return promo.eligible_categories?.includes(product.category)
                })

                products = categoryProducts.slice(0, 3).map(inv => {
                    const product = inv.product as unknown as { id: string; name: string; thumbnail_url: string | null }
                    const location = inv.location as unknown as { id: string; name: string } | null
                    return {
                        id: product.id,
                        name: product.name,
                        price: inv.price,
                        image: product.thumbnail_url || '/placeholder.svg',
                        inventoryId: inv.id,
                        locationId: location?.id || inv.store_location_id || null,
                        locationName: location?.name || null
                    }
                })
            }

            // Only include deals that have products
            if (products.length >= 2) {
                deals.push({
                    id: promo.id,
                    title: promo.name,
                    description: promo.description || `Select ${minItems} items and save!`,
                    discount: discountValue,
                    discountType,
                    minItems,
                    maxItems,
                    storeId: promo.store_id,
                    storeName: store.name,
                    category: promo.eligible_categories?.[0] || null,
                    products
                })
            }
        }

        return NextResponse.json({
            deals: deals.slice(0, 3),
            hasMore: deals.length > 3,
            count: deals.length
        })
    } catch (error) {
        console.error('Error in mix & match API:', error)
        return NextResponse.json(
            { deals: [], hasMore: false, count: 0 },
            { status: 200 }
        )
    }
}
