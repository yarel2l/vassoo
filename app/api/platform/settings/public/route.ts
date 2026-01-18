import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * GET /api/platform/settings/public
 * Get public platform settings (no authentication required)
 * Returns settings marked as is_public=true from platform_settings table
 */
export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        )
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    try {
        // Fetch only public settings
        const { data, error } = await supabase
            .from('platform_settings')
            .select('key, value')
            .eq('is_public', true)

        if (error) {
            console.error('Error fetching public settings:', error)
            return NextResponse.json(
                { error: 'Failed to fetch settings' },
                { status: 500 }
            )
        }

        // Convert array to object for easier access
        const settings: Record<string, unknown> = {}
        for (const setting of data || []) {
            settings[setting.key] = setting.value
        }

        // Parse specific settings with defaults
        const response = {
            ageVerificationRequired: settings.age_verification_required === true || settings.age_verification_required === 'true',
            minAgeForAlcohol: typeof settings.min_age_for_alcohol === 'number'
                ? settings.min_age_for_alcohol
                : parseInt(String(settings.min_age_for_alcohol || '21'), 10),
            platformName: settings.platform_name || 'Vassoo',
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error in public settings API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
