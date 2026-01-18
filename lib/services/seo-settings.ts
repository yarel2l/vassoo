/**
 * SEO Settings Service
 * 
 * Server-side service for fetching SEO-related platform settings.
 * Used by layout.tsx and other server components to generate dynamic metadata.
 */

import { createClient } from '@supabase/supabase-js'

export interface PlatformSEOSettings {
    platformName: string
    platformTagline: string
    platformDescription: string
}

const DEFAULT_SEO_SETTINGS: PlatformSEOSettings = {
    platformName: 'Vassoo',
    platformTagline: 'Premium Spirits & Wine Marketplace',
    platformDescription: 'Discover premium spirits, wines, and liquors from multiple stores with the best prices and deals. Compare offers, read reviews, and enjoy fast delivery.',
}

/**
 * Fetches SEO settings from platform_settings table
 * Returns default values if settings are not found or on error
 */
export async function getPlatformSEOSettings(): Promise<PlatformSEOSettings> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Missing Supabase configuration, using default SEO settings')
        return DEFAULT_SEO_SETTINGS
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        const { data, error } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', ['platform_name', 'platform_tagline', 'footer_description'])
            .eq('is_public', true)

        if (error) {
            console.error('Error fetching SEO settings:', error)
            return DEFAULT_SEO_SETTINGS
        }

        const settingsMap: Record<string, unknown> = {}
        for (const setting of (data || []) as Array<{ key: string; value: unknown }>) {
            settingsMap[setting.key] = setting.value
        }

        return {
            platformName: parseSettingValue(settingsMap.platform_name, DEFAULT_SEO_SETTINGS.platformName),
            platformTagline: parseSettingValue(settingsMap.platform_tagline, DEFAULT_SEO_SETTINGS.platformTagline),
            platformDescription: parseSettingValue(settingsMap.footer_description, DEFAULT_SEO_SETTINGS.platformDescription),
        }
    } catch (error) {
        console.error('Error in getPlatformSEOSettings:', error)
        return DEFAULT_SEO_SETTINGS
    }
}

/**
 * Parse a setting value that may be JSON-encoded string or plain value
 */
function parseSettingValue(value: unknown, defaultValue: string): string {
    if (value === null || value === undefined) {
        return defaultValue
    }
    
    // If it's a string that looks like JSON (starts with quote), parse it
    if (typeof value === 'string') {
        if (value.startsWith('"') && value.endsWith('"')) {
            try {
                return JSON.parse(value)
            } catch {
                return value
            }
        }
        return value
    }
    
    return String(value)
}
