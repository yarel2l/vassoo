import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { subDays } from 'date-fns'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedHistory() {
    console.log('--- Seeding Order History for Analytics (Final Version) ---')

    const { data: stores } = await supabase.from('stores').select('id')
    const { data: profiles } = await supabase.from('profiles').select('id')

    if (!stores || stores.length === 0 || !profiles || profiles.length === 0) {
        console.error('Need stores and profiles to seed orders.')
        return
    }

    const { data: locations } = await supabase.from('store_locations').select('id, store_id')
    const locationMap = new Map()
    locations?.forEach(loc => {
        locationMap.set(loc.store_id, loc.id)
    })

    const orderStatuses = ['delivered', 'completed', 'cancelled', 'refunded']
    const orders = []

    for (let i = 0; i < 100; i++) {
        const daysAgo = Math.floor(Math.random() * 30)
        const date = subDays(new Date(), daysAgo)
        const store = stores[Math.floor(Math.random() * stores.length)]
        const customer = profiles[Math.floor(Math.random() * profiles.length)]

        const subtotal = Math.floor(Math.random() * 150) + 20
        const tax = subtotal * 0.08
        const platformFee = subtotal * 0.05
        const total = subtotal + tax

        const status = orderStatuses[Math.floor(Math.random() * 2)]
        const orderNumber = `VS-${Math.floor(Math.random() * 900000) + 100000}-${i}`

        orders.push({
            order_number: orderNumber,
            customer_id: customer.id,
            store_id: store.id,
            store_location_id: locationMap.get(store.id) || null,
            total: total,
            subtotal: subtotal,
            tax_amount: tax,
            platform_fee: platformFee,
            status: status,
            fulfillment_type: 'delivery',
            created_at: date.toISOString(),
            updated_at: date.toISOString()
        })
    }

    console.log(`Inserting ${orders.length} orders...`)
    const { error: orderErr } = await supabase.from('orders').insert(orders)
    if (orderErr) {
        console.error('Error seeding orders:', orderErr)
        return
    }

    console.log('--- Seeding Finished Successfully ---')
}

seedHistory()
