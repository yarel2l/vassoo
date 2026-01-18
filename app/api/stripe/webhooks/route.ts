import { NextResponse } from 'next/server'
import { getStripeInstance, getStripeWebhookSecret } from '@/lib/stripe/stripe'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')!

    let event

    try {
        // Get Stripe instance and webhook secret from Platform Settings
        const stripe = await getStripeInstance()
        const webhookSecret = await getStripeWebhookSecret()

        if (!webhookSecret) {
            console.error('Webhook secret not configured')
            return NextResponse.json(
                { error: 'Webhook not configured' },
                { status: 503 }
            )
        }

        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error: any) {
        console.error('Webhook signature verification failed:', error.message)
        return NextResponse.json(
            { error: 'Webhook signature verification failed' },
            { status: 400 }
        )
    }

    const supabase = await createClient()

    try {
        switch (event.type) {
            case 'account.updated': {
                const account = event.data.object as any

                // Update tenant with new Stripe status
                const { error } = await supabase
                    .from('tenants')
                    .update({
                        stripe_account_status: account.charges_enabled ? 'active' : 'onboarding',
                        stripe_onboarding_complete: account.details_submitted,
                        status: account.charges_enabled ? 'active' : 'pending',
                    })
                    .eq('stripe_account_id', account.id)

                if (error) {
                    console.error('Failed to update tenant:', error)
                }

                // If account is now active, also activate the store/delivery company
                if (account.charges_enabled) {
                    const { data: tenant } = await supabase
                        .from('tenants')
                        .select('id, type')
                        .eq('stripe_account_id', account.id)
                        .single()

                    if (tenant) {
                        if (tenant.type === 'owner_store') {
                            await supabase
                                .from('stores')
                                .update({ is_active: true })
                                .eq('tenant_id', tenant.id)
                        } else if (tenant.type === 'delivery_company') {
                            await supabase
                                .from('delivery_companies')
                                .update({ is_active: true })
                                .eq('tenant_id', tenant.id)
                        }
                    }
                }
                break
            }

            case 'account.application.deauthorized': {
                const account = event.data.object as any

                await supabase
                    .from('tenants')
                    .update({
                        stripe_account_status: 'disabled',
                        status: 'suspended',
                    })
                    .eq('stripe_account_id', account.id)
                break
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as any
                const orderId = paymentIntent.metadata.order_id

                if (orderId) {
                    await supabase
                        .from('orders')
                        .update({
                            stripe_payment_status: 'succeeded',
                            status: 'confirmed',
                            confirmed_at: new Date().toISOString(),
                        })
                        .eq('id', orderId)
                }
                break
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as any
                const orderId = paymentIntent.metadata.order_id

                if (orderId) {
                    await supabase
                        .from('orders')
                        .update({
                            stripe_payment_status: 'failed',
                            status: 'cancelled',
                            cancelled_at: new Date().toISOString(),
                            cancellation_reason: 'Payment failed',
                        })
                        .eq('id', orderId)
                }
                break
            }

            case 'transfer.created': {
                const transfer = event.data.object as any
                const orderId = transfer.metadata?.order_id

                if (orderId) {
                    await supabase
                        .from('orders')
                        .update({
                            stripe_transfer_id: transfer.id,
                        })
                        .eq('id', orderId)
                }
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })

    } catch (error: any) {
        console.error('Webhook handler error:', error)
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        )
    }
}
