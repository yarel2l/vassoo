/**
 * Stripe Service
 *
 * Provides dynamic Stripe configuration loaded from Platform Settings.
 * Falls back to environment variables during migration period.
 *
 * IMPORTANT: All functions are async as they may need to fetch from database.
 */

import Stripe from 'stripe'
import {
    platformSettingsService,
    type StripeConfig,
    type StripeConnectConfig
} from '@/lib/services/platform-settings-service'
import { feeCalculationService } from '@/lib/services/fee-calculation-service'

// ============================================
// Types
// ============================================

export interface StripeConnectCapabilities {
    card_payments: boolean
    transfers: boolean
}

// ============================================
// Cached Stripe instance
// ============================================

let cachedStripeInstance: Stripe | null = null
let cachedSecretKey: string | null = null

/**
 * Get a Stripe instance using credentials from Platform Settings
 * Falls back to environment variable if not configured in database
 */
export async function getStripeInstance(): Promise<Stripe> {
    const secretKey = await platformSettingsService.getStripeSecretKey()

    if (!secretKey) {
        throw new Error(
            'Stripe is not configured. Please configure Stripe credentials in Platform Settings.'
        )
    }

    // Return cached instance if key hasn't changed
    if (cachedStripeInstance && cachedSecretKey === secretKey) {
        return cachedStripeInstance
    }

    // Create new instance
    cachedStripeInstance = new Stripe(secretKey, {
        // @ts-expect-error - Using latest API version
        apiVersion: '2024-12-18.acacia',
        typescript: true,
    })
    cachedSecretKey = secretKey

    return cachedStripeInstance
}

/**
 * Get Stripe Connect configuration from Platform Settings
 * Used for onboarding stores and delivery companies
 */
export async function getStripeConnectConfig(): Promise<StripeConnectConfig> {
    const config = await platformSettingsService.getStripeConfig()

    if (!config?.connect?.enabled) {
        throw new Error(
            'Stripe Connect is not enabled. Please configure it in Platform Settings.'
        )
    }

    return config.connect
}

/**
 * Get Stripe publishable key from Platform Settings
 * Safe to expose to client
 */
export async function getStripePublishableKey(): Promise<string> {
    const key = await platformSettingsService.getStripePublishableKey()

    if (!key) {
        throw new Error(
            'Stripe publishable key is not configured. Please configure it in Platform Settings.'
        )
    }

    return key
}

/**
 * Get webhook secret from Platform Settings
 * Returns null if not configured (use for webhooks route where we handle missing config)
 */
export async function getStripeWebhookSecret(): Promise<string | null> {
    return platformSettingsService.getStripeWebhookSecret()
}

/**
 * Calculate platform fee based on order amount
 * Uses the platform_fees table configuration via feeCalculationService
 */
export async function calculatePlatformFee(amount: number): Promise<number> {
    const feeResult = await feeCalculationService.calculateFees(amount)
    return feeResult.marketplaceCommission
}

/**
 * Calculate platform fee in cents for Stripe API
 * Uses the platform_fees table configuration via feeCalculationService
 */
export async function calculatePlatformFeeInCents(amountInCents: number): Promise<number> {
    const amountInDollars = amountInCents / 100
    const feeResult = await feeCalculationService.calculateFees(amountInDollars)
    return Math.round(feeResult.marketplaceCommission * 100)
}

/**
 * Check if Stripe is properly configured
 */
export async function isStripeConfigured(): Promise<boolean> {
    return platformSettingsService.isStripeConfigured()
}

/**
 * Check if Stripe Connect is enabled
 */
export async function isStripeConnectEnabled(): Promise<boolean> {
    const config = await platformSettingsService.getStripeConfig()
    return config?.connect?.enabled ?? false
}

/**
 * Invalidate cached Stripe instance
 * Call this when settings are updated
 */
export function invalidateStripeCache(): void {
    cachedStripeInstance = null
    cachedSecretKey = null
}

// ============================================
// Legacy exports for backward compatibility
// These will be removed after full migration
// ============================================

/**
 * @deprecated Use getStripeInstance() instead
 * This is kept for backward compatibility during migration
 */
export const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        // @ts-expect-error - Using latest API version
        apiVersion: '2024-12-18.acacia',
        typescript: true,
    })
    : null

/**
 * @deprecated Use getStripeConnectConfig() instead
 * This is kept for backward compatibility during migration
 */
export const STRIPE_CONNECT_CONFIG = {
    accountType: 'express' as const,
    capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
    },
    businessTypes: ['individual', 'company'] as const,
}
