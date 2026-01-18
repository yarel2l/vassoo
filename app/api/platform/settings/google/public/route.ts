import { NextResponse } from 'next/server'
import { platformSettingsService } from '@/lib/services/platform-settings-service'

/**
 * GET /api/platform/settings/google/public
 * Get Google API key for client-side use (Places, Maps)
 * This is a public endpoint - no authentication required
 */
export async function GET() {
    try {
        const config = await platformSettingsService.getGoogleApiConfig()
        const apiKey = await platformSettingsService.getGoogleApiKey()

        if (!config?.enabled || !apiKey) {
            return NextResponse.json({
                enabled: false,
                apiKey: null,
                services: {
                    places: false,
                    maps: false,
                    geocoding: false
                }
            })
        }

        return NextResponse.json({
            enabled: true,
            apiKey,
            services: config.services
        })
    } catch (error) {
        console.error('Error fetching Google API config:', error)
        return NextResponse.json(
            { error: 'Failed to fetch Google API configuration' },
            { status: 500 }
        )
    }
}
