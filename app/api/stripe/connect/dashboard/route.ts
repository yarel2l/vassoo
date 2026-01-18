import { NextResponse } from 'next/server'
import {
    getStripeInstance,
    isStripeConfigured,
} from '@/lib/stripe/stripe'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        // Check if Stripe is configured
        if (!(await isStripeConfigured())) {
            return NextResponse.json(
                { error: 'Payment processing is not configured.' },
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

        // Verify user has access to the tenant
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
                    { error: 'You are not authorized to access this dashboard' },
                    { status: 403 }
                )
            }
        }

        // Get tenant info
        const { data: tenant, error: tenantError } = await adminClient
            .from('tenants')
            .select('stripe_account_id, stripe_account_status')
            .eq('id', tenant_id)
            .single()

        if (tenantError || !tenant) {
            return NextResponse.json(
                { error: 'Tenant not found' },
                { status: 404 }
            )
        }

        if (!tenant.stripe_account_id) {
            return NextResponse.json(
                { error: 'Stripe account not connected. Please complete onboarding first.' },
                { status: 400 }
            )
        }

        // Get Stripe instance
        const stripe = await getStripeInstance()

        // Create login link for Express dashboard
        const loginLink = await stripe.accounts.createLoginLink(tenant.stripe_account_id)

        return NextResponse.json({ url: loginLink.url })

    } catch (error: unknown) {
        console.error('Stripe dashboard link error:', error)

        // Handle specific Stripe errors
        if (error instanceof Error && error.message.includes('account has not completed onboarding')) {
            return NextResponse.json(
                { error: 'Please complete Stripe onboarding before accessing the dashboard.' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create dashboard link' },
            { status: 500 }
        )
    }
}
