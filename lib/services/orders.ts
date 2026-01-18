import { createClient } from '@/lib/supabase/client'

export interface OrderItem {
    productId: string
    productName: string
    storeId: string
    storeName: string
    // Location information for multi-location stores
    locationId?: string | null
    locationName?: string | null
    inventoryId?: string | null
    price: number
    taxes: number
    shippingCost: number
    quantity: number
}

export interface ShippingAddress {
    name: string
    email: string
    phone: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
    deliveryNotes?: string
    latitude?: number
    longitude?: number
}

export interface CreateOrderResult {
    success: boolean
    orders: Array<{
        id: string
        orderNumber: string
        storeId: string
        storeName: string
        locationId?: string
        total: number
        deliveryId?: string
    }>
    error?: string
}

/**
 * Create orders from cart items - groups items by store+location and creates separate orders
 */
export async function createOrders(
    items: OrderItem[],
    shippingAddress: ShippingAddress,
    customerId: string,
    paymentIntentId: string
): Promise<CreateOrderResult> {
    const supabase = createClient()

    try {
        // Group items by store and location
        // Key format: "storeId:locationId" (locationId can be 'null' string)
        const itemsByStoreLocation = new Map<string, OrderItem[]>()
        items.forEach(item => {
            const key = `${item.storeId}:${item.locationId || 'null'}`
            if (!itemsByStoreLocation.has(key)) {
                itemsByStoreLocation.set(key, [])
            }
            itemsByStoreLocation.get(key)!.push(item)
        })

        const createdOrders: CreateOrderResult['orders'] = []

        // Create an order for each store+location combination
        for (const [storeLocationKey, storeItems] of itemsByStoreLocation) {
            const [storeId, locationIdStr] = storeLocationKey.split(':')
            const locationId = locationIdStr === 'null' ? null : locationIdStr

            // Calculate totals for this store's items
            const subtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
            const taxes = storeItems.reduce((sum, item) => sum + item.taxes * item.quantity, 0)
            const deliveryFee = storeItems.reduce((sum, item) => sum + item.shippingCost * item.quantity, 0)
            const total = subtotal + taxes + deliveryFee

            // Get store name and location name from first item
            const storeName = storeItems[0]?.storeName || 'Unknown Store'

            // Get store location for pickup address
            // Use the locationId from cart if available, otherwise find the optimal location
            let storeLocation: {
                id: string
                address_line1: string
                city: string
                state: string
                zip_code: string
                coordinates: unknown
            } | null = null

            if (locationId) {
                // Use the specific location from cart
                const { data } = await supabase
                    .from('store_locations')
                    .select('id, address_line1, city, state, zip_code, coordinates')
                    .eq('id', locationId)
                    .single()
                storeLocation = data
            } else {
                // Fallback: Use RPC function to find optimal location based on products and customer location
                const productIds = [...new Set(storeItems.map(item => item.productId))]
                
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: optimalLocationId } = await (supabase.rpc as any)('get_fulfillment_location', {
                    p_store_id: storeId,
                    p_product_ids: productIds,
                    p_customer_lat: shippingAddress.latitude || null,
                    p_customer_lng: shippingAddress.longitude || null,
                    p_fulfillment_type: 'delivery'
                })

                if (optimalLocationId) {
                    const { data } = await supabase
                        .from('store_locations')
                        .select('id, address_line1, city, state, zip_code, coordinates')
                        .eq('id', optimalLocationId)
                        .single()
                    storeLocation = data
                } else {
                    // Final fallback: primary location
                    const { data } = await supabase
                        .from('store_locations')
                        .select('id, address_line1, city, state, zip_code, coordinates')
                        .eq('store_id', storeId)
                        .eq('is_primary', true)
                        .single()
                    storeLocation = data
                }
            }

            // Create the order with store_location_id
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    customer_id: customerId,
                    store_id: storeId,
                    store_location_id: storeLocation?.id || null,
                    status: 'pending',
                    subtotal,
                    tax_amount: taxes,
                    delivery_fee: deliveryFee,
                    total,
                    payment_status: 'paid',
                    payment_method: 'card',
                    stripe_payment_intent_id: paymentIntentId,
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
                    customer_notes: shippingAddress.deliveryNotes || null,
                })
                .select('id, order_number')
                .single()

            if (orderError || !order) {
                console.error('Error creating order:', orderError)
                throw new Error(`Failed to create order for store ${storeName}: ${orderError?.message}`)
            }

            // Create order items
            const orderItems = storeItems.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                inventory_id: item.inventoryId || null,
                product_name: item.productName,
                quantity: item.quantity,
                unit_price: item.price,
                tax_amount: item.taxes,
                total_price: (item.price + item.taxes) * item.quantity
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)

            if (itemsError) {
                console.error('Error creating order items:', itemsError)
                // Continue anyway, order is created
            }

            // Update inventory quantities
            for (const item of storeItems) {
                if (item.inventoryId) {
                    await supabase.rpc('decrement_inventory', {
                        p_inventory_id: item.inventoryId,
                        p_quantity: item.quantity
                    }).catch(err => console.error('Error decrementing inventory:', err))
                }
            }

            // Create delivery record and assign delivery company
            let deliveryId: string | undefined

            try {
                deliveryId = await createDeliveryForOrder(
                    supabase,
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

            // Create notification for store owner
            try {
                await supabase.rpc('create_notification', {
                    p_user_id: customerId, // TODO: Should be store owner ID
                    p_type: 'order',
                    p_title: 'New Order Received',
                    p_body: `Order #${order.order_number} received for $${total.toFixed(2)}`,
                    p_action_url: `/dashboard/store/orders/${order.id}`,
                    p_data: { orderId: order.id, orderNumber: order.order_number }
                })
            } catch (notifError) {
                console.error('Error creating notification:', notifError)
            }

            createdOrders.push({
                id: order.id,
                orderNumber: order.order_number,
                storeId,
                storeName,
                locationId: storeLocation?.id,
                total,
                deliveryId
            })
        }

        return {
            success: true,
            orders: createdOrders
        }

    } catch (error) {
        console.error('Error in createOrders:', error)
        return {
            success: false,
            orders: [],
            error: error instanceof Error ? error.message : 'Failed to create orders'
        }
    }
}

