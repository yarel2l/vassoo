import { NextResponse } from 'next/server'
import { platformSettingsService } from '@/lib/services/platform-settings-service'

/**
 * GET /api/platform/settings/stripe/public
 *
 * Public endpoint to get Stripe publishable key.
 * This is safe to expose to the client as the publishable key
 * is meant to be used in client-side code.
 */
export async function GET() {
    try {
        const publishableKey = await platformSettingsService.getStripePublishableKey()
        const config = await platformSettingsService.getStripeConfig()

        return NextResponse.json({
            publishableKey: publishableKey || '',
            mode: config?.mode || 'test',
            isConfigured: !!publishableKey
        })
    } catch (error) {
        console.error('Error fetching Stripe public config:', error)

        // Return empty config rather than error to avoid breaking client
        return NextResponse.json({
            publishableKey: '',
            mode: 'test',
            isConfigured: false
        })
    }
}
