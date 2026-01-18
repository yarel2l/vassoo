import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
    platformSettingsService,
    invalidateCache
} from '@/lib/services/platform-settings-service'
import type { StripeConfig, EmailConfig, GoogleApiConfig } from '@/lib/services/platform-settings-service'

/**
 * Check if the current user is a platform admin
 * Uses the is_platform_admin() PostgreSQL function which has SECURITY DEFINER
 */
async function isPlatformAdmin(): Promise<{ isAdmin: boolean; userId: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { isAdmin: false, userId: null }
    }

    // Use RPC call to the is_platform_admin function (SECURITY DEFINER bypasses RLS)
    const { data: isAdmin, error } = await supabase.rpc('is_platform_admin')

    if (error) {
        console.error('Error checking platform admin status:', error)
        return { isAdmin: false, userId: user.id }
    }

    return {
        isAdmin: !!isAdmin,
        userId: user.id
    }
}

/**
 * GET /api/platform/settings
 * Get platform settings by category
 * Query params: category (stripe | email | general)
 */
export async function GET(request: NextRequest) {
    const { isAdmin, userId } = await isPlatformAdmin()

    if (!isAdmin) {
        return NextResponse.json(
            { error: 'Unauthorized - Platform admin access required' },
            { status: 403 }
        )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    try {
        if (category === 'stripe') {
            const config = await platformSettingsService.getStripeConfig()
            const isConfigured = await platformSettingsService.isStripeConfigured()

            return NextResponse.json({
                config: config || {
                    publishableKey: '',
                    mode: 'test',
                    webhookEndpoint: '/api/stripe/webhooks',
                    connect: {
                        enabled: true,
                        accountType: 'express',
                        platformFeePercent: 10,
                        capabilities: {
                            card_payments: true,
                            transfers: true
                        }
                    }
                },
                isConfigured,
                // Return masked indicators for secrets
                hasSecretKey: !!(await platformSettingsService.getStripeSecretKey()),
                hasWebhookSecret: !!(await platformSettingsService.getStripeWebhookSecret())
            })
        }

        if (category === 'email') {
            const config = await platformSettingsService.getEmailConfig()
            const isConfigured = await platformSettingsService.isEmailConfigured()

            return NextResponse.json({
                config: config || {
                    provider: 'resend',
                    fromAddress: 'noreply@vassoo.com',
                    fromName: 'Vassoo'
                },
                isConfigured,
                hasApiKey: !!(await platformSettingsService.getResendApiKey()),
                hasSmtpPassword: !!(await platformSettingsService.getSmtpPassword())
            })
        }

        if (category === 'google') {
            const config = await platformSettingsService.getGoogleApiConfig()
            const isConfigured = await platformSettingsService.isGoogleApiConfigured()

            return NextResponse.json({
                config: config || {
                    enabled: false,
                    services: {
                        places: true,
                        maps: true,
                        geocoding: true
                    }
                },
                isConfigured,
                hasApiKey: !!(await platformSettingsService.getGoogleApiKey())
            })
        }

        return NextResponse.json(
            { error: 'Invalid category. Use: stripe, email, google' },
            { status: 400 }
        )
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/platform/settings
 * Save platform settings
 */
export async function POST(request: NextRequest) {
    const { isAdmin, userId } = await isPlatformAdmin()

    if (!isAdmin) {
        return NextResponse.json(
            { error: 'Unauthorized - Platform admin access required' },
            { status: 403 }
        )
    }

    try {
        const body = await request.json()
        const { category, config, secrets } = body

        if (category === 'stripe') {
            // Validate stripe config
            const stripeConfig = config as StripeConfig

            if (!stripeConfig.publishableKey) {
                return NextResponse.json(
                    { error: 'Publishable key is required' },
                    { status: 400 }
                )
            }

            // Save non-sensitive config
            await platformSettingsService.setStripeConfig(stripeConfig, userId || undefined)

            // Save secrets if provided
            if (secrets?.secretKey) {
                await platformSettingsService.setStripeSecretKey(secrets.secretKey, userId || undefined)
            }

            if (secrets?.webhookSecret) {
                await platformSettingsService.setStripeWebhookSecret(secrets.webhookSecret, userId || undefined)
            }

            // Invalidate all stripe-related caches
            invalidateCache('stripe')

            return NextResponse.json({
                success: true,
                message: 'Stripe configuration saved successfully'
            })
        }

        if (category === 'email') {
            const emailConfig = config as EmailConfig

            if (!emailConfig.fromAddress) {
                return NextResponse.json(
                    { error: 'From address is required' },
                    { status: 400 }
                )
            }

            // Save non-sensitive config
            await platformSettingsService.setEmailConfig(emailConfig, userId || undefined)

            // Save secrets based on provider
            if (emailConfig.provider === 'resend' && secrets?.apiKey) {
                await platformSettingsService.setResendApiKey(secrets.apiKey, userId || undefined)
            }

            if (emailConfig.provider === 'smtp' && secrets?.smtpPassword) {
                await platformSettingsService.setSmtpPassword(secrets.smtpPassword, userId || undefined)
            }

            // Invalidate email caches
            invalidateCache('email')

            return NextResponse.json({
                success: true,
                message: 'Email configuration saved successfully'
            })
        }

        if (category === 'google') {
            const googleConfig = config as GoogleApiConfig

            // Save non-sensitive config
            await platformSettingsService.setGoogleApiConfig(googleConfig, userId || undefined)

            // Save API key if provided
            if (secrets?.apiKey) {
                await platformSettingsService.setGoogleApiKey(secrets.apiKey, userId || undefined)
            }

            // Invalidate google caches
            invalidateCache('google')

            return NextResponse.json({
                success: true,
                message: 'Google API configuration saved successfully'
            })
        }

        return NextResponse.json(
            { error: 'Invalid category. Use: stripe, email, google' },
            { status: 400 }
        )
    } catch (error) {
        console.error('Error saving settings:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to save settings' },
            { status: 500 }
        )
    }
}
