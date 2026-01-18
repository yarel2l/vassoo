import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getPlatformSEOSettings } from '@/lib/services/seo-settings'

interface ProductPageProps {
    params: Promise<{ id: string }>
}

interface ProductMetadata {
    id: string
    name: string
    brand: string | null
    category: string
    description: string | null
    thumbnail_url: string | null
    images: string[] | null
    slug: string | null
    lowestPrice?: number
}

/**
 * Fetches product data for metadata generation
 */
async function getProductForMetadata(idOrSlug: string): Promise<ProductMetadata | null> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        return null
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        // Check if it's a UUID or slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

        let query = supabase
            .from('master_products')
            .select(`
                id,
                name,
                brand,
                category,
                description,
                thumbnail_url,
                images,
                slug
            `)
            .eq('is_active', true)

        if (isUUID) {
            query = query.eq('id', idOrSlug)
        } else {
            query = query.eq('slug', idOrSlug)
        }

        const { data, error } = await query.single()

        if (error || !data) {
            return null
        }

        const productData = data as {
            id: string
            name: string
            brand: string | null
            category: string
            description: string | null
            thumbnail_url: string | null
            images: string[] | null
            slug: string | null
        }

        // Get price range from inventory
        const { data: priceData } = await supabase
            .from('store_inventories')
            .select('price')
            .eq('product_id', productData.id)
            .eq('is_available', true)
            .order('price', { ascending: true })
            .limit(1)

        const inventoryData = priceData as Array<{ price: number }> | null
        const lowestPrice = inventoryData?.[0]?.price

        return {
            ...productData,
            lowestPrice,
        }
    } catch (error) {
        console.error('Error fetching product for metadata:', error)
        return null
    }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
    const { id } = await params
    const [product, seoSettings] = await Promise.all([
        getProductForMetadata(id),
        getPlatformSEOSettings(),
    ])

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (!product) {
        return {
            title: `Product Not Found | ${seoSettings.platformName}`,
            description: `This product could not be found on ${seoSettings.platformName}.`,
        }
    }

    // Build title
    const title = product.brand 
        ? `${product.name} by ${product.brand} | ${seoSettings.platformName}`
        : `${product.name} | ${seoSettings.platformName}`

    // Build description
    let description = product.description || `${product.name} - Premium ${product.category}`
    if (product.brand) {
        description = `${product.brand} ${product.name} - ${description}`
    }
    if (product.lowestPrice) {
        description = `${description}. Starting at $${product.lowestPrice.toFixed(2)}.`
    }
    // Limit description length for SEO
    if (description.length > 160) {
        description = description.substring(0, 157) + '...'
    }

    // Get the best image URL
    const imageUrl = product.thumbnail_url || 
        (product.images && product.images.length > 0 ? product.images[0] : null)
    
    const productUrl = `${baseUrl}/product/${product.slug || product.id}`

    return {
        title,
        description,
        keywords: [
            product.name,
            product.brand,
            product.category,
            'premium spirits',
            'liquor store',
            'wine',
            seoSettings.platformName,
        ].filter(Boolean).join(', '),
        openGraph: {
            type: 'website',
            locale: 'en_US',
            url: productUrl,
            title,
            description,
            siteName: seoSettings.platformName,
            images: imageUrl ? [
                {
                    url: imageUrl,
                    width: 800,
                    height: 800,
                    alt: product.name,
                }
            ] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: imageUrl ? [imageUrl] : undefined,
        },
        alternates: {
            canonical: productUrl,
        },
    }
}

export default function ProductLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
