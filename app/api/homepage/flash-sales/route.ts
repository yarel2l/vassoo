import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface FlashSaleProduct {
    id: string
    productId: string
    name: string
    image: string
    originalPrice: number
    salePrice: number
    discount: number
    stock: number
    storeId: string
    storeName: string
    endDate: string
    // Location info for fulfillment
    inventoryId: string
    locationId: string | null
    locationName: string | null
}

export async function GET() {
    try {
        const now = new Date().toISOString()

        // Get active flash sales from promotions table
        const { data: flashSales, error: promoError } = await supabase
            .from('promotions')
            .select(`
                id,
                name,
                config,
                start_date,
                end_date,
                store_id,
                eligible_product_ids,
                stores!inner(id, name)
            `)
            .eq('is_active', true)
            .lte('start_date', now)
            .or(`end_date.is.null,end_date.gte.${now}`)
            .limit(10)

        if (promoError) {
            console.error('Error fetching flash sales:', promoError)
        }

        // Filter only flash sales from config
        const activeFlashSales = (flashSales || []).filter(promo => {
            const config = promo.config as Record<string, unknown>
            return config?.is_flash_sale === true
        })

        // If we have flash sales with products, fetch product details
        const flashSaleProducts: FlashSaleProduct[] = []

        for (const sale of activeFlashSales) {
            const productIds = sale.eligible_product_ids || []
            if (productIds.length === 0) continue

            const config = sale.config as Record<string, unknown>
            const discountType = config?.discount_type as string
            const discountValue = Number(config?.discount_value) || 0

            // Fetch products with inventory and location
            const { data: inventories } = await supabase
                .from('store_inventories')
                .select(`
                    id,
                    price,
                    compare_at_price,
                    quantity,
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
                .eq('store_id', sale.store_id)
                .in('product_id', productIds)
                .eq('is_available', true)
                .gt('quantity', 0)
                .limit(4)

            for (const inv of inventories || []) {
                const product = inv.product as unknown as { id: string; name: string; thumbnail_url: string | null }
                const location = inv.location as unknown as { id: string; name: string } | null
                const originalPrice = inv.compare_at_price || inv.price
                let salePrice = inv.price

                // Apply flash sale discount
                if (discountType === 'percentage') {
                    salePrice = originalPrice * (1 - discountValue / 100)
                } else if (discountType === 'fixed') {
                    salePrice = originalPrice - discountValue
                }

                const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100)

                flashSaleProducts.push({
                    id: inv.id,
                    productId: product.id,
                    name: product.name,
                    image: product.thumbnail_url || '/placeholder.svg',
                    originalPrice,
                    salePrice: Math.max(0, salePrice),
                    discount,
                    stock: inv.quantity,
                    storeId: sale.store_id,
                    storeName: (sale.stores as unknown as { name: string })?.name || 'Store',
                    endDate: sale.end_date || '',
                    inventoryId: inv.id,
                    locationId: location?.id || inv.store_location_id || null,
                    locationName: location?.name || null
                })
            }
        }

        // If no flash sales from promotions, check for products with active discounts
        if (flashSaleProducts.length === 0) {
            const { data: discountedProducts } = await supabase
                .from('store_inventories')
                .select(`
                    id,
                    price,
                    compare_at_price,
                    quantity,
                    discount_type,
                    discount_value,
                    discount_end_date,
                    store_id,
                    store_location_id,
                    store:stores!inner(id, name),
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
                .eq('is_available', true)
                .gt('quantity', 0)
                .not('compare_at_price', 'is', null)
                .gt('compare_at_price', 0)
                .order('compare_at_price', { ascending: false })
                .limit(8)

            for (const inv of discountedProducts || []) {
                const product = inv.product as unknown as { id: string; name: string; thumbnail_url: string | null }
                const store = inv.store as unknown as { id: string; name: string }
                const location = inv.location as unknown as { id: string; name: string } | null

                if (inv.compare_at_price && inv.compare_at_price > inv.price) {
                    const discount = Math.round(((inv.compare_at_price - inv.price) / inv.compare_at_price) * 100)

                    flashSaleProducts.push({
                        id: inv.id,
                        productId: product.id,
                        name: product.name,
                        image: product.thumbnail_url || '/placeholder.svg',
                        originalPrice: inv.compare_at_price,
                        salePrice: inv.price,
                        discount,
                        stock: inv.quantity,
                        storeId: store.id,
                        storeName: store.name,
                        endDate: inv.discount_end_date || '',
                        inventoryId: inv.id,
                        locationId: location?.id || inv.store_location_id || null,
                        locationName: location?.name || null
                    })
                }
            }
        }

        // Calculate time remaining for the flash sale section
        const earliestEndDate = flashSaleProducts
            .filter(p => p.endDate)
            .map(p => new Date(p.endDate).getTime())
            .sort((a, b) => a - b)[0]

        const timeRemaining = earliestEndDate
            ? Math.max(0, Math.floor((earliestEndDate - Date.now()) / 1000))
            : 24 * 60 * 60 // Default 24 hours if no end date

        return NextResponse.json({
            products: flashSaleProducts.slice(0, 4),
            hasMore: flashSaleProducts.length > 4,
            timeRemaining,
            count: flashSaleProducts.length
        })
    } catch (error) {
        console.error('Error in flash sales API:', error)
        return NextResponse.json(
            { products: [], hasMore: false, timeRemaining: 0, count: 0 },
            { status: 200 }
        )
    }
}
