#!/usr/bin/env npx ts-node
/**
 * VASSOO - Script de Setup Completo
 *
 * Este script configura la base de datos completa para el proyecto VASSOO.
 * Ejecuta todas las operaciones necesarias para tener un ambiente funcional.
 *
 * Uso: npx ts-node scripts/setup-complete.ts
 *
 * Prerequisitos:
 * - Supabase proyecto configurado
 * - Migraciones ejecutadas (npx supabase db push)
 * - Variables de entorno configuradas en .env.local
 *
 * Variables requeridas:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables de entorno faltantes:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
    admin: {
        email: 'admin@vassoo.com',
        password: 'Admin123!@#',
        fullName: 'Platform Admin'
    },
    storeOwner: {
        email: 'storeowner@vassoo.com',
        password: 'Store123!@#',
        fullName: 'John Store Owner'
    },
    deliveryOwner: {
        email: 'delivery@vassoo.com',
        password: 'Delivery123!@#',
        fullName: 'Mike Delivery'
    },
    demoStore: {
        name: 'Premium Spirits NYC',
        slug: 'premium-spirits-nyc',
        email: 'contact@premiumspirits.com',
        phone: '+1 555-123-4567'
    },
    demoDelivery: {
        name: 'Quick Spirits Delivery',
        slug: 'quick-spirits-delivery',
        email: 'dispatch@quickspirits.com',
        phone: '+1 555-987-6543'
    }
}

// ============================================================================
// UTILIDADES
// ============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' }
    console.log(`${icons[type]}  ${message}`)
}

function section(title: string) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📋 ${title}`)
    console.log('='.repeat(60))
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// FUNCIONES DE SETUP
// ============================================================================

async function createOrGetUser(email: string, password: string, fullName: string) {
    // Buscar usuario existente
    const { data: users } = await supabase.auth.admin.listUsers()
    const existingUser = users?.users?.find(u => u.email === email)

    if (existingUser) {
        log(`Usuario existente: ${email}`, 'info')
        return existingUser
    }

    // Crear nuevo usuario
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
    })

    if (error) {
        log(`Error creando usuario ${email}: ${error.message}`, 'error')
        return null
    }

    log(`Usuario creado: ${email}`, 'success')
    await delay(1000) // Esperar trigger de profile

    return data.user
}

async function updateProfile(userId: string, data: Record<string, unknown>) {
    const { error } = await supabase
        .from('profiles')
        .update({
            ...data,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId)

    if (error) {
        log(`Error actualizando perfil: ${error.message}`, 'error')
        return false
    }
    return true
}

async function setupPlatformAdmin(userId: string) {
    const { error } = await supabase
        .from('platform_admins')
        .upsert({
            user_id: userId,
            role: 'super_admin',
            permissions: ['*'],
            is_active: true
        }, { onConflict: 'user_id' })

    if (error) {
        log(`Error configurando admin: ${error.message}`, 'error')
        return false
    }
    return true
}

async function createTenant(data: {
    name: string
    slug: string
    type: 'owner_store' | 'delivery_company'
    email: string
    phone: string
}) {
    const { data: tenant, error } = await supabase
        .from('tenants')
        .upsert({
            name: data.name,
            slug: data.slug,
            type: data.type,
            status: 'active',
            email: data.email,
            phone: data.phone,
            onboarding_complete: true,
            stripe_account_status: 'active', // Demo - en prod sería 'pending'
        }, { onConflict: 'slug' })
        .select()
        .single()

    if (error) {
        log(`Error creando tenant ${data.slug}: ${error.message}`, 'error')
        return null
    }

    return tenant
}

async function createTenantMembership(userId: string, tenantId: string, role: string = 'owner') {
    const { error } = await supabase
        .from('tenant_memberships')
        .upsert({
            user_id: userId,
            tenant_id: tenantId,
            role,
            is_active: true,
            accepted_at: new Date().toISOString()
        }, { onConflict: 'user_id,tenant_id' })

    if (error) {
        log(`Error creando membership: ${error.message}`, 'error')
        return false
    }
    return true
}

async function createStore(tenantId: string, data: { name: string; slug: string; email: string; phone: string }) {
    const { data: store, error } = await supabase
        .from('stores')
        .upsert({
            tenant_id: tenantId,
            name: data.name,
            slug: data.slug,
            email: data.email,
            phone: data.phone,
            description: "New York's premier destination for fine spirits, wines, and craft beers.",
            is_active: true,
            license_number: 'NY-LIQ-2024-001234',
            license_state: 'NY',
            license_expiry: '2026-12-31',
            license_verified: true,
            average_rating: 4.8,
            total_reviews: 234,
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

    if (error) {
        log(`Error creando tienda: ${error.message}`, 'error')
        return null
    }

    return store
}

async function createStoreLocation(storeId: string) {
    const { data: location, error } = await supabase
        .from('store_locations')
        .insert({
            store_id: storeId,
            name: 'Main Store',
            address_line1: '123 Main Street',
            city: 'New York',
            county: 'New York County',
            state: 'NY',
            zip_code: '10001',
            country: 'US',
            coordinates: 'POINT(-73.9857 40.7484)',
            coverage_radius_miles: 10,
            is_primary: true,
            is_active: true,
            is_pickup_available: true,
            is_delivery_available: true,
            timezone: 'America/New_York',
            business_hours: {
                monday: { open: '09:00', close: '21:00', is_open: true },
                tuesday: { open: '09:00', close: '21:00', is_open: true },
                wednesday: { open: '09:00', close: '21:00', is_open: true },
                thursday: { open: '09:00', close: '21:00', is_open: true },
                friday: { open: '09:00', close: '22:00', is_open: true },
                saturday: { open: '10:00', close: '22:00', is_open: true },
                sunday: { open: '12:00', close: '18:00', is_open: true }
            }
        })
        .select()
        .single()

    if (error && !error.message.includes('duplicate')) {
        log(`Error creando ubicación: ${error.message}`, 'error')
        return null
    }

    return location
}

async function createDeliveryCompany(tenantId: string, data: { name: string; slug: string; email: string; phone: string }) {
    const { data: company, error } = await supabase
        .from('delivery_companies')
        .upsert({
            tenant_id: tenantId,
            name: data.name,
            slug: data.slug,
            email: data.email,
            phone: data.phone,
            description: 'Fast and reliable alcohol delivery in NYC metro area.',
            is_active: true,
            average_rating: 4.7,
            total_deliveries: 1250,
            settings: {
                auto_assign: true,
                max_concurrent_deliveries: 5,
                base_delivery_fee: 4.99,
                per_mile_fee: 0.50
            },
            operating_hours: {
                monday: { open: '10:00', close: '22:00', is_open: true },
                tuesday: { open: '10:00', close: '22:00', is_open: true },
                wednesday: { open: '10:00', close: '22:00', is_open: true },
                thursday: { open: '10:00', close: '22:00', is_open: true },
                friday: { open: '10:00', close: '23:00', is_open: true },
                saturday: { open: '11:00', close: '23:00', is_open: true },
                sunday: { open: '12:00', close: '21:00', is_open: true }
            }
        }, { onConflict: 'slug' })
        .select()
        .single()

    if (error) {
        log(`Error creando empresa de delivery: ${error.message}`, 'error')
        return null
    }

    return company
}

async function createMasterProducts() {
    const products = [
        { sku: 'JW-BLUE-750', name: 'Johnnie Walker Blue Label', brand: 'Johnnie Walker', category: 'Whisky', subcategory: 'Scotch', price: 189.99 },
        { sku: 'MC-BRUT-750', name: 'Moët & Chandon Brut Impérial', brand: 'Moët & Chandon', category: 'Champagne', subcategory: 'Brut', price: 54.99 },
        { sku: 'HY-XO-750', name: 'Hennessy XO', brand: 'Hennessy', category: 'Cognac', subcategory: 'XO', price: 199.99 },
        { sku: 'GG-VDK-750', name: 'Grey Goose Vodka', brand: 'Grey Goose', category: 'Vodka', subcategory: 'French', price: 34.99 },
        { sku: 'DJ-1942-750', name: 'Don Julio 1942', brand: 'Don Julio', category: 'Tequila', subcategory: 'Añejo', price: 169.99 },
        { sku: 'PT-SLV-750', name: 'Patrón Silver', brand: 'Patrón', category: 'Tequila', subcategory: 'Blanco', price: 49.99 },
        { sku: 'MC-18-750', name: 'The Macallan 18 Year', brand: 'The Macallan', category: 'Whisky', subcategory: 'Single Malt', price: 299.99 },
        { sku: 'RM-XO-750', name: 'Rémy Martin XO', brand: 'Rémy Martin', category: 'Cognac', subcategory: 'XO', price: 179.99 },
        { sku: 'BV-RSRV-750', name: 'Beaulieu Vineyard Reserve Cabernet', brand: 'BV', category: 'Wine', subcategory: 'Red', price: 44.99 },
        { sku: 'VP-CLQT-750', name: 'Veuve Clicquot Yellow Label', brand: 'Veuve Clicquot', category: 'Champagne', subcategory: 'Brut', price: 59.99 },
        { sku: 'JD-SNGL-750', name: 'Jack Daniels Single Barrel', brand: 'Jack Daniels', category: 'Whisky', subcategory: 'Tennessee', price: 54.99 },
        { sku: 'BC-WH-750', name: 'Bacardi White Rum', brand: 'Bacardi', category: 'Rum', subcategory: 'White', price: 19.99 },
        { sku: 'TQ-1800-750', name: '1800 Reposado', brand: '1800', category: 'Tequila', subcategory: 'Reposado', price: 34.99 },
        { sku: 'AB-VDK-750', name: 'Absolut Vodka', brand: 'Absolut', category: 'Vodka', subcategory: 'Swedish', price: 24.99 },
        { sku: 'BM-GN-750', name: 'Bombay Sapphire Gin', brand: 'Bombay', category: 'Gin', subcategory: 'London Dry', price: 29.99 },
    ]

    const createdProducts = []

    for (const prod of products) {
        const { data, error } = await supabase
            .from('master_products')
            .upsert({
                sku: prod.sku,
                name: prod.name,
                brand: prod.brand,
                category: prod.category,
                subcategory: prod.subcategory,
                description: `Premium ${prod.category.toLowerCase()} from ${prod.brand}. 750ml bottle.`,
                specifications: {
                    volume: '750ml',
                    abv: prod.category === 'Wine' ? '13.5%' : '40%',
                    country: 'USA'
                },
                age_restriction: 21,
                is_active: true,
                slug: prod.sku.toLowerCase()
            }, { onConflict: 'sku' })
            .select()
            .single()

        if (!error && data) {
            createdProducts.push({ ...data, defaultPrice: prod.price })
        }
    }

    return createdProducts
}

async function createInventory(storeId: string, locationId: string, products: Array<{ id: string; defaultPrice: number }>) {
    for (const prod of products) {
        await supabase
            .from('store_inventories')
            .upsert({
                store_id: storeId,
                store_location_id: locationId,
                product_id: prod.id,
                price: prod.defaultPrice,
                cost: prod.defaultPrice * 0.65,
                quantity: Math.floor(Math.random() * 50) + 10,
                low_stock_threshold: 5,
                is_available: true,
                is_featured: Math.random() > 0.7
            }, { onConflict: 'store_id,store_location_id,product_id' })
    }
}

async function setupJurisdictions() {
    // Verificar si ya existen
    const { count } = await supabase
        .from('us_states')
        .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
        log('Jurisdicciones ya configuradas', 'info')
        return
    }

    // Crear estado de New York
    const { data: state, error: stateError } = await supabase
        .from('us_states')
        .insert({
            fips_code: '36',
            usps_code: 'NY',
            name: 'New York',
            alcohol_sale_allowed: true,
            min_drinking_age: 21,
            requires_state_license: true,
            timezone: 'America/New_York',
            is_active: true
        })
        .select()
        .single()

    if (stateError) {
        log(`Error creando estado: ${stateError.message}`, 'error')
        return
    }

    // Crear condado
    const { data: county } = await supabase
        .from('us_counties')
        .insert({
            state_id: state.id,
            fips_code: '36061',
            name: 'New York County',
            is_active: true
        })
        .select()
        .single()

    if (county) {
        // Crear ciudad
        await supabase
            .from('us_cities')
            .insert({
                county_id: county.id,
                state_id: state.id,
                name: 'New York City',
                population: 8336817,
                is_active: true
            })
    }

    log('Jurisdicciones creadas', 'success')
}

async function setupTaxRates(stateId: string) {
    // Verificar si ya existen
    const { count } = await supabase
        .from('tax_rates')
        .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
        log('Tasas de impuestos ya configuradas', 'info')
        return
    }

    await supabase
        .from('tax_rates')
        .insert([
            {
                scope: 'state',
                state_id: stateId,
                name: 'NY State Sales Tax',
                rate: 0.04,
                tax_type: 'sales',
                applies_to: 'all',
                effective_date: '2024-01-01',
                is_active: true
            },
            {
                scope: 'state',
                state_id: stateId,
                name: 'NY Alcohol Excise Tax',
                rate: 0.08,
                tax_type: 'excise',
                applies_to: 'alcohol',
                categories: ['Whisky', 'Vodka', 'Rum', 'Gin', 'Tequila', 'Cognac'],
                effective_date: '2024-01-01',
                is_active: true
            }
        ])

    log('Tasas de impuestos creadas', 'success')
}

async function setupPlatformFees() {
    // Verificar si ya existen
    const { count } = await supabase
        .from('platform_fees')
        .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
        log('Fees de plataforma ya configurados', 'info')
        return
    }

    await supabase
        .from('platform_fees')
        .insert([
            {
                scope: 'global',
                name: 'Marketplace Commission',
                fee_type: 'commission',
                calculation_type: 'percentage',
                value: 0.10,
                effective_date: '2024-01-01',
                is_active: true
            },
            {
                scope: 'global',
                name: 'Payment Processing Fee',
                fee_type: 'payment_processing',
                calculation_type: 'percentage',
                value: 0.029,
                effective_date: '2024-01-01',
                is_active: true
            },
            {
                scope: 'global',
                name: 'Delivery Platform Fee',
                fee_type: 'delivery',
                calculation_type: 'percentage',
                value: 0.05,
                effective_date: '2024-01-01',
                is_active: true
            }
        ])

    log('Fees de plataforma creados', 'success')
}

async function setupPlatformSettings() {
    const settings = [
        { key: 'platform_name', value: 'Vassoo', category: 'general', is_public: true },
        { key: 'platform_tagline', value: 'Premium Spirits Marketplace', category: 'general', is_public: true },
        { key: 'support_email', value: 'support@vassoo.com', category: 'support', is_public: true },
        { key: 'support_phone', value: '+1 555-VASSOO', category: 'support', is_public: true },
        { key: 'min_order_amount', value: 15.00, category: 'orders', is_public: true },
        { key: 'max_delivery_distance_miles', value: 25, category: 'delivery', is_public: false },
        { key: 'age_verification_required', value: true, category: 'compliance', is_public: true },
        { key: 'min_age_for_alcohol', value: 21, category: 'compliance', is_public: true },
        { key: 'default_currency', value: 'USD', category: 'payments', is_public: true },
        { key: 'payment_methods_enabled', value: ['card', 'apple_pay', 'google_pay'], category: 'payments', is_public: true },
    ]

    for (const setting of settings) {
        await supabase
            .from('platform_settings')
            .upsert({
                key: setting.key,
                value: setting.value,
                category: setting.category,
                is_public: setting.is_public,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })
    }

    log('Configuración de plataforma actualizada', 'success')
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
    console.log('\n')
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║           VASSOO - Setup Completo de Base de Datos         ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    try {
        // ----------------------------------------------------------------
        section('1. CONFIGURACIÓN DE USUARIOS')
        // ----------------------------------------------------------------

        // Admin
        const adminUser = await createOrGetUser(
            CONFIG.admin.email,
            CONFIG.admin.password,
            CONFIG.admin.fullName
        )

        if (adminUser) {
            await updateProfile(adminUser.id, {
                full_name: CONFIG.admin.fullName,
                phone: '+1 555-000-0001',
                age_verified: true,
                age_verified_at: new Date().toISOString(),
                birth_date: '1990-01-01'
            })

            const adminSetup = await setupPlatformAdmin(adminUser.id)
            if (adminSetup) {
                log(`Platform Admin configurado: ${CONFIG.admin.email}`, 'success')
            }
        }

        // Store Owner
        const storeOwnerUser = await createOrGetUser(
            CONFIG.storeOwner.email,
            CONFIG.storeOwner.password,
            CONFIG.storeOwner.fullName
        )

        if (storeOwnerUser) {
            await updateProfile(storeOwnerUser.id, {
                full_name: CONFIG.storeOwner.fullName,
                phone: '+1 555-123-4567',
                age_verified: true,
                age_verified_at: new Date().toISOString(),
                birth_date: '1985-05-15'
            })
            log(`Store Owner configurado: ${CONFIG.storeOwner.email}`, 'success')
        }

        // Delivery Owner
        const deliveryOwnerUser = await createOrGetUser(
            CONFIG.deliveryOwner.email,
            CONFIG.deliveryOwner.password,
            CONFIG.deliveryOwner.fullName
        )

        if (deliveryOwnerUser) {
            await updateProfile(deliveryOwnerUser.id, {
                full_name: CONFIG.deliveryOwner.fullName,
                phone: '+1 555-987-6543',
                age_verified: true,
                age_verified_at: new Date().toISOString(),
                birth_date: '1988-08-20'
            })
            log(`Delivery Owner configurado: ${CONFIG.deliveryOwner.email}`, 'success')
        }

        // ----------------------------------------------------------------
        section('2. CONFIGURACIÓN DE TENANTS')
        // ----------------------------------------------------------------

        // Store Tenant
        const storeTenant = await createTenant({
            ...CONFIG.demoStore,
            type: 'owner_store'
        })

        if (storeTenant && storeOwnerUser) {
            await createTenantMembership(storeOwnerUser.id, storeTenant.id, 'owner')
            log(`Tenant de tienda creado: ${CONFIG.demoStore.name}`, 'success')

            // Crear tienda
            const store = await createStore(storeTenant.id, CONFIG.demoStore)
            if (store) {
                log(`Tienda creada: ${store.name}`, 'success')

                // Crear ubicación
                const location = await createStoreLocation(store.id)
                if (location) {
                    log(`Ubicación creada: ${location.name}`, 'success')

                    // ----------------------------------------------------------------
                    section('3. CATÁLOGO DE PRODUCTOS')
                    // ----------------------------------------------------------------

                    const products = await createMasterProducts()
                    log(`${products.length} productos maestros creados`, 'success')

                    // Crear inventario
                    await createInventory(store.id, location.id, products)
                    log(`Inventario creado para ${products.length} productos`, 'success')
                }
            }
        }

        // Delivery Tenant
        const deliveryTenant = await createTenant({
            ...CONFIG.demoDelivery,
            type: 'delivery_company'
        })

        if (deliveryTenant && deliveryOwnerUser) {
            await createTenantMembership(deliveryOwnerUser.id, deliveryTenant.id, 'owner')
            log(`Tenant de delivery creado: ${CONFIG.demoDelivery.name}`, 'success')

            // Crear empresa de delivery
            const deliveryCompany = await createDeliveryCompany(deliveryTenant.id, CONFIG.demoDelivery)
            if (deliveryCompany) {
                log(`Empresa de delivery creada: ${deliveryCompany.name}`, 'success')
            }
        }

        // ----------------------------------------------------------------
        section('4. JURISDICCIONES Y IMPUESTOS')
        // ----------------------------------------------------------------

        await setupJurisdictions()

        // Obtener state ID para impuestos
        const { data: nyState } = await supabase
            .from('us_states')
            .select('id')
            .eq('usps_code', 'NY')
            .single()

        if (nyState) {
            await setupTaxRates(nyState.id)
        }

        await setupPlatformFees()

        // ----------------------------------------------------------------
        section('5. CONFIGURACIÓN DE PLATAFORMA')
        // ----------------------------------------------------------------

        await setupPlatformSettings()

        // ----------------------------------------------------------------
        // RESUMEN FINAL
        // ----------------------------------------------------------------

        console.log('\n')
        console.log('╔════════════════════════════════════════════════════════════╗')
        console.log('║                    🎉 SETUP COMPLETADO                     ║')
        console.log('╚════════════════════════════════════════════════════════════╝')
        console.log('\n📋 Cuentas de prueba creadas:\n')
        console.log('   ┌─────────────────────────────────────────────────────────┐')
        console.log(`   │ Platform Admin                                          │`)
        console.log(`   │   Email: ${CONFIG.admin.email.padEnd(35)}│`)
        console.log(`   │   Pass:  ${CONFIG.admin.password.padEnd(35)}│`)
        console.log('   ├─────────────────────────────────────────────────────────┤')
        console.log(`   │ Store Owner                                             │`)
        console.log(`   │   Email: ${CONFIG.storeOwner.email.padEnd(35)}│`)
        console.log(`   │   Pass:  ${CONFIG.storeOwner.password.padEnd(35)}│`)
        console.log('   ├─────────────────────────────────────────────────────────┤')
        console.log(`   │ Delivery Owner                                          │`)
        console.log(`   │   Email: ${CONFIG.deliveryOwner.email.padEnd(35)}│`)
        console.log(`   │   Pass:  ${CONFIG.deliveryOwner.password.padEnd(35)}│`)
        console.log('   └─────────────────────────────────────────────────────────┘')
        console.log('\n📦 Datos creados:')
        console.log('   • 1 Tienda demo con ubicación')
        console.log('   • 1 Empresa de delivery demo')
        console.log('   • 15 Productos en catálogo maestro')
        console.log('   • Inventario inicial para tienda')
        console.log('   • Jurisdicción de New York')
        console.log('   • Tasas de impuestos configuradas')
        console.log('   • Fees de plataforma configurados')
        console.log('\n✅ El sistema está listo para usar.\n')

    } catch (error) {
        console.error('\n❌ Error durante el setup:', error)
        process.exit(1)
    }
}

main()
