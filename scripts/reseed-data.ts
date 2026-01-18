import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function reseedData() {
    console.log('--- Reseeding Missing Store Data ---')

    // 1. Get Owner ID
    const ownerEmail = 'storeowner@vassoo.com'
    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', ownerEmail)
        .single()

    const ownerId = ownerProfile?.id || '3e4bbe35-b1d0-4984-85e8-83af4bc9e00a'

    // 2. Reseed Premium Spirits NYC Tenant
    const tenantSlug = 'premium-spirits-nyc'
    console.log(`Checking Tenant: ${tenantSlug}`)
    const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .upsert({
            name: 'Premium Spirits NYC',
            slug: tenantSlug,
            type: 'owner_store',
            status: 'active',
            email: 'contact@premiumspirits.com',
            phone: '+1 555-123-4567',
            onboarding_complete: true
        }, { onConflict: 'slug' })
        .select()
        .single()

    if (tenantErr) {
        console.error('Error reseeding tenant:', tenantErr)
        return
    }
    console.log('Tenant reseeded:', tenant.id)

    // 3. Reseed Premium Spirits NYC Store
    const { data: store, error: storeErr } = await supabase
        .from('stores')
        .upsert({
            tenant_id: tenant.id,
            name: 'Premium Spirits NYC',
            slug: tenantSlug,
            email: 'contact@premiumspirits.com',
            phone: '+1 555-123-4567',
            is_active: true,
            license_number: 'NY-LIQ-2024-001234',
            license_state: 'NY',
            license_expiry: '2025-12-31',
            license_verified: true,
            settings: {
                accept_pickup: true,
                accept_delivery: true,
                order_notifications: true,
                delivery_auto_assign: false,
                minimum_order_amount: 25,
                delivery_radius_miles: 10
            }
        }, { onConflict: 'slug' })
        .select()
        .single()

    if (storeErr) {
        console.error('Error reseeding store:', storeErr)
        return
    }
    console.log('Store reseeded:', store.id)

    // 4. Create Locations for BOTH stores
    const { data: allStores } = await supabase.from('stores').select('id, name')

    for (const s of (allStores || [])) {
        console.log(`Ensuring location for: ${s.name}`)

        const { data: existingLoc } = await supabase
            .from('store_locations')
            .select('id')
            .eq('store_id', s.id)

        if (!existingLoc || existingLoc.length === 0) {
            console.log(`No location found for ${s.name}, creating...`)
            const { error: locErr } = await supabase
                .from('store_locations')
                .insert({
                    store_id: s.id,
                    name: 'Main Store',
                    address_line1: s.name.includes('Premium') ? '123 Main Street' : '456 West Ave',
                    city: 'New York',
                    state: 'NY',
                    zip_code: '10001',
                    country: 'US',
                    is_primary: true,
                    is_active: true,
                    coordinates: s.name.includes('Premium') ? 'POINT(-73.9857 40.7484)' : 'POINT(-74.0060 40.7128)',
                    business_hours: {
                        monday: { open: "09:00", close: "21:00", is_open: true },
                        tuesday: { open: "09:00", close: "21:00", is_open: true },
                        wednesday: { open: "09:00", close: "21:00", is_open: true },
                        thursday: { open: "09:00", close: "21:00", is_open: true },
                        friday: { open: "09:00", close: "22:00", is_open: true },
                        saturday: { open: "10:00", close: "22:00", is_open: true },
                        sunday: { open: "12:00", close: "18:00", is_open: true }
                    }
                })

            if (locErr) console.error(`Error adding location for ${s.name}:`, locErr)
            else console.log(`Location added for ${s.name}`)
        } else {
            console.log(`Location already exists for ${s.name}`)
        }
    }

    // 5. Ensure tenant membership for owner
    console.log('Ensuring tenant membership...')
    await supabase.from('tenant_memberships').upsert({
        user_id: ownerId,
        tenant_id: tenant.id,
        role: 'owner',
        is_active: true,
        accepted_at: new Date().toISOString()
    }, { onConflict: 'user_id,tenant_id' })

    console.log('--- Reseed Finished ---')
}

reseedData()
