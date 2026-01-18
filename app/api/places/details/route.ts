import { NextRequest, NextResponse } from 'next/server'
import { platformSettingsService } from '@/lib/services/platform-settings-service'

/**
 * GET /api/places/details
 * Proxy endpoint for Google Places Details API (New)
 * Query params: place_id (required)
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const placeId = searchParams.get('place_id')

    if (!placeId) {
        return NextResponse.json(
            { error: 'place_id parameter is required' },
            { status: 400 }
        )
    }

    try {
        const config = await platformSettingsService.getGoogleApiConfig()
        const apiKey = await platformSettingsService.getGoogleApiKey()

        if (!config?.enabled || !apiKey) {
            return NextResponse.json(
                { error: 'Google Places API is not configured' },
                { status: 503 }
            )
        }

        // Use new Places API (New) - Place Details endpoint
        // https://developers.google.com/maps/documentation/places/web-service/place-details
        const fields = 'id,displayName,formattedAddress,addressComponents,location'
        const response = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}?fields=${fields}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                },
            }
        )

        const data = await response.json()

        if (response.ok && data.id) {
            const components = data.addressComponents || []

            const getComponent = (type: string) => {
                const component = components.find((c: { types: string[] }) => c.types.includes(type))
                return component?.longText || ''
            }
            const getShortComponent = (type: string) => {
                const component = components.find((c: { types: string[] }) => c.types.includes(type))
                return component?.shortText || ''
            }

            return NextResponse.json({
                status: 'OK',
                result: {
                    formatted_address: data.formattedAddress,
                    street: `${getComponent('street_number')} ${getComponent('route')}`.trim(),
                    city: getComponent('locality') || getComponent('sublocality') || getComponent('administrative_area_level_2'),
                    state: getShortComponent('administrative_area_level_1'),
                    zipCode: getComponent('postal_code'),
                    country: getComponent('country'),
                    coordinates: data.location
                        ? {
                            lat: data.location.latitude,
                            lng: data.location.longitude
                        }
                        : null
                }
            })
        }

        return NextResponse.json({
            status: 'ERROR',
            error: data.error?.message || 'Place details request failed',
            details: data.error
        })
    } catch (error) {
        console.error('Place details error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch place details' },
            { status: 500 }
        )
    }
}
