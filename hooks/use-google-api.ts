'use client'

import { useState, useEffect, useCallback } from 'react'

interface GoogleApiConfig {
    enabled: boolean
    apiKey: string | null
    services: {
        places: boolean
        maps: boolean
        geocoding: boolean
    }
}

interface UseGoogleApiReturn {
    config: GoogleApiConfig | null
    isLoading: boolean
    error: string | null
    isConfigured: boolean
    refetch: () => void
}

// Cache the config in memory to avoid repeated API calls
let cachedConfig: GoogleApiConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useGoogleApi(): UseGoogleApiReturn {
    const [config, setConfig] = useState<GoogleApiConfig | null>(cachedConfig)
    const [isLoading, setIsLoading] = useState(!cachedConfig || Date.now() - cacheTimestamp > CACHE_TTL)
    const [error, setError] = useState<string | null>(null)

    const fetchConfig = useCallback(async () => {
        // Check if cache is still valid
        if (cachedConfig && Date.now() - cacheTimestamp < CACHE_TTL) {
            setConfig(cachedConfig)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/platform/settings/google/public')
            const data = await response.json()

            if (response.ok) {
                cachedConfig = data
                cacheTimestamp = Date.now()
                setConfig(data)
            } else {
                setError(data.error || 'Failed to load Google API configuration')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load configuration')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchConfig()
    }, [fetchConfig])

    return {
        config,
        isLoading,
        error,
        isConfigured: config?.enabled && !!config?.apiKey,
        refetch: fetchConfig
    }
}

/**
 * Invalidate the cached Google API configuration
 * Call this after updating settings to force a refresh
 */
export function invalidateGoogleApiCache(): void {
    cachedConfig = null
    cacheTimestamp = 0
}
