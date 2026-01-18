import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

export interface ActivePromotion {
    id: string
    code: string
    title: string
    description: string
    type: 'percentage' | 'fixed' | 'free_shipping'
    value: number
    minOrder: number | null
    storeId: string | null
    storeName: string | null
    endDate: string | null
    isGlobal: boolean
}

export async function GET() {
    try {
        // Check if Supabase is configured
        if (!supabase) {
            console.error('Promotions API: Supabase not configured - missing environment variables')
            return NextResponse.json({
                promotions: [],
                count: 0,
                error: 'Database not configured'
            })
        }

        const now = new Date().toISOString()

        // Fetch active coupons (both global and store-specific)
        const { data: coupons, error } = await supabase
            .from('coupons')
            .select(`
                id,
                code,
                description,
                type,
                value,
                minimum_order_amount,
                store_id,
                end_date,
                stores(id, name)
            `)
            .eq('is_active', true)
            .lte('start_date', now)
            .or(`end_date.is.null,end_date.gte.${now}`)
            .or(`usage_limit.is.null,usage_count.lt.usage_limit`)
            .order('value', { ascending: false })
            .limit(8)

        if (error) {
            console.error('Error fetching coupons:', error)
            return NextResponse.json({ promotions: [], count: 0 })
        }

        const promotions: ActivePromotion[] = (coupons || []).map(coupon => {
            const store = coupon.stores as unknown as { id: string; name: string } | null

            let title = ''
            let description = coupon.description || ''

            if (coupon.type === 'percentage') {
                title = `${coupon.value}% Off`
                if (!description) {
                    description = `Get ${coupon.value}% off your order`
                }
            } else if (coupon.type === 'fixed') {
                title = `$${coupon.value} Off`
                if (!description) {
                    description = `Save $${coupon.value} on your purchase`
                }
            } else if (coupon.type === 'free_shipping') {
                title = 'Free Shipping'
                if (!description) {
                    description = 'Free delivery on your order'
                }
            }

            if (coupon.minimum_order_amount) {
                description += ` (Min. $${coupon.minimum_order_amount})`
            }

            return {
                id: coupon.id,
                code: coupon.code,
                title,
                description,
                type: coupon.type as 'percentage' | 'fixed' | 'free_shipping',
                value: coupon.value,
                minOrder: coupon.minimum_order_amount,
                storeId: coupon.store_id,
                storeName: store?.name || null,
                endDate: coupon.end_date,
                isGlobal: !coupon.store_id
            }
        })

        // Prioritize global coupons first, then by value
        const sortedPromotions = promotions.sort((a, b) => {
            if (a.isGlobal && !b.isGlobal) return -1
            if (!a.isGlobal && b.isGlobal) return 1
            return b.value - a.value
        })

        return NextResponse.json({
            promotions: sortedPromotions.slice(0, 4),
            hasMore: sortedPromotions.length > 4,
            count: sortedPromotions.length
        })
    } catch (error) {
        console.error('Error in promotions API:', error)
        return NextResponse.json(
            { promotions: [], hasMore: false, count: 0 },
            { status: 200 }
        )
    }
}
