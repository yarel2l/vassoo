'use client'

import { useState, useEffect, useMemo } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'

interface StripePublicConfig {
    publishableKey: string
    mode: 'test' | 'live'
    isConfigured: boolean
}

interface UseStripeConfigResult {
    publishableKey: string | null
    mode: 'test' | 'live'
    isConfigured: boolean
    isLoading: boolean
    error: string | null
    stripePromise: Promise<Stripe | null> | null
    refresh: () => void
}

/**
 * Hook to get Stripe publishable key from Platform Settings
 *
 * This fetches the publishable key from the API endpoint which reads
 * from Platform Settings (database). Falls back to env var if not configured.
 *
 * Usage:
 * ```tsx
 * const { stripePromise, isLoading, isConfigured } = useStripeConfig()
 *
 * if (!isConfigured) {
 *   return <div>Payment processing is not available</div>
 * }
 *
 * return (
 *   <Elements stripe={stripePromise}>
 *     <CheckoutForm />
 *   </Elements>
 * )
 * ```
 */
export function useStripeConfig(): UseStripeConfigResult {
    const [config, setConfig] = useState<StripePublicConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        let isMounted = true

        async function fetchConfig() {
            setIsLoading(true)
            setError(null)

            try {
                const response = await fetch('/api/platform/settings/stripe/public')
                const data = await response.json()

                if (isMounted) {
                    setConfig({
                        publishableKey: data.publishableKey || '',
                        mode: data.mode || 'test',
                        isConfigured: data.isConfigured || false
                    })
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load Stripe configuration')
                    setConfig({
                        publishableKey: '',
                        mode: 'test',
                        isConfigured: false
                    })
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        fetchConfig()

        return () => {
            isMounted = false
        }
    }, [refreshKey])

    // Memoize stripePromise to avoid recreating on every render
    const stripePromise = useMemo(() => {
        if (!config?.publishableKey) {
            return null
        }
        return loadStripe(config.publishableKey)
    }, [config?.publishableKey])

    const refresh = () => {
        setRefreshKey(prev => prev + 1)
    }

    return {
        publishableKey: config?.publishableKey || null,
        mode: config?.mode || 'test',
        isConfigured: config?.isConfigured || false,
        isLoading,
        error,
        stripePromise,
        refresh
    }
}

/**
 * Simple hook to just check if Stripe is configured
 */
export function useIsStripeConfigured(): { isConfigured: boolean; isLoading: boolean } {
    const { isConfigured, isLoading } = useStripeConfig()
    return { isConfigured, isLoading }
}
