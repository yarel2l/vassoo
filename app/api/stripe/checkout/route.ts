import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
    getStripeInstance,
    isStripeConfigured
} from '@/lib/stripe/stripe'
import { taxCalculationService } from '@/lib/services/tax-calculation-service'
import { feeCalculationService } from '@/lib/services/fee-calculation-service'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

const supabase: SupabaseClient | null = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

interface CartItem {
    id: string
    productId: string
    productName: string
    storeId: string
    storeName: string
    price: number
    taxes: number // Frontend estimate - will be recalculated server-side
    shippingCost: number // Frontend estimate - will be recalculated server-side
    quantity: number
    category?: string
    isAlcohol?: boolean
}

interface StoreDeliverySettings {
    delivery_enabled: boolean
    pickup_enabled: boolean
    delivery_fee: number
    free_delivery_threshold: number
    minimum_order: number
}

interface CheckoutRequest {
    items: CartItem[]
    customerId?: string
    customerEmail: string
    shippingAddress: {
        name: string
        street: string
        city: string
        state: string
        zipCode: string
        country: string
    }
}

export async function POST(request: NextRequest) {
    try {
        // Check if Stripe is configured
        if (!(await isStripeConfigured())) {
            return NextResponse.json(
                { error: 'Payment processing is not configured. Please contact support.' },
                { status: 503 }
            )
        }

        // Get Stripe instance from Platform Settings
        const stripe = await getStripeInstance()

        const body: CheckoutRequest = await request.json()
        const { items, customerId, customerEmail, shippingAddress } = body

        if (!items || items.length === 0) {
            return NextResponse.json(
                { error: 'No items in cart' },
                { status: 400 }
            )
        }

        // Group items by store
        const itemsByStore = items.reduce((acc, item) => {
            if (!acc[item.storeId]) {
                acc[item.storeId] = []
            }
            acc[item.storeId].push(item)
            return acc
        }, {} as Record<string, CartItem[]>)

        // Validate inventory availability before processing payment
        const inventoryIds = items
            .map(item => item.id)
            .filter(id => id && id.length > 0)

        if (inventoryIds.length > 0) {
            const inventoryItems = items.map(item => ({
                inventory_id: item.id,
                quantity: item.quantity
            }))

            const { data: availabilityData, error: availabilityError } = await supabase
                .rpc('check_inventory_availability', {
                    p_items: inventoryItems
                })

            if (availabilityError) {
                console.error('Error checking inventory availability:', availabilityError)
                // Continue without blocking - inventory check is advisory
            } else if (availabilityData) {
                const unavailableItems = availabilityData.filter(
                    (item: { is_available: boolean }) => !item.is_available
                )

                if (unavailableItems.length > 0) {
                    const unavailableProducts = unavailableItems.map(
                        (item: { inventory_id: string; available_quantity: number; requested_quantity: number }) => {
                            const cartItem = items.find(i => i.id === item.inventory_id)
                            return {
                                productName: cartItem?.productName || 'Unknown product',
                                available: item.available_quantity,
                                requested: item.requested_quantity
                            }
                        }
                    )

                    return NextResponse.json(
                        {
                            error: 'Some items are no longer available in the requested quantity',
                            unavailableItems: unavailableProducts
                        },
                        { status: 409 }
                    )
                }
            }
        }

        // Get Stripe Connect account IDs and delivery settings for each store
        const storeIds = Object.keys(itemsByStore)
        const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select(`
                id,
                name,
                delivery_settings,
                tenant:tenants(
                    id,
                    stripe_account_id,
                    stripe_account_status
                )
            `)
            .in('id', storeIds)

        if (storesError) {
            console.error('Error fetching stores:', storesError)
            return NextResponse.json(
                { error: 'Failed to fetch store information' },
                { status: 500 }
            )
        }

        // Build store map with Stripe accounts and delivery settings
        const storeAccountMap = new Map<string, {
            accountId: string | null
            name: string
            deliverySettings: StoreDeliverySettings | null
        }>()

        for (const store of stores || []) {
            const tenant = store.tenant as unknown as { stripe_account_id: string | null; stripe_account_status: string } | null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const deliverySettings = (store as any).delivery_settings as StoreDeliverySettings | null
            storeAccountMap.set(store.id, {
                accountId: tenant?.stripe_account_id || null,
                name: store.name,
                deliverySettings
            })
        }

        // Calculate taxes dynamically based on shipping address
        const taxableItems = items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            category: item.category,
            isAlcohol: item.isAlcohol
        }))

        const taxResult = await taxCalculationService.calculateTaxes(taxableItems, {
            city: shippingAddress.city,
            state: shippingAddress.state,
            zipCode: shippingAddress.zipCode,
            country: shippingAddress.country
        })

        // First pass: calculate subtotals to get proportions for tax distribution
        const orderSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const totalTaxes = taxResult.taxAmount
        let totalShipping = 0

        const storeBreakdown: Array<{
            storeId: string
            storeName: string
            subtotal: number
            taxes: number
            shipping: number
            total: number
            stripeAccountId: string | null
        }> = []

        for (const [storeId, storeItems] of Object.entries(itemsByStore)) {
            const subtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

            // Calculate store's portion of taxes (proportional to subtotal)
            const storeInfo = storeAccountMap.get(storeId)
            const taxPortion = orderSubtotal > 0
                ? (subtotal / orderSubtotal) * totalTaxes
                : 0

            // Get delivery fee from store settings or use default
            let deliveryFee = 4.99 // Default delivery fee
            const deliverySettings = storeInfo?.deliverySettings

            if (deliverySettings) {
                // Check if order qualifies for free delivery
                if (deliverySettings.free_delivery_threshold > 0 &&
                    subtotal >= deliverySettings.free_delivery_threshold) {
                    deliveryFee = 0
                } else {
                    deliveryFee = deliverySettings.delivery_fee || 4.99
                }
            }

            const storeTotal = subtotal + taxPortion + deliveryFee

            storeBreakdown.push({
                storeId,
                storeName: storeInfo?.name || 'Unknown Store',
                subtotal,
                taxes: Math.round(taxPortion * 100) / 100,
                shipping: deliveryFee,
                total: Math.round(storeTotal * 100) / 100,
                stripeAccountId: storeInfo?.accountId || null
            })

            totalShipping += deliveryFee
        }

        // Calculate total with server-side values
        const totalSubtotal = orderSubtotal
        const totalAmount = totalSubtotal + totalTaxes + totalShipping

        // Calculate platform fee from platform_fees table
        const feeResult = await feeCalculationService.calculateFees(totalAmount, shippingAddress.state)
        const platformFee = feeResult.marketplaceCommission

        // Create or retrieve Stripe Customer
        let stripeCustomerId: string | undefined

        if (customerEmail) {
            const customers = await stripe.customers.list({
                email: customerEmail,
                limit: 1
            })

            if (customers.data.length > 0) {
                stripeCustomerId = customers.data[0].id
            } else {
                const customer = await stripe.customers.create({
                    email: customerEmail,
                    name: shippingAddress.name,
                    address: {
                        line1: shippingAddress.street,
                        city: shippingAddress.city,
                        state: shippingAddress.state,
                        postal_code: shippingAddress.zipCode,
                        country: 'US'
                    },
                    metadata: {
                        supabase_user_id: customerId || ''
                    }
                })
                stripeCustomerId = customer.id
            }
        }

        // For multi-store orders, we need to create separate PaymentIntents
        // or use a single PaymentIntent with transfer_group for later transfers

        // Using single PaymentIntent with application_fee and transfers after payment
        const amountInCents = Math.round(totalAmount * 100)
        const platformFeeInCents = Math.round(platformFee * 100)

        // Create PaymentIntent
        const paymentIntentData: Stripe.PaymentIntentCreateParams = {
            amount: amountInCents,
            currency: 'usd',
            customer: stripeCustomerId,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                store_breakdown: JSON.stringify(storeBreakdown.map(s => ({
                    storeId: s.storeId,
                    total: s.total,
                    accountId: s.stripeAccountId
                }))),
                platform_fee: platformFee.toString(),
                customer_email: customerEmail,
                shipping_address: JSON.stringify(shippingAddress)
            },
            // We'll use a transfer_group to create transfers after payment succeeds
            transfer_group: `checkout_${Date.now()}`
        }

        // If there's only one store with a connected account, use on_behalf_of
        if (storeBreakdown.length === 1 && storeBreakdown[0].stripeAccountId) {
            paymentIntentData.application_fee_amount = platformFeeInCents
            paymentIntentData.transfer_data = {
                destination: storeBreakdown[0].stripeAccountId
            }
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            // Calculated totals (server-side, authoritative)
            subtotal: totalSubtotal,
            taxes: totalTaxes,
            taxRate: taxResult.taxRate,
            taxBreakdown: taxResult.taxBreakdown,
            shipping: totalShipping,
            totalAmount,
            // Platform fees
            platformFee,
            platformFeeBreakdown: feeResult.feeBreakdown,
            // Store details
            storeBreakdown,
            transferGroup: paymentIntent.transfer_group
        })

    } catch (error) {
        console.error('Error creating payment intent:', error)

        if (error instanceof Stripe.errors.StripeError) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create payment intent' },
            { status: 500 }
        )
    }
}
