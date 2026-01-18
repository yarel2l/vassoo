import { NextResponse } from 'next/server'
import { platformSettingsService } from '@/lib/services/platform-settings-service'

/**
 * GET /api/platform/settings/google/public
 * Get Google API key for client-side use (Places, Maps)
 * This is a public endpoint - no authentication required
 */
export async function GET() {
    try {
        // Check if Supabase environment variables are configured
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.warn('[Google API Settings] Missing Supabase environment variables')
            return NextResponse.json({
                enabled: false,
                apiKey: null,
                services: {
                    places: false,
                    maps: false,
                    geocoding: false
                },
                warning: 'Server configuration incomplete'
            })
        }

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
        // Return a non-error response to avoid breaking the client
        return NextResponse.json({
            enabled: false,
            apiKey: null,
            services: {
                places: false,
                maps: false,
                geocoding: false
            },
            error: 'Configuration unavailable'
        })
    }
}
