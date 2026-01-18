import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testOrderQuery() {
    console.log('--- Testing Orders Query (Same as OrdersProvider) ---')
    const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(id, name, logo_url),
          items:order_items(
            id,
            quantity,
            unit_price,
            subtotal,
            tax_amount,
            total,
            inventory:store_inventories(
              id,
              product:master_products(id, name, thumbnail_url)
            )
          ),
          deliveries(
            id,
            status,
            driver:delivery_drivers(
                id,
                phone,
                vehicle_type,
                vehicle_plate,
                profile:profiles(full_name, avatar_url, phone)
            )
          )
        `)
        .limit(1)

    if (error) {
        console.error('QUERY FAILED:', JSON.stringify(error, null, 2))
    } else {
        console.log('QUERY SUCCESSFUL, data found:', data?.length)
        if (data && data.length > 0) {
            console.log('Sample Data Item:', JSON.stringify(data[0], null, 2))
        }
    }
}

testOrderQuery()