/**
 * Create a delivery record for an order and assign a delivery company
 */
async function createDeliveryForOrder(
    supabase: ReturnType<typeof createClient>,
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
    shippingAddress: ShippingAddress,
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
            const company = pref.delivery_company as { id: string; is_active: boolean | null } | null
            if (company?.is_active) {
                deliveryCompanyId = pref.delivery_company_id
                break
            }
        }
    }

    // If no preferred company, find any available delivery company
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
                phone: shippingAddress.phone
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
    }

    return delivery?.id
}

/**
 * Get order details by ID
 */
export async function getOrderById(orderId: string) {
    const supabase = createClient()

    const { data: order, error } = await supabase
        .from('orders')
        .select(`
            *,
            store:stores(id, name, slug, logo_url),
            items:order_items(
                id,
                product_name,
                quantity,
                unit_price,
                tax_amount,
                total_price,
                product:master_products(id, name, thumbnail_url)
            ),
            delivery:deliveries(
                id,
                status,
                driver_id,
                delivery_company_id,
                estimated_pickup_time,
                estimated_delivery_time,
                actual_pickup_time,
                actual_delivery_time,
                driver:delivery_drivers(
                    id,
                    profile:profiles(full_name, avatar_url, phone)
                ),
                delivery_company:delivery_companies(id, name, logo_url)
            )
        `)
        .eq('id', orderId)
        .single()

    if (error) {
        console.error('Error fetching order:', error)
        return null
    }

    return order
}

/**
 * Get orders for a customer
 */
export async function getCustomerOrders(customerId: string, status?: string) {
    const supabase = createClient()

    let query = supabase
        .from('orders')
        .select(`
            id,
            order_number,
            status,
            total,
            created_at,
            delivery_address,
            store:stores(id, name, slug, logo_url),
            items:order_items(count),
            delivery:deliveries(
                id,
                status,
                estimated_delivery_time
            )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

    if (status) {
        query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching customer orders:', error)
        return []
    }

    return data || []
}

/**
 * Get orders for a store
 */
export async function getStoreOrders(storeId: string, status?: string) {
    const supabase = createClient()

    let query = supabase
        .from('orders')
        .select(`
            id,
            order_number,
            status,
            total,
            created_at,
            delivery_address,
            customer_notes,
            customer:profiles(id, full_name, avatar_url, phone),
            items:order_items(
                id,
                product_name,
                quantity,
                unit_price,
                total_price
            ),
            delivery:deliveries(
                id,
                status,
                driver:delivery_drivers(
                    profile:profiles(full_name, phone)
                )
            )
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

    if (status) {
        query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching store orders:', error)
        return []
    }

    return data || []
}

/**
 * Update order status
 */
export async function updateOrderStatus(
    orderId: string,
    status: 'pending' | 'confirmed' | 'processing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled'
) {
    const supabase = createClient()

    const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)

    if (error) {
        console.error('Error updating order status:', error)
        throw error
    }

    // Update delivery status if applicable
    if (status === 'ready_for_pickup') {
        await supabase
            .from('deliveries')
            .update({ status: 'ready_for_pickup' })
            .eq('order_id', orderId)
    } else if (status === 'out_for_delivery') {
        await supabase
            .from('deliveries')
            .update({ status: 'in_transit' })
            .eq('order_id', orderId)
    } else if (status === 'delivered' || status === 'completed') {
        await supabase
            .from('deliveries')
            .update({
                status: 'delivered',
                actual_delivery_time: new Date().toISOString()
            })
            .eq('order_id', orderId)
    }

    return true
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string, reason?: string) {
    const supabase = createClient()

    const { error } = await supabase
        .from('orders')
        .update({
            status: 'cancelled',
            cancel_reason: reason,
            cancelled_at: new Date().toISOString()
        })
        .eq('id', orderId)

    if (error) {
        console.error('Error cancelling order:', error)
        throw error
    }

    // Cancel the delivery too
    await supabase
        .from('deliveries')
        .update({ status: 'cancelled' })
        .eq('order_id', orderId)

    return true
}
