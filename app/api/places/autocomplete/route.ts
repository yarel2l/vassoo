import { NextRequest, NextResponse } from 'next/server'
import { platformSettingsService } from '@/lib/services/platform-settings-service'

/**
 * GET /api/places/autocomplete
 * Proxy endpoint for Google Places Autocomplete API (New)
 * Query params: input (required), types (optional)
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const input = searchParams.get('input')
    const types = searchParams.get('types') || 'address'

    if (!input) {
        return NextResponse.json(
            { error: 'Input parameter is required' },
            { status: 400 }
        )
    }

    try {
        const config = await platformSettingsService.getGoogleApiConfig()
        const apiKey = await platformSettingsService.getGoogleApiKey()

        if (!config?.enabled || !apiKey || !config.services?.places) {
            return NextResponse.json(
                { error: 'Google Places API is not configured', predictions: [] },
                { status: 503 }
            )
        }

        // Use new Places API (New) - Autocomplete endpoint
        // https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
        const response = await fetch(
            'https://places.googleapis.com/v1/places:autocomplete',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                },
                body: JSON.stringify({
                    input: input,
                    includedPrimaryTypes: types === 'address' ? ['street_address', 'premise', 'subpremise', 'route'] : [types],
                }),
            }
        )

        const data = await response.json()

        if (response.ok && data.suggestions) {
            // Transform new API response to match old format
            const predictions = data.suggestions.map((suggestion: any) => ({
                place_id: suggestion.placePrediction?.placeId || '',
                description: suggestion.placePrediction?.text?.text || '',
                structured_formatting: {
                    main_text: suggestion.placePrediction?.structuredFormat?.mainText?.text || '',
                    secondary_text: suggestion.placePrediction?.structuredFormat?.secondaryText?.text || '',
                },
            }))

            return NextResponse.json({
                status: 'OK',
                predictions
            })
        }

        if (response.ok && !data.suggestions) {
            return NextResponse.json({
                status: 'ZERO_RESULTS',
                predictions: []
            })
        }

        // Handle errors
        return NextResponse.json({
            success: false,
            error: data.error?.message || 'Places API request failed',
            predictions: [],
            details: data.error
        })
    } catch (error) {
        console.error('Places autocomplete error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch address suggestions', predictions: [] },
            { status: 500 }
        )
    }
}
