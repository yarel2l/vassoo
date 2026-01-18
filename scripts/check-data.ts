import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkData() {
    console.log('--- Checking Platform Admins ---')
    const { data: admins, error: adminError } = await supabase.from('platform_admins').select('*')
    if (adminError) console.error(adminError)
    else console.log('Admins:', admins)

    console.log('\n--- Checking Tenants ---')
    const { data: tenants, error: tenantError } = await supabase.from('tenants').select('*')
    if (tenantError) console.error(tenantError)
    else console.log('Tenants:', tenants)

    console.log('\n--- Checking Stores ---')
    const { data: stores, error: storeError } = await supabase.from('stores').select('id, name, slug')
    if (storeError) console.error(storeError)
    else console.log('Stores:', stores)

    console.log('\n--- Checking Store Locations ---')
    const { data: locations, error: locationError } = await supabase.from('store_locations').select('id, store_id, name, address_line1, city')
    if (locationError) console.error(locationError)
    else console.log('Store Locations:', locations)

    console.log('\n--- Checking Profiles ---')
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, full_name, email')
    if (profileError) console.error(profileError)
    else console.log('Profiles:', profiles)

    console.log('\n--- Checking Deliveries ---')
    const { data: deliveries, error: deliveryError } = await supabase.from('deliveries').select('id, store_id, status').limit(5)
    if (deliveryError) console.error(deliveryError)
    else console.log('Deliveries:', deliveries)
}

checkData()
