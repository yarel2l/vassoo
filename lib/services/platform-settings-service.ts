/**
 * Platform Settings Service
 *
 * Server-side service for managing platform configuration stored in the database.
 * Handles both regular settings (platform_settings table) and encrypted settings
 * (encrypted_settings table) for sensitive data like API keys.
 *
 * IMPORTANT: This module must only be used on the server side (API routes, server components)
 * Never import this in client components.
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { encrypt, decrypt } from '@/lib/utils/encryption'
import type { Database } from '@/types/database'

// Type for encrypted_settings table (not yet in generated types)
// This will be replaced once database types are regenerated after migration
interface EncryptedSettingRow {
    id: string
    setting_key: string
    setting_category: string
    encrypted_value: string
    description: string | null
    updated_by: string | null
    created_at: string
    updated_at: string
}

// ============================================
// Types
// ============================================

export interface StripeConnectConfig {
    enabled: boolean
    accountType: 'express' | 'standard'
    platformFeePercent: number
    capabilities: {
        card_payments: boolean
        transfers: boolean
    }
}

export interface StripeConfig {
    publishableKey: string
    mode: 'test' | 'live'
    webhookEndpoint: string
    connect: StripeConnectConfig
}

export interface EmailConfig {
    provider: 'resend' | 'smtp'
    fromAddress: string
    fromName: string
    smtpHost?: string
    smtpPort?: number
    smtpSecure?: boolean
    smtpUser?: string
}

export interface GoogleApiConfig {
    enabled: boolean
    services: {
        places: boolean
        maps: boolean
        geocoding: boolean
    }
    restrictions?: {
        allowedDomains?: string[]
        allowedIps?: string[]
    }
}

// ============================================
// Cache configuration
// ============================================

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes for regular settings

interface CacheEntry<T> {
    value: T
    expiresAt: number
}

const settingsCache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
    const entry = settingsCache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
        settingsCache.delete(key)
        return null
    }
    return entry.value as T
}

function setCache<T>(key: string, value: T, ttlMs: number = CACHE_TTL_MS): void {
    settingsCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
    })
}

export function invalidateCache(keyPattern?: string): void {
    if (!keyPattern) {
        settingsCache.clear()
        return
    }

    for (const key of settingsCache.keys()) {
        if (key.includes(keyPattern)) {
            settingsCache.delete(key)
        }
    }
}

// ============================================
// Supabase Admin Client (bypasses RLS)
// ============================================

function getAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    // Note: Using NEXT_PUBLIC_ prefix for Amplify SSR compatibility
    const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase configuration')
    }

    return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

// ============================================
// Platform Settings Service
// ============================================

class PlatformSettingsService {
    // ----------------------------------------
    // Generic Settings (platform_settings table)
    // ----------------------------------------

    async getSetting<T>(key: string): Promise<T | null> {
        // Check cache first
        const cached = getCached<T>(`setting:${key}`)
        if (cached !== null) {
            return cached
        }

        const supabase = getAdminClient()
        const { data, error } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', key)
            .single()

        if (error || !data) {
            return null
        }

        const value = data.value as T
        setCache(`setting:${key}`, value)
        return value
    }

    async setSetting<T>(
        key: string,
        value: T,
        options: {
            category?: string
            description?: string
            isPublic?: boolean
            updatedBy?: string
        } = {}
    ): Promise<void> {
        const supabase = getAdminClient()

        const { error } = await supabase
            .from('platform_settings')
            .upsert({
                key,
                value: value as unknown as Database['public']['Tables']['platform_settings']['Insert']['value'],
                category: options.category || 'general',
                description: options.description,
                is_public: options.isPublic ?? false,
                updated_by: options.updatedBy,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'key'
            })

        if (error) {
            throw new Error(`Failed to save setting ${key}: ${error.message}`)
        }

        // Invalidate cache
        invalidateCache(key)
    }

    // ----------------------------------------
    // Encrypted Settings (encrypted_settings table)
    // ----------------------------------------

    async getEncryptedSetting(settingKey: string): Promise<string | null> {
        // No caching for encrypted settings - always fetch fresh
        const supabase = getAdminClient() as SupabaseClient

        // Use raw query since encrypted_settings table may not be in generated types yet
        const { data, error } = await supabase
            .from('encrypted_settings' as any)
            .select('encrypted_value')
            .eq('setting_key', settingKey)
            .single()

        if (error || !data) {
            return null
        }

        try {
            return decrypt((data as EncryptedSettingRow).encrypted_value)
        } catch (e) {
            console.error(`Failed to decrypt setting ${settingKey}:`, e)
            return null
        }
    }

    async setEncryptedSetting(
        settingKey: string,
        plainValue: string,
        category: string,
        options: {
            description?: string
            updatedBy?: string
        } = {}
    ): Promise<void> {
        const supabase = getAdminClient() as SupabaseClient

        const encryptedValue = encrypt(plainValue)

        // Use raw query since encrypted_settings table may not be in generated types yet
        const { error } = await supabase
            .from('encrypted_settings' as any)
            .upsert({
                setting_key: settingKey,
                setting_category: category,
                encrypted_value: encryptedValue,
                description: options.description,
                updated_by: options.updatedBy,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'setting_key'
            })

        if (error) {
            throw new Error(`Failed to save encrypted setting ${settingKey}: ${error.message}`)
        }
    }

    async deleteEncryptedSetting(settingKey: string): Promise<void> {
        const supabase = getAdminClient() as SupabaseClient

        // Use raw query since encrypted_settings table may not be in generated types yet
        const { error } = await supabase
            .from('encrypted_settings' as any)
            .delete()
            .eq('setting_key', settingKey)

        if (error) {
            throw new Error(`Failed to delete setting ${settingKey}: ${error.message}`)
        }
    }

    // ----------------------------------------
    // Stripe-specific methods
    // ----------------------------------------

    async getStripeConfig(): Promise<StripeConfig | null> {
        // Check cache
        const cached = getCached<StripeConfig>('stripe_config')
        if (cached) return cached

        const config = await this.getSetting<StripeConfig>('stripe_config')

        if (config) {
            setCache('stripe_config', config)
        }

        return config
    }

    async setStripeConfig(config: StripeConfig, updatedBy?: string): Promise<void> {
        await this.setSetting('stripe_config', config, {
            category: 'stripe',
            description: 'Stripe payment configuration',
            isPublic: false,
            updatedBy
        })
        invalidateCache('stripe')
    }

    async getStripeSecretKey(): Promise<string | null> {
        // Try database first
        const dbKey = await this.getEncryptedSetting('stripe_secret_key')
        if (dbKey) return dbKey

        // Fallback to environment variable during migration
        return process.env.STRIPE_SECRET_KEY || null
    }

    async setStripeSecretKey(secretKey: string, updatedBy?: string): Promise<void> {
        await this.setEncryptedSetting('stripe_secret_key', secretKey, 'stripe', {
            description: 'Stripe secret API key',
            updatedBy
        })
    }

    async getStripeWebhookSecret(): Promise<string | null> {
        // Try database first
        const dbSecret = await this.getEncryptedSetting('stripe_webhook_secret')
        if (dbSecret) return dbSecret

        // Fallback to environment variable during migration
        return process.env.STRIPE_WEBHOOK_SECRET || null
    }

    async setStripeWebhookSecret(webhookSecret: string, updatedBy?: string): Promise<void> {
        await this.setEncryptedSetting('stripe_webhook_secret', webhookSecret, 'stripe', {
            description: 'Stripe webhook signing secret',
            updatedBy
        })
    }

    async getStripePublishableKey(): Promise<string | null> {
        const config = await this.getStripeConfig()
        if (config?.publishableKey) {
            return config.publishableKey
        }

        // Fallback to environment variable during migration
        return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null
    }

    // ----------------------------------------
    // Email-specific methods
    // ----------------------------------------

    async getEmailConfig(): Promise<EmailConfig | null> {
        const cached = getCached<EmailConfig>('email_config')
        if (cached) return cached

        const config = await this.getSetting<EmailConfig>('email_config')

        if (config) {
            setCache('email_config', config)
        }

        return config
    }

    async setEmailConfig(config: EmailConfig, updatedBy?: string): Promise<void> {
        await this.setSetting('email_config', config, {
            category: 'email',
            description: 'Email service configuration',
            isPublic: false,
            updatedBy
        })
        invalidateCache('email')
    }

    async getResendApiKey(): Promise<string | null> {
        // Try database first
        const dbKey = await this.getEncryptedSetting('resend_api_key')
        if (dbKey) return dbKey

        // Fallback to environment variable
        return process.env.RESEND_API_KEY || null
    }

    async setResendApiKey(apiKey: string, updatedBy?: string): Promise<void> {
        await this.setEncryptedSetting('resend_api_key', apiKey, 'email', {
            description: 'Resend API key',
            updatedBy
        })
    }

    async getSmtpPassword(): Promise<string | null> {
        const dbPassword = await this.getEncryptedSetting('smtp_password')
        return dbPassword
    }

    async setSmtpPassword(password: string, updatedBy?: string): Promise<void> {
        await this.setEncryptedSetting('smtp_password', password, 'email', {
            description: 'SMTP password',
            updatedBy
        })
    }

    // ----------------------------------------
    // Configuration status checks
    // ----------------------------------------

    async isStripeConfigured(): Promise<boolean> {
        const secretKey = await this.getStripeSecretKey()
        const publishableKey = await this.getStripePublishableKey()
        return !!(secretKey && publishableKey)
    }

    async isEmailConfigured(): Promise<boolean> {
        const config = await this.getEmailConfig()
        if (!config) return false

        if (config.provider === 'resend') {
            const apiKey = await this.getResendApiKey()
            return !!apiKey
        }

        if (config.provider === 'smtp') {
            const password = await this.getSmtpPassword()
            return !!(config.smtpHost && config.smtpPort && password)
        }

        return false
    }

    // ----------------------------------------
    // Google API-specific methods
    // ----------------------------------------

    async getGoogleApiConfig(): Promise<GoogleApiConfig | null> {
        const cached = getCached<GoogleApiConfig>('google_api_config')
        if (cached) return cached

        const config = await this.getSetting<GoogleApiConfig>('google_api_config')

        if (config) {
            setCache('google_api_config', config)
        }

        return config
    }

    async setGoogleApiConfig(config: GoogleApiConfig, updatedBy?: string): Promise<void> {
        await this.setSetting('google_api_config', config, {
            category: 'google',
            description: 'Google API configuration',
            isPublic: false,
            updatedBy
        })
        invalidateCache('google')
    }

    async getGoogleApiKey(): Promise<string | null> {
        // Try database first
        const dbKey = await this.getEncryptedSetting('google_api_key')
        if (dbKey) return dbKey

        // Fallback to environment variable during migration
        return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || null
    }

    async setGoogleApiKey(apiKey: string, updatedBy?: string): Promise<void> {
        await this.setEncryptedSetting('google_api_key', apiKey, 'google', {
            description: 'Google API key for Places, Maps and Geocoding',
            updatedBy
        })
    }

    async isGoogleApiConfigured(): Promise<boolean> {
        const config = await this.getGoogleApiConfig()
        const apiKey = await this.getGoogleApiKey()
        return !!(config?.enabled && apiKey)
    }
}

// Export singleton instance
export const platformSettingsService = new PlatformSettingsService()

// Export the class for testing
export { PlatformSettingsService }
