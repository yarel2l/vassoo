import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { platformSettingsService } from '@/lib/services/platform-settings-service'
import Stripe from 'stripe'

/**
 * Check if the current user is a platform admin
 * Uses the is_platform_admin() PostgreSQL function which has SECURITY DEFINER
 */
async function isPlatformAdmin(): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    // Use RPC call to the is_platform_admin function (SECURITY DEFINER bypasses RLS)
    const { data: isAdmin, error } = await supabase.rpc('is_platform_admin')

    if (error) {
        console.error('Error checking platform admin status:', error)
        return false
    }

    return !!isAdmin
}

/**
 * POST /api/platform/settings/test
 *
 * Test connection for various services
 * Body: { service: 'stripe' | 'email', testEmail?: string }
 */
export async function POST(request: NextRequest) {
    if (!(await isPlatformAdmin())) {
        return NextResponse.json(
            { error: 'Unauthorized - Platform admin access required' },
            { status: 403 }
        )
    }

    try {
        const body = await request.json()
        const { service, testEmail } = body

        if (service === 'stripe') {
            return await testStripeConnection()
        }

        if (service === 'email') {
            if (!testEmail) {
                return NextResponse.json(
                    { error: 'testEmail is required for email testing' },
                    { status: 400 }
                )
            }
            return await testEmailConnection(testEmail)
        }

        if (service === 'google') {
            return await testGoogleApiConnection()
        }

        return NextResponse.json(
            { error: 'Invalid service. Use: stripe, email, google' },
            { status: 400 }
        )
    } catch (error) {
        console.error('Error testing connection:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Connection test failed' },
            { status: 500 }
        )
    }
}

/**
 * Test Stripe connection by fetching account balance
 */
async function testStripeConnection(): Promise<NextResponse> {
    const secretKey = await platformSettingsService.getStripeSecretKey()

    if (!secretKey) {
        return NextResponse.json({
            success: false,
            error: 'Stripe secret key not configured'
        })
    }

    try {
        const stripe = new Stripe(secretKey, {
            // @ts-expect-error - Using latest API version
            apiVersion: '2024-12-18.acacia'
        })

        // Try to fetch account to verify credentials
        const account = await stripe.accounts.retrieve()

        return NextResponse.json({
            success: true,
            message: 'Stripe connection successful',
            details: {
                accountId: account.id,
                businessType: account.business_type,
                country: account.country,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled
            }
        })
    } catch (error) {
        const stripeError = error as Stripe.errors.StripeError
        return NextResponse.json({
            success: false,
            error: stripeError.message || 'Failed to connect to Stripe',
            code: stripeError.code
        })
    }
}

/**
 * Test email connection by sending a test email
 */
async function testEmailConnection(testEmail: string): Promise<NextResponse> {
    const emailConfig = await platformSettingsService.getEmailConfig()

    if (!emailConfig) {
        return NextResponse.json({
            success: false,
            error: 'Email not configured'
        })
    }

    try {
        if (emailConfig.provider === 'resend') {
            const apiKey = await platformSettingsService.getResendApiKey()

            if (!apiKey) {
                return NextResponse.json({
                    success: false,
                    error: 'Resend API key not configured'
                })
            }

            // Import Resend dynamically
            const { Resend } = await import('resend')
            const resend = new Resend(apiKey)

            const { data, error } = await resend.emails.send({
                from: `${emailConfig.fromName} <${emailConfig.fromAddress}>`,
                to: [testEmail],
                subject: 'Test Email from Vassoo',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">Email Configuration Test</h1>
            <p>This is a test email from your Vassoo platform.</p>
            <p>If you received this email, your email configuration is working correctly!</p>
            <hr style="border-color: #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Configuration Details:<br>
              Provider: Resend<br>
              From: ${emailConfig.fromAddress}
            </p>
          </div>
        `
            })

            if (error) {
                return NextResponse.json({
                    success: false,
                    error: error.message
                })
            }

            return NextResponse.json({
                success: true,
                message: `Test email sent successfully to ${testEmail}`,
                details: { messageId: data?.id }
            })
        }

        if (emailConfig.provider === 'smtp') {
            const smtpPassword = await platformSettingsService.getSmtpPassword()

            if (!smtpPassword || !emailConfig.smtpHost) {
                return NextResponse.json({
                    success: false,
                    error: 'SMTP configuration incomplete'
                })
            }

            // Import nodemailer dynamically
            const nodemailer = await import('nodemailer')

            const transporter = nodemailer.createTransport({
                host: emailConfig.smtpHost,
                port: emailConfig.smtpPort || 587,
                secure: emailConfig.smtpSecure || false,
                auth: {
                    user: emailConfig.smtpUser,
                    pass: smtpPassword
                }
            })

            const info = await transporter.sendMail({
                from: `"${emailConfig.fromName}" <${emailConfig.fromAddress}>`,
                to: testEmail,
                subject: 'Test Email from Vassoo',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">Email Configuration Test</h1>
            <p>This is a test email from your Vassoo platform.</p>
            <p>If you received this email, your SMTP configuration is working correctly!</p>
            <hr style="border-color: #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Configuration Details:<br>
              Provider: SMTP<br>
              Host: ${emailConfig.smtpHost}<br>
              From: ${emailConfig.fromAddress}
            </p>
          </div>
        `
            })

            return NextResponse.json({
                success: true,
                message: `Test email sent successfully to ${testEmail}`,
                details: { messageId: info.messageId }
            })
        }

        return NextResponse.json({
            success: false,
            error: 'Unknown email provider'
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send test email'
        })
    }
}

/**
 * Test Google API connection by making a simple Places Autocomplete request (New API)
 */
async function testGoogleApiConnection(): Promise<NextResponse> {
    const apiKey = await platformSettingsService.getGoogleApiKey()

    if (!apiKey) {
        return NextResponse.json({
            success: false,
            error: 'Google API key not configured'
        })
    }

    try {
        // Test the API key with a simple Places Autocomplete request (New API)
        const testQuery = 'New York'
        const response = await fetch(
            'https://places.googleapis.com/v1/places:autocomplete',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                },
                body: JSON.stringify({
                    input: testQuery,
                    includedPrimaryTypes: ['locality'],
                }),
            }
        )

        const data = await response.json()

        if (response.ok) {
            return NextResponse.json({
                success: true,
                message: 'Google API connection successful (Places API New)',
                details: {
                    status: 'OK',
                    suggestionsCount: data.suggestions?.length || 0
                }
            })
        }

        if (data.error?.status === 'PERMISSION_DENIED' || data.error?.code === 403) {
            return NextResponse.json({
                success: false,
                error: data.error?.message || 'API key is invalid or Places API (New) is not enabled. Enable it at: https://console.cloud.google.com/apis/library/places.googleapis.com',
                details: { status: data.error?.status, code: data.error?.code }
            })
        }

        if (data.error?.status === 'RESOURCE_EXHAUSTED') {
            return NextResponse.json({
                success: false,
                error: 'API quota exceeded. The key is valid but has reached its usage limit.',
                details: { status: data.error?.status }
            })
        }

        return NextResponse.json({
            success: false,
            error: data.error?.message || `Unexpected error`,
            details: { status: data.error?.status }
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to test Google API connection'
        })
    }
}
