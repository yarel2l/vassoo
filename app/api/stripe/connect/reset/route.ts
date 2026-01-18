import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { tenant_id, deleteTestOrders } = await request.json()

        if (!tenant_id) {
            return NextResponse.json(
                { error: 'tenant_id is required' },
                { status: 400 }
            )
        }

        // Use admin client for authorization checks to bypass RLS
        const adminClient = createAdminClient()

        // Verify user has access to the tenant (must be owner)
        const { data: membership } = await adminClient
            .from('tenant_memberships')
            .select('role')
            .eq('tenant_id', tenant_id)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single()

        // Check if user is owner or platform admin
        const isOwner = membership?.role === 'owner'
        let isPlatformAdmin = false

        if (!isOwner) {
            const { data: platformAdmin } = await adminClient
                .from('platform_admins')
                .select('id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .single()

            isPlatformAdmin = !!platformAdmin
        }

        if (!isOwner && !isPlatformAdmin) {
            return NextResponse.json(
                { error: 'Only the store owner or platform admins can reset Stripe connection' },
                { status: 403 }
            )
        }

        // Get the store_id for this tenant to check orders
        const { data: store } = await adminClient
            .from('stores')
            .select('id')
            .eq('tenant_id', tenant_id)
            .single()

        // Only check for pending orders if there's a store
        if (store) {
            // If deleteTestOrders is true, delete all orders for this store first
            if (deleteTestOrders) {
                // First get all order IDs for this store
                const { data: storeOrders } = await adminClient
                    .from('orders')
                    .select('id')
                    .eq('store_id', store.id)

                if (storeOrders && storeOrders.length > 0) {
                    const orderIds = storeOrders.map(o => o.id)

                    // Delete order_items first (child records)
                    const { error: itemsDeleteError } = await adminClient
                        .from('order_items')
                        .delete()
                        .in('order_id', orderIds)

                    if (itemsDeleteError) {
                        console.error('Error deleting order items:', itemsDeleteError)
                        // Continue anyway - orders might cascade delete items
                    }

                    // Delete all orders for this store
                    const { error: ordersDeleteError } = await adminClient
                        .from('orders')
                        .delete()
                        .in('id', orderIds)

                    if (ordersDeleteError) {
                        console.error('Error deleting orders:', ordersDeleteError)
                        return NextResponse.json(
                            { error: 'Failed to delete test orders: ' + ordersDeleteError.message },
                            { status: 500 }
                        )
                    }
                }
            } else {
                // Check for pending payments/orders that need processing
                // payment_status can be: 'pending', 'paid', 'failed'
                const { data: pendingOrders, error: ordersError } = await adminClient
                    .from('orders')
                    .select('id, status, payment_status')
                    .eq('store_id', store.id)
                    .eq('payment_status', 'pending')
                    .not('status', 'in', '("cancelled","completed","delivered")')
                    .limit(1)

                if (ordersError) {
                    console.error('Error checking pending orders:', ordersError)
                    return NextResponse.json(
                        { error: 'Failed to verify pending payments' },
                        { status: 500 }
                    )
                }

                if (pendingOrders && pendingOrders.length > 0) {
                    return NextResponse.json(
                        {
                            error: 'Cannot reset Stripe connection while there are pending payments. Please complete or cancel all pending orders first.',
                            hasPendingPayments: true,
                            canDeleteTestOrders: true
                        },
                        { status: 400 }
                    )
                }

                // Check for paid orders that haven't been transferred to the store yet
                // These are orders where payment was received but Stripe transfer hasn't been completed
                const { data: pendingTransfers, error: transfersError } = await adminClient
                    .from('orders')
                    .select('id, status, payment_status, stripe_transfer_id')
                    .eq('store_id', store.id)
                    .eq('payment_status', 'paid')
                    .is('stripe_transfer_id', null)
                    .not('status', 'in', '("cancelled")')
                    .limit(1)

                if (transfersError) {
                    console.error('Error checking pending transfers:', transfersError)
                    return NextResponse.json(
                        { error: 'Failed to verify pending transfers' },
                        { status: 500 }
                    )
                }

                if (pendingTransfers && pendingTransfers.length > 0) {
                    return NextResponse.json(
                        {
                            error: 'Cannot reset Stripe connection while there are pending transfers. Please wait for all payments to be transferred to your account.',
                            hasPendingTransfers: true,
                            canDeleteTestOrders: true
                        },
                        { status: 400 }
                    )
                }
            }
        }

        // Clear Stripe account information
        const { error: updateError } = await adminClient
            .from('tenants')
            .update({
                stripe_account_id: null,
                stripe_account_status: null,
                stripe_onboarding_complete: false
            })
            .eq('id', tenant_id)

        if (updateError) {
            console.error('Error resetting Stripe account:', updateError)
            return NextResponse.json(
                { error: 'Failed to reset Stripe connection' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Stripe connection has been reset. You can now start a new onboarding process.'
        })

    } catch (error: unknown) {
        console.error('Stripe reset error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to reset Stripe connection' },
            { status: 500 }
        )
    }
}
