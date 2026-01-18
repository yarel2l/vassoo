import { NextResponse } from 'next/server'
import {
    getStripeInstance,
    getStripeConnectConfig,
    isStripeConfigured,
    isStripeConnectEnabled
} from '@/lib/stripe/stripe'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        // Check if Stripe is configured
        if (!(await isStripeConfigured())) {
            return NextResponse.json(
                { error: 'Payment processing is not configured. Please contact the platform administrator.' },
                { status: 503 }
            )
        }

        // Check if Stripe Connect is enabled
        if (!(await isStripeConnectEnabled())) {
            return NextResponse.json(
                { error: 'Stripe Connect is not enabled for this platform.' },
                { status: 503 }
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

        const { tenant_id } = await request.json()

        if (!tenant_id) {
            return NextResponse.json(
                { error: 'tenant_id is required' },
                { status: 400 }
            )
        }

        // Use admin client for authorization checks to bypass RLS
        const adminClient = createAdminClient()

        // Verify user has access to the tenant (check membership first)
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
                { error: 'Only the store owner or platform admins can manage Stripe connection' },
                { status: 403 }
            )
        }

        // Get tenant info (use admin client to ensure access)
        const { data: tenant, error: tenantError } = await adminClient
            .from('tenants')
            .select('*')
            .eq('id', tenant_id)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            )
        }

        // Get Stripe instance and Connect config from Platform Settings
        const stripe = await getStripeInstance()
        const connectConfig = await getStripeConnectConfig()

        let stripeAccountId = tenant.stripe_account_id

        // Create Stripe Express account if it doesn't exist
        if (!stripeAccountId) {
            const account = await stripe.accounts.create({
                type: connectConfig.accountType,
                email: tenant.email,
                capabilities: {
                    card_payments: { requested: connectConfig.capabilities.card_payments },
                    transfers: { requested: connectConfig.capabilities.transfers },
                },
                business_type: 'company',
                metadata: {
                    tenant_id: tenant.id,
                    tenant_type: tenant.type,
                },
            })

            stripeAccountId = account.id

            // Save Stripe account ID to tenant (use admin client to bypass RLS)
            await adminClient
                .from('tenants')
                .update({
                    stripe_account_id: account.id,
                    stripe_account_status: 'onboarding',
                })
                .eq('id', tenant_id)
        }

        // Create account link for onboarding
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const dashboardPath = tenant.type === 'owner_store'
            ? '/dashboard/store'
            : '/dashboard/delivery'

        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${appUrl}/onboarding?refresh=true`,
            return_url: `${appUrl}${dashboardPath}?stripe_connected=true`,
            type: 'account_onboarding',
        })

        return NextResponse.json({ url: accountLink.url })

    } catch (error: unknown) {
        console.error('Stripe Connect onboarding error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create onboarding link' },
            { status: 500 }
        )
    }
}
