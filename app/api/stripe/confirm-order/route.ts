import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getStripeInstance } from '@/lib/stripe/stripe'
import { feeCalculationService } from '@/lib/services/fee-calculation-service'

// Get Stripe instance dynamically - but have a fallback for immediate use
let stripe: Stripe | null = null
async function getStripe(): Promise<Stripe> {
    if (!stripe) {
        try {
            stripe = await getStripeInstance()
        } catch {
            // Fallback to env variable if settings not configured
            stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
        }
    }
    return stripe
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ConfirmOrderRequest {
    paymentIntentId: string
    customerId: string
    shippingAddress: {
        name: string
        email: string
        phone: string
        street: string
        city: string
        state: string
        zipCode: string
        country: string
        deliveryNotes?: string
    }
    items: Array<{
        id?: string
        productId: string
        productName: string
        storeId: string
        storeName: string
        price: number
        taxes: number
        shippingCost: number
        quantity: number
        inventoryId?: string
    }>
}

export async function POST(request: NextRequest) {
    try {
        const body: ConfirmOrderRequest = await request.json()
        const { paymentIntentId, customerId, shippingAddress, items } = body

        // Get Stripe instance
        const stripeClient = await getStripe()

        // Verify payment was successful
        const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId)

        if (paymentIntent.status !== 'succeeded') {
            return NextResponse.json(
                { error: 'Payment not completed', status: paymentIntent.status },
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
        }, {} as Record<string, typeof items>)

        // Create orders for each store
        const createdOrders: Array<{
            id: string
            orderNumber: string
            storeId: string
            storeName: string
            total: number
            deliveryId?: string
        }> = []

        for (const [storeId, storeItems] of Object.entries(itemsByStore)) {
            const subtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
            const taxes = storeItems.reduce((sum, item) => sum + item.taxes * item.quantity, 0)
            const deliveryFee = storeItems.reduce((sum, item) => sum + item.shippingCost * item.quantity, 0)
            const total = subtotal + taxes + deliveryFee
            const storeName = storeItems[0]?.storeName || 'Unknown Store'

            // Calculate platform fee for this store's order
            const storeFeeResult = await feeCalculationService.calculateFees(total)
            const storePlatformFee = storeFeeResult.marketplaceCommission

            // Get store location for pickup address
            const { data: storeLocation } = await supabase
                .from('store_locations')
                .select('id, address_line1, city, state, zip_code, coordinates')
                .eq('store_id', storeId)
                .eq('is_primary', true)
                .single()

            // Create order - let the database generate the order number
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    customer_id: customerId,
                    store_id: storeId,
                    status: 'confirmed',
                    fulfillment_type: 'delivery',
                    delivery_address: {
                        name: shippingAddress.name,
                        street: shippingAddress.street,
                        city: shippingAddress.city,
                        state: shippingAddress.state,
                        zip_code: shippingAddress.zipCode,
                        country: shippingAddress.country,
                        phone: shippingAddress.phone,
                        email: shippingAddress.email,
                        notes: shippingAddress.deliveryNotes || null
                    },
                    subtotal,
                    tax_amount: taxes,
                    delivery_fee: deliveryFee,
                    platform_fee: storePlatformFee, // Platform commission
                    total,
                    payment_status: 'paid',
                    payment_method: 'card',
                    stripe_payment_intent_id: paymentIntentId,
                    customer_email: shippingAddress.email,
                    customer_notes: shippingAddress.deliveryNotes || null
                })
                .select('id, order_number')
                .single()

            if (orderError) {
                console.error('Error creating order:', orderError)
                // Continue with other orders even if one fails
                continue
            }

            // Create order items
            const orderItems = storeItems.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                inventory_id: item.inventoryId || item.id || null,
                product_name: item.productName,
                quantity: item.quantity,
                unit_price: item.price,
                subtotal: item.price * item.quantity,
                discount_amount: 0,
                tax_amount: item.taxes * item.quantity,
                total: (item.price + item.taxes) * item.quantity
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)

            if (itemsError) {
                console.error('Error creating order items:', itemsError)
            }

            // Update inventory quantities using the decrement_inventory RPC function
            for (const item of storeItems) {
                const inventoryId = item.inventoryId || item.id
                if (inventoryId) {
                    try {
                        const { data: decrementSuccess, error: invError } = await supabase.rpc('decrement_inventory', {
                            p_inventory_id: inventoryId,
                            p_quantity: item.quantity
                        })

                        if (invError) {
                            console.error(`Error decrementing inventory ${inventoryId}:`, invError)
                        } else if (!decrementSuccess) {
                            console.warn(`Inventory ${inventoryId} not found or could not be decremented`)
                        }
                    } catch (err) {
                        console.error(`Failed to decrement inventory ${inventoryId}:`, err)
                    }
                }
            }

            // Create delivery record and assign delivery company
            let deliveryId: string | undefined

            try {
                deliveryId = await createDeliveryForOrder(
                    order.id,
                    storeId,
                    storeLocation,
                    shippingAddress,
                    deliveryFee
                )
            } catch (deliveryError) {
                console.error('Error creating delivery:', deliveryError)
                // Order is still valid, delivery can be assigned later
            }

            // Get store owner to send notification
            const { data: storeData } = await supabase
                .from('stores')
                .select('tenant_id')
                .eq('id', storeId)
                .single()

            if (storeData?.tenant_id) {
                // Get tenant owner
                const { data: members } = await supabase
                    .from('tenant_memberships')
                    .select('user_id')
                    .eq('tenant_id', storeData.tenant_id)
                    .eq('role', 'owner')
                    .limit(1)

                const ownerId = members?.[0]?.user_id

                if (ownerId) {
                    // Create notification for store owner
                    try {
                        await supabase.rpc('create_notification', {
                            p_user_id: ownerId,
                            p_type: 'order',
                            p_title: 'New Order Received',
                            p_body: `Order #${order.order_number} received for $${total.toFixed(2)}`,
                            p_action_url: `/dashboard/store/orders/${order.id}`,
                            p_data: { orderId: order.id, orderNumber: order.order_number }
                        })
                    } catch (err) {
                        console.error('Notification error:', err)
                    }
                }
            }

            createdOrders.push({
                id: order.id,
                orderNumber: order.order_number,
                storeId,
                storeName,
                total,
                deliveryId
            })
        }

        // Handle multi-store transfers if needed
        const transferGroup = paymentIntent.transfer_group
        const storeBreakdown = paymentIntent.metadata.store_breakdown
            ? JSON.parse(paymentIntent.metadata.store_breakdown)
            : []

        // If multiple stores, create transfers
        if (storeBreakdown.length > 1) {
            for (const store of storeBreakdown) {
                if (store.accountId) {
                    const storeAmount = Math.round(store.total * 100)

                    // Calculate platform fee using the fee calculation service
                    const feeResult = await feeCalculationService.calculateFees(store.total)
                    const platformFee = Math.round(feeResult.marketplaceCommission * 100)
                    const transferAmount = storeAmount - platformFee

                    try {
                        await stripeClient.transfers.create({
                            amount: transferAmount,
                            currency: 'usd',
                            destination: store.accountId,
                            transfer_group: transferGroup || undefined,
                            metadata: {
                                store_id: store.storeId,
                                platform_fee: platformFee,
                                order_ids: createdOrders
                                    .filter(o => o.storeId === store.storeId)
                                    .map(o => o.id)
                                    .join(',')
                            }
                        })
                    } catch (transferError) {
                        console.error(`Error creating transfer for store ${store.storeId}:`, transferError)
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            orders: createdOrders,
            paymentIntentId,
            message: `Created ${createdOrders.length} order(s) successfully`
        })

    } catch (error) {
        console.error('Error confirming order:', error)

        return NextResponse.json(
            { error: 'Failed to confirm order' },
            { status: 500 }
        )
    }
}

