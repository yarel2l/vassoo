#!/usr/bin/env node
/**
 * Script para ejecutar seed data en Supabase
 * 
 * Uso: node scripts/run-seed.js
 * 
 * Requiere las variables de entorno:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function runSeed() {
    console.log('🌱 Starting seed data script...\n')

    // 1. Check if admin user exists
    console.log('📧 Checking for admin@vassoo.com...')
    const { data: adminUser } = await supabase.auth.admin.listUsers()
    const admin = adminUser?.users?.find(u => u.email === 'admin@vassoo.com')

    if (!admin) {
        console.error('❌ Admin user not found!')
        console.error('   Please create user admin@vassoo.com in Supabase Auth Dashboard first.')
        process.exit(1)
    }
    console.log('✅ Admin user found:', admin.id)

    // 2. Update admin profile
    console.log('\n👤 Updating admin profile...')
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            full_name: 'Platform Admin',
            phone: '+1 555-000-0001',
            age_verified: true,
            age_verified_at: new Date().toISOString(),
            birth_date: '1990-01-01'
        })
        .eq('id', admin.id)

    if (profileError) {
        console.error('⚠️  Profile update error:', profileError.message)
    } else {
        console.log('✅ Admin profile updated')
    }

    // 3. Make them platform admin
    console.log('\n🛡️  Setting up platform admin role...')
    const { error: adminRoleError } = await supabase
        .from('platform_admins')
        .upsert({
            user_id: admin.id,
            role: 'super_admin',
            permissions: ['*'],
            is_active: true
        }, { onConflict: 'user_id' })

    if (adminRoleError) {
        console.error('⚠️  Platform admin error:', adminRoleError.message)
    } else {
        console.log('✅ Platform admin role assigned')
    }

    // 4. Check/Create store owner user
    console.log('\n📧 Checking for storeowner@vassoo.com...')
    const storeOwner = adminUser?.users?.find(u => u.email === 'storeowner@vassoo.com')

    if (!storeOwner) {
        console.log('⚠️  Store owner user not found. Creating...')
        const { data: newOwner, error: createError } = await supabase.auth.admin.createUser({
            email: 'storeowner@vassoo.com',
            password: 'Store123!@#',
            email_confirm: true,
            user_metadata: { full_name: 'John Store Owner' }
        })

        if (createError) {
            console.error('❌ Failed to create store owner:', createError.message)
            process.exit(1)
        }
        console.log('✅ Store owner created:', newOwner.user.id)

        // Wait a bit for profile trigger
        await new Promise(r => setTimeout(r, 2000))

        // Update profile
        await supabase
            .from('profiles')
            .update({
                full_name: 'John Store Owner',
                phone: '+1 555-123-4567',
                age_verified: true,
                age_verified_at: new Date().toISOString(),
                birth_date: '1985-05-15'
            })
            .eq('id', newOwner.user.id)

        await createDemoStore(newOwner.user.id)
    } else {
        console.log('✅ Store owner found:', storeOwner.id)

        // Check if store exists
        const { data: existingTenant } = await supabase
            .from('tenant_memberships')
            .select('tenant_id')
            .eq('user_id', storeOwner.id)
            .maybeSingle()

        if (!existingTenant) {
            await createDemoStore(storeOwner.id)
        } else {
            console.log('✅ Demo store already exists')
        }
    }

    console.log('\n🎉 Seed data completed successfully!')
    console.log('\n📋 Test accounts:')
    console.log('   Admin: admin@vassoo.com / Admin123!@#')
    console.log('   Store Owner: storeowner@vassoo.com / Store123!@#')
}

async function createDemoStore(ownerId) {
    console.log('\n🏪 Creating demo tenant and store...')

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
            name: 'Premium Spirits NYC',
            slug: 'premium-spirits-nyc',
            type: 'owner_store',
            email: 'contact@premiumspirits.com',
            phone: '+1 555-123-4567',
            status: 'active',
            stripe_account_id: 'acct_demo_123456',
            stripe_account_status: 'active',
            stripe_onboarding_complete: true
        })
        .select()
        .single()

    if (tenantError) {
        console.error('❌ Tenant creation error:', tenantError.message)
        return
    }
    console.log('✅ Tenant created:', tenant.id)

    // Create membership
    await supabase
        .from('tenant_memberships')
        .insert({
            user_id: ownerId,
            tenant_id: tenant.id,
            role: 'owner',
            is_active: true,
            accepted_at: new Date().toISOString()
        })
    console.log('✅ Membership created')

    // Create store
    const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
            tenant_id: tenant.id,
            name: 'Premium Spirits NYC',
            slug: 'premium-spirits-nyc',
            description: "New York's premier destination for fine spirits, wines, and craft beers.",
            email: 'contact@premiumspirits.com',
            phone: '+1 555-123-4567',
            is_active: true,
            license_number: 'NY-LIQ-2024-001234',
            license_state: 'NY',
            license_expiry: '2025-12-31',
            minimum_order_amount: 25.00,
            delivery_fee: 4.99,
            delivery_radius_miles: 10.0,
            average_rating: 4.8,
            total_reviews: 234
        })
        .select()
        .single()

    if (storeError) {
        console.error('❌ Store creation error:', storeError.message)
        return
    }
    console.log('✅ Store created:', store.id)

    // Create location
    const { data: location } = await supabase
        .from('store_locations')
        .insert({
            store_id: store.id,
            name: 'Main Store',
            address_line1: '123 Main Street',
            city: 'New York',
            state: 'NY',
            postal_code: '10001',
            country: 'US',
            phone: '+1 555-123-4567',
            is_primary: true,
            is_active: true,
            operating_hours: {
                monday: { open: '09:00', close: '21:00' },
                tuesday: { open: '09:00', close: '21:00' },
                wednesday: { open: '09:00', close: '21:00' },
                thursday: { open: '09:00', close: '21:00' },
                friday: { open: '09:00', close: '22:00' },
                saturday: { open: '10:00', close: '22:00' },
                sunday: { open: '11:00', close: '20:00' }
            }
        })
        .select()
        .single()
    console.log('✅ Location created')

    // Create products
    console.log('\n📦 Creating demo products...')
    const products = [
        { sku: 'JW-BLUE-750', name: 'Johnnie Walker Blue Label', brand: 'Johnnie Walker', category: 'Whisky', price: 189.99 },
        { sku: 'MC-BRUT-750', name: 'Moët & Chandon Brut Impérial', brand: 'Moët & Chandon', category: 'Champagne', price: 54.99 },
        { sku: 'HY-XO-750', name: 'Hennessy XO', brand: 'Hennessy', category: 'Cognac', price: 199.99 },
        { sku: 'GG-VDK-750', name: 'Grey Goose Vodka', brand: 'Grey Goose', category: 'Vodka', price: 34.99 },
        { sku: 'DJ-1942-750', name: 'Don Julio 1942', brand: 'Don Julio', category: 'Tequila', price: 169.99 },
        { sku: 'PT-SLV-750', name: 'Patrón Silver', brand: 'Patrón', category: 'Tequila', price: 49.99 },
        { sku: 'MC-18-750', name: 'The Macallan 18 Year', brand: 'The Macallan', category: 'Whisky', price: 299.99 },
        { sku: 'RM-XO-750', name: 'Rémy Martin XO', brand: 'Rémy Martin', category: 'Cognac', price: 179.99 },
        { sku: 'BV-RSRV-750', name: 'Beaulieu Vineyard Reserve Cabernet', brand: 'BV', category: 'Wine', price: 44.99 },
        { sku: 'VP-CLQT-750', name: 'Veuve Clicquot Yellow Label', brand: 'Veuve Clicquot', category: 'Champagne', price: 59.99 },
    ]

    for (const prod of products) {
        // Create master product
        const { data: masterProd } = await supabase
            .from('master_products')
            .upsert({
                sku: prod.sku,
                name: prod.name,
                brand: prod.brand,
                category: prod.category,
                subcategory: 'Premium',
                description: `Premium ${prod.category.toLowerCase()} from ${prod.brand}`,
                age_restriction: 21,
                is_active: true
            }, { onConflict: 'sku' })
            .select()
            .single()

        if (masterProd && location) {
            // Create inventory
            await supabase
                .from('store_inventories')
                .upsert({
                    store_id: store.id,
                    product_id: masterProd.id,
                    location_id: location.id,
                    price: prod.price,
                    cost_price: prod.price * 0.7,
                    quantity: Math.floor(Math.random() * 50) + 10,
                    low_stock_threshold: 10,
                    is_available: true
                }, { onConflict: 'store_id,product_id,location_id' })
        }
    }
    console.log('✅ Products and inventory created')
}

runSeed().catch(console.error)
