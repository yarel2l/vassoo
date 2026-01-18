'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LocationState {
    latitude: number
    longitude: number
    accuracy: number
    heading: number | null
    speed: number | null
    timestamp: number
}

interface UseDriverLocationOptions {
    enableTracking?: boolean
    updateInterval?: number // Minimum time between updates in ms
    minDistanceChange?: number // Minimum distance in meters before sending update
    highAccuracy?: boolean // Use high accuracy GPS (drains more battery)
    timeout?: number // Geolocation timeout in ms
    maxRetries?: number // Max retries on timeout
}

interface UseDriverLocationReturn {
    currentLocation: LocationState | null
    isTracking: boolean
    error: string | null
    permissionStatus: 'unknown' | 'granted' | 'denied' | 'prompt'
    startTracking: () => void
    stopTracking: () => void
    lastUpdateTime: Date | null
    requestPermission: () => Promise<boolean>
}

// Calculate distance between two points using Haversine formula
function calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c // Distance in meters
}

export function useDriverLocation(
    driverId: string | null,
    options: UseDriverLocationOptions = {}
): UseDriverLocationReturn {
    const {
        enableTracking = false,
        updateInterval = 5000, // 5 seconds
        minDistanceChange = 10, // 10 meters
        highAccuracy = true,
        timeout = 30000, // 30 seconds (more lenient for simulators)
        maxRetries = 3,
    } = options

    const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null)
    const [isTracking, setIsTracking] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
    const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown')
    
    const watchIdRef = useRef<number | null>(null)
    const lastSentLocationRef = useRef<LocationState | null>(null)
    const lastUpdateTimeRef = useRef<number>(0)
    const retryCountRef = useRef<number>(0)
    const supabaseRef = useRef(createClient())

    // Check permission status
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt')
                result.onchange = () => {
                    setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt')
                }
            }).catch(() => {
                // Some browsers don't support permissions query
                setPermissionStatus('unknown')
            })
        }
    }, [])

    // Request permission explicitly
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser')
            return false
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                () => {
                    setPermissionStatus('granted')
                    setError(null)
                    resolve(true)
                },
                (err) => {
                    if (err.code === err.PERMISSION_DENIED) {
                        setPermissionStatus('denied')
                        setError('Location permission denied')
                    }
                    resolve(false)
                },
                { enableHighAccuracy: false, timeout: 10000 }
            )
        })
    }, [])

    // Send location update to server
    const sendLocationUpdate = useCallback(async (location: LocationState) => {
        if (!driverId) {
            console.log('[DriverLocation] No driverId, skipping update')
            return
        }

        const now = Date.now()
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current
        const isFirstUpdate = lastSentLocationRef.current === null

        console.log('[DriverLocation] sendLocationUpdate called:', {
            isFirstUpdate,
            timeSinceLastUpdate,
            updateInterval,
            location: { lat: location.latitude, lng: location.longitude }
        })

        // Always send the first update immediately
        if (!isFirstUpdate) {
            // Check if enough time has passed
            if (timeSinceLastUpdate < updateInterval) {
                console.log('[DriverLocation] Skipping - not enough time passed')
                return
            }

            // Check if we've moved enough
            const distance = calculateDistance(
                lastSentLocationRef.current!.latitude,
                lastSentLocationRef.current!.longitude,
                location.latitude,
                location.longitude
            )
            if (distance < minDistanceChange) {
                console.log('[DriverLocation] Skipping - not enough distance:', distance)
                return
            }
        }

        try {
            // Try using RPC function first (handles geography conversion properly)
            const { data: rpcResult, error: rpcError } = await supabaseRef.current
                .rpc('update_driver_location', {
                    p_user_id: driverId,
                    p_longitude: location.longitude,
                    p_latitude: location.latitude,
                    p_heading: location.heading,
                })
            
            if (rpcError) {
                console.warn('[DriverLocation] RPC failed, trying direct update:', rpcError)
                
                // Fallback to direct update with EWKT format
                const { error: updateError } = await supabaseRef.current
                    .from('delivery_drivers')
                    .update({
                        current_location: `SRID=4326;POINT(${location.longitude} ${location.latitude})`,
                        current_heading: location.heading,
                        last_location_update: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', driverId)

                if (updateError) {
                    console.error('[DriverLocation] Direct update also failed:', updateError)
                    return
                }
            } else {
                console.log('[DriverLocation] RPC result:', rpcResult)
                if (!rpcResult?.success) {
                    console.error('[DriverLocation] RPC returned error:', rpcResult?.error)
                    return
                }
            }

            lastSentLocationRef.current = location
            lastUpdateTimeRef.current = now
            setLastUpdateTime(new Date())
            
            console.log('[DriverLocation] Location updated successfully:', {
                lat: location.latitude,
                lng: location.longitude,
                heading: location.heading,
            })
        } catch (err) {
            console.error('[DriverLocation] Failed to send update:', err)
        }
    }, [driverId, updateInterval, minDistanceChange])

    // Handle position update from geolocation
    const handlePositionUpdate = useCallback((position: GeolocationPosition) => {
        console.log('[DriverLocation] handlePositionUpdate received:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
        })
        
        const newLocation: LocationState = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
        }

        setCurrentLocation(newLocation)
        setError(null)
        // Reset retry counter on successful position
        retryCountRef.current = 0

        // Send to server
        sendLocationUpdate(newLocation)
    }, [sendLocationUpdate])

    // Handle geolocation error
    const handlePositionError = useCallback((err: GeolocationPositionError) => {
        let errorMessage = 'Unknown error'
        let shouldRetry = false

        switch (err.code) {
            case err.PERMISSION_DENIED:
                errorMessage = 'Location permission denied. Please enable location services in your device settings.'
                setPermissionStatus('denied')
                break
            case err.POSITION_UNAVAILABLE:
                errorMessage = 'GPS signal not available. Make sure location services are enabled.'
                shouldRetry = true
                break
            case err.TIMEOUT:
                shouldRetry = true
                if (retryCountRef.current < maxRetries) {
                    retryCountRef.current++
                    console.log(`[DriverLocation] Timeout, retry ${retryCountRef.current}/${maxRetries}`)
                    // Don't show error on retry, just log it
                    return
                }
                errorMessage = 'Could not get location. Please check your GPS settings and try again.'
                break
        }

        setError(errorMessage)
        console.warn('[DriverLocation] Geolocation error:', errorMessage, { code: err.code, shouldRetry })

        // If we should retry and haven't exceeded max retries, try again with lower accuracy
        if (shouldRetry && retryCountRef.current < maxRetries) {
            retryCountRef.current++
            setTimeout(() => {
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current)
                }
                // Try with lower accuracy settings
                watchIdRef.current = navigator.geolocation.watchPosition(
                    handlePositionUpdate,
                    handlePositionError,
                    {
                        enableHighAccuracy: false, // Lower accuracy on retry
                        timeout: timeout * 2, // Double timeout on retry
                        maximumAge: 30000, // Accept cached position up to 30 seconds old
                    }
                )
            }, 1000)
        }
    }, [handlePositionUpdate, maxRetries, timeout])

    // Start tracking
    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser')
            return
        }

        if (watchIdRef.current !== null) {
            return // Already tracking
        }

        // Reset retry counter
        retryCountRef.current = 0
        
        setIsTracking(true)
        setError(null)

        console.log('[DriverLocation] Starting tracking with options:', { highAccuracy, timeout })

        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(
            handlePositionUpdate,
            handlePositionError,
            {
                enableHighAccuracy: highAccuracy,
                timeout: timeout,
                maximumAge: 5000, // Accept positions up to 5 seconds old
            }
        )

        console.log('[DriverLocation] Started tracking')
    }, [handlePositionUpdate, handlePositionError, highAccuracy, timeout])

    // Stop tracking
    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
        setIsTracking(false)
        retryCountRef.current = 0
        console.log('[DriverLocation] Stopped tracking')
    }, [])

    // Auto-start tracking if enabled
    useEffect(() => {
        console.log('[DriverLocation] Auto-start effect:', { enableTracking, driverId, hasDriverId: !!driverId })
        
        if (enableTracking && driverId) {
            console.log('[DriverLocation] Starting tracking...')
            startTracking()
        } else {
            console.log('[DriverLocation] Not starting tracking:', { reason: !enableTracking ? 'tracking disabled' : 'no driverId' })
            stopTracking()
        }

        return () => {
            stopTracking()
        }
    }, [enableTracking, driverId, startTracking, stopTracking])

    return {
        currentLocation,
        isTracking,
        error,
        startTracking,
        stopTracking,
        lastUpdateTime,
        permissionStatus,
        requestPermission,
    }
}