/**
 * Create a delivery record for an order and assign a delivery company
 */
async function createDeliveryForOrder(
    orderId: string,
    storeId: string,
    storeLocation: {
        id: string
        address_line1: string
        city: string
        state: string
        zip_code: string
        coordinates: unknown
    } | null,
    shippingAddress: ConfirmOrderRequest['shippingAddress'],
    deliveryFee: number
): Promise<string | undefined> {

    // Find the best delivery company for this order
    // First check store's preferred delivery companies
    const { data: preferences } = await supabase
        .from('store_delivery_preferences')
        .select(`
            delivery_company_id,
            priority,
            delivery_company:delivery_companies(
                id,
                name,
                is_active,
                tenant_id
            )
        `)
        .eq('store_id', storeId)
        .eq('is_enabled', true)
        .order('priority', { ascending: true })

    let deliveryCompanyId: string | null = null

    if (preferences && preferences.length > 0) {
        // Use the highest priority active delivery company
        for (const pref of preferences) {
            const company = pref.delivery_company as unknown as { id: string; is_active: boolean | null } | null
            if (company?.is_active) {
                deliveryCompanyId = pref.delivery_company_id
                break
            }
        }
    }

    // If no preferred company, find any available delivery company
    // TODO: In the future, implement geographic coverage matching
    if (!deliveryCompanyId) {
        const { data: availableCompanies } = await supabase
            .from('delivery_companies')
            .select('id')
            .eq('is_active', true)
            .limit(1)

        if (availableCompanies && availableCompanies.length > 0) {
            deliveryCompanyId = availableCompanies[0].id
        }
    }

    // If still no company found, we can't create a delivery
    if (!deliveryCompanyId) {
        console.warn('No delivery company available for order:', orderId)
        return undefined
    }

    // Create the delivery record
    const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
            order_id: orderId,
            delivery_company_id: deliveryCompanyId,
            status: 'pending',
            delivery_fee: deliveryFee,
            pickup_address: storeLocation ? {
                street: storeLocation.address_line1,
                city: storeLocation.city,
                state: storeLocation.state,
                zip_code: storeLocation.zip_code
            } : null,
            dropoff_address: {
                name: shippingAddress.name,
                street: shippingAddress.street,
                city: shippingAddress.city,
                state: shippingAddress.state,
                zip_code: shippingAddress.zipCode,
                phone: shippingAddress.phone,
                email: shippingAddress.email
            },
            customer_notes: shippingAddress.deliveryNotes || null,
            recipient_name: shippingAddress.name,
            estimated_pickup_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
            estimated_delivery_time: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 60 min from now
        })
        .select('id')
        .single()

    if (deliveryError) {
        console.error('Error creating delivery record:', deliveryError)
        throw deliveryError
    }

    // Try to auto-assign a driver
    if (delivery?.id) {
        try {
            await supabase.rpc('auto_assign_delivery', {
                p_delivery_id: delivery.id
            })
        } catch (autoAssignError) {
            console.error('Error auto-assigning delivery:', autoAssignError)
            // Delivery will remain unassigned, can be manually assigned later
        }

        // Send notification to delivery company
        const { data: companyData } = await supabase
            .from('delivery_companies')
            .select('tenant_id')
            .eq('id', deliveryCompanyId)
            .single()

        if (companyData?.tenant_id) {
            const { data: companyMembers } = await supabase
                .from('tenant_memberships')
                .select('user_id')
                .eq('tenant_id', companyData.tenant_id)
                .in('role', ['owner', 'admin'])
                .limit(5)

            for (const member of companyMembers || []) {
                try {
                    await supabase.rpc('create_notification', {
                        p_user_id: member.user_id,
                        p_type: 'delivery',
                        p_title: 'New Delivery Available',
                        p_body: `A new delivery is ready for assignment`,
                        p_action_url: `/dashboard/delivery/deliveries/${delivery.id}`,
                        p_data: { deliveryId: delivery.id, orderId }
                    })
                } catch (err) {
                    console.error('Delivery notification error:', err)
                }
            }
        }
    }

    return delivery?.id
}
