'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

interface Coordinates {
    latitude: number
    longitude: number
}

interface LocationContextType {
    location: Coordinates | null
    address: string | null
    isLoading: boolean
    error: string | null
    permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown'
    requestLocation: () => Promise<void>
    setManualAddress: (address: string, coords: Coordinates) => void
    clearLocation: () => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

const STORAGE_KEY = 'vassoo_user_location'

export function LocationProvider({ children }: { children: ReactNode }) {
    const [location, setLocation] = useState<Coordinates | null>(null)
    const [address, setAddress] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown')

    // Load saved location from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                setLocation(parsed.location)
                setAddress(parsed.address)
            }
        } catch {
            // Ignore localStorage errors
        }
    }, [])

    // Check permission status
    useEffect(() => {
        if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied')
                result.onchange = () => {
                    setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied')
                }
            }).catch(() => {
                setPermissionStatus('unknown')
            })
        }
    }, [])

    // Reverse geocode coordinates to address
    const reverseGeocode = useCallback(async (coords: Coordinates): Promise<string> => {
        // Using OpenStreetMap Nominatim (free, no API key required)
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=16`
            )
            const data = await response.json()

            if (data.address) {
                const parts = []
                if (data.address.house_number) parts.push(data.address.house_number)
                if (data.address.road) parts.push(data.address.road)
                if (data.address.city || data.address.town || data.address.village) {
                    parts.push(data.address.city || data.address.town || data.address.village)
                }
                if (data.address.state) parts.push(data.address.state)
                if (data.address.postcode) parts.push(data.address.postcode)
                return parts.join(', ') || data.display_name
            }
            return data.display_name || 'Unknown location'
        } catch {
            return 'Unknown location'
        }
    }, [])

    const requestLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000, // 5 minutes
                })
            })

            const coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            }

            setLocation(coords)
            setPermissionStatus('granted')

            // Get address
            const addr = await reverseGeocode(coords)
            setAddress(addr)

            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ location: coords, address: addr }))

        } catch (err: any) {
            if (err.code === 1) {
                setPermissionStatus('denied')
                setError('Location access denied. Please enable location services.')
            } else if (err.code === 2) {
                setError('Unable to determine your location')
            } else if (err.code === 3) {
                setError('Location request timed out')
            } else {
                setError('Failed to get location')
            }
        } finally {
            setIsLoading(false)
        }
    }, [reverseGeocode])

    const setManualAddress = useCallback((addr: string, coords: Coordinates) => {
        setLocation(coords)
        setAddress(addr)
        setError(null)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ location: coords, address: addr }))
    }, [])

    const clearLocation = useCallback(() => {
        setLocation(null)
        setAddress(null)
        localStorage.removeItem(STORAGE_KEY)
    }, [])

    return (
        <LocationContext.Provider
            value={{
                location,
                address,
                isLoading,
                error,
                permissionStatus,
                requestLocation,
                setManualAddress,
                clearLocation,
            }}
        >
            {children}
        </LocationContext.Provider>
    )
}

export function useLocation() {
    const context = useContext(LocationContext)
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider')
    }
    return context
}
