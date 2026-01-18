import { NextRequest, NextResponse } from 'next/server'
import {
    getStripeInstance,
    isStripeConfigured,
} from '@/lib/stripe/stripe'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const tenant_id = request.nextUrl.searchParams.get('tenant_id')

        if (!tenant_id) {
            return NextResponse.json(
                { error: 'tenant_id is required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Use admin client for authorization checks to bypass RLS
        const adminClient = createAdminClient()

        // Verify user has access to the tenant
        // First check tenant_memberships
        const { data: membership } = await adminClient
            .from('tenant_memberships')
            .select('role')
            .eq('tenant_id', tenant_id)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single()

        // If no membership found, check if user is a platform admin
        if (!membership) {
            const { data: platformAdmin } = await adminClient
                .from('platform_admins')
                .select('id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .single()

            if (!platformAdmin) {
                return NextResponse.json(
                    { error: 'You are not authorized to access this tenant' },
                    { status: 403 }
                )
            }
        }

        // Get tenant Stripe info (use admin client to ensure access)
        const { data: tenant, error: tenantError } = await adminClient
            .from('tenants')
            .select('stripe_account_id, stripe_account_status, stripe_onboarding_complete')
            .eq('id', tenant_id)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            )
        }

        // Check if Stripe is configured on the platform
        const stripeConfigured = await isStripeConfigured()

        // If no Stripe account, return basic status
        if (!tenant.stripe_account_id) {
            return NextResponse.json({
                connected: false,
                status: 'not_connected',
                stripeConfigured,
                canReceivePayments: false,
                message: 'Connect your Stripe account to receive payments'
            })
        }

        // Get detailed account info from Stripe
        try {
            const stripe = await getStripeInstance()
            const account = await stripe.accounts.retrieve(tenant.stripe_account_id)

            const chargesEnabled = account.charges_enabled
            const payoutsEnabled = account.payouts_enabled
            const detailsSubmitted = account.details_submitted

            let status: string
            let message: string

            if (chargesEnabled && payoutsEnabled) {
                status = 'active'
                message = 'Your account is active and ready to receive payments'
            } else if (detailsSubmitted) {
                status = 'pending_verification'
                message = 'Your account is being reviewed by Stripe'
            } else {
                status = 'onboarding_incomplete'
                message = 'Please complete your Stripe account setup'
            }

            // Update local status if needed
            if (tenant.stripe_account_status !== status) {
                await adminClient
                    .from('tenants')
                    .update({
                        stripe_account_status: status === 'active' ? 'active' :
                                               status === 'pending_verification' ? 'pending' : 'onboarding',
                        stripe_onboarding_complete: detailsSubmitted
                    })
                    .eq('id', tenant_id)
            }

            return NextResponse.json({
                connected: true,
                status,
                stripeConfigured,
                canReceivePayments: chargesEnabled,
                canReceivePayouts: payoutsEnabled,
                detailsSubmitted,
                message,
                accountType: account.type,
                // Don't expose full account ID, just indicate it exists
                hasStripeAccount: true
            })

        } catch (stripeError: unknown) {
            console.error('Error fetching Stripe account:', stripeError)

            // Check if it's an invalid account error
            const errorMessage = stripeError instanceof Error ? stripeError.message : ''
            const isInvalidAccount = errorMessage.includes('does not have access to account') ||
                                     errorMessage.includes('No such account') ||
                                     errorMessage.includes('account has been deleted')

            if (isInvalidAccount) {
                // Mark as account error - needs reconnection
                return NextResponse.json({
                    connected: false,
                    status: 'account_error',
                    stripeConfigured,
                    canReceivePayments: false,
                    canReceivePayouts: false,
                    message: 'Your Stripe account is invalid or inaccessible. Please reconnect your account.',
                    hasStripeAccount: true,
                    needsReconnection: true,
                    errorDetails: 'The stored Stripe account ID is no longer valid. This can happen if the account was deleted or if there was a configuration issue.'
                })
            }

            // Return local data if Stripe API fails for other reasons
            return NextResponse.json({
                connected: !!tenant.stripe_account_id,
                status: tenant.stripe_account_status || 'unknown',
                stripeConfigured,
                canReceivePayments: tenant.stripe_onboarding_complete,
                message: 'Unable to fetch latest status from Stripe',
                hasStripeAccount: !!tenant.stripe_account_id
            })
        }

    } catch (error: unknown) {
        console.error('Stripe status error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get Stripe status' },
            { status: 500 }
        )
    }
}
