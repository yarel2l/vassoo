import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const PREDEFINED_PRODUCTS = [
    {
        name: 'Johnnie Walker Black Label',
        sku: 'JW-BL-750',
        brand: 'Johnnie Walker',
        category: 'Spirits',
        subcategory: 'Whisky',
        description: 'A classic 12-year-old blended Scotch whisky.',
        specifications: { volume: '750ml', alcohol_percentage: 40, country: 'Scotland', type: 'Blended Scotch' },
        age_restriction: 21,
        thumbnail_url: 'https://images.unsplash.com/photo-1527281480458-c882f748b1d2?auto=format&fit=crop&q=80&w=200',
        is_active: true
    },
    {
        name: 'Grey Goose Vodka',
        sku: 'GG-V-750',
        brand: 'Grey Goose',
        category: 'Spirits',
        subcategory: 'Vodka',
        description: 'Premium French vodka.',
        specifications: { volume: '750ml', alcohol_percentage: 40, country: 'France', type: 'Vodka' },
        age_restriction: 21,
        thumbnail_url: 'https://images.unsplash.com/photo-1592892111425-15e04305f961?auto=format&fit=crop&q=80&w=200',
        is_active: true
    },
    {
        name: 'Casamigos Blanco Tequila',
        sku: 'CB-T-750',
        brand: 'Casamigos',
        category: 'Spirits',
        subcategory: 'Tequila',
        description: 'Small batch, ultra premium tequila.',
        specifications: { volume: '750ml', alcohol_percentage: 40, country: 'Mexico', type: 'Blanco Tequila' },
        age_restriction: 21,
        thumbnail_url: 'https://images.unsplash.com/photo-1516535750143-ef3fd62329af?auto=format&fit=crop&q=80&w=200',
        is_active: true
    },
    {
        name: 'Moët & Chandon Imperial',
        sku: 'MC-BR-750',
        brand: 'Moët & Chandon',
        category: 'Wine',
        subcategory: 'Champagne',
        description: 'The world\'s most loved champagne.',
        specifications: { volume: '750ml', alcohol_percentage: 12, country: 'France', type: 'Brut Champagne' },
        age_restriction: 21,
        thumbnail_url: 'https://images.unsplash.com/photo-1594460750222-29337f5789ee?auto=format&fit=crop&q=80&w=200',
        is_active: true
    },
    {
        name: 'Stella Artois Pack',
        sku: 'SA-B-P6',
        brand: 'Stella Artois',
        category: 'Beer',
        subcategory: 'Lager',
        description: 'European pale lager, 6 pack bottles.',
        specifications: { volume: '6 x 330ml', alcohol_percentage: 5, country: 'Belgium', type: 'Pilsner Lager' },
        age_restriction: 21,
        thumbnail_url: 'https://images.unsplash.com/photo-1532634896-26909d0d4b89?auto=format&fit=crop&q=80&w=200',
        is_active: true
    }
]

async function seedMasterCatalog() {
    console.log('--- Seeding Master Catalog ---')

    const productsWithSlugs = PREDEFINED_PRODUCTS.map(p => ({
        ...p,
        slug: p.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Math.random().toString(36).substring(2, 5),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
        .from('master_products')
        .upsert(productsWithSlugs, { onConflict: 'sku' })

    if (error) {
        console.error('Error seeding Master Catalog:', error)
    } else {
        console.log(`Successfully seeded ${PREDEFINED_PRODUCTS.length} products.`)
    }
}

seedMasterCatalog()
