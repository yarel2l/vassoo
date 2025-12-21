"use client"

import { useState, useEffect } from "react"

interface LocationData {
  latitude: number
  longitude: number
  city?: string
  state?: string
  country?: string
  countryCode?: string
  timezone?: string
}

interface GeolocationState {
  location: LocationData | null
  loading: boolean
  error: string | null
  hasPermission: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: true,
    error: null,
    hasPermission: false,
  })

  const requestLocation = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocation is not supported by this browser",
      }))
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        })
      })

      const { latitude, longitude } = position.coords

      // Get location details from reverse geocoding
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        )
        const locationData = await response.json()

        const location: LocationData = {
          latitude,
          longitude,
          city: locationData.city || locationData.locality,
          state: locationData.principalSubdivision,
          country: locationData.countryName,
          countryCode: locationData.countryCode,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }

        setState({
          location,
          loading: false,
          error: null,
          hasPermission: true,
        })

        // Store in localStorage for future use
        localStorage.setItem("userLocation", JSON.stringify(location))
      } catch (geocodeError) {
        // If reverse geocoding fails, still store basic coordinates
        const location: LocationData = {
          latitude,
          longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }

        setState({
          location,
          loading: false,
          error: null,
          hasPermission: true,
        })

        localStorage.setItem("userLocation", JSON.stringify(location))
      }
    } catch (error) {
      let errorMessage = "Unable to retrieve location"

      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user"
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable"
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out"
            break
        }
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
    }
  }

  useEffect(() => {
    // Check if location is already stored
    const storedLocation = localStorage.getItem("userLocation")
    if (storedLocation) {
      try {
        const location = JSON.parse(storedLocation)
        setState({
          location,
          loading: false,
          error: null,
          hasPermission: true,
        })
        return
      } catch {
        // Invalid stored data, continue with fresh request
      }
    }

    // Auto-request location on mount
    requestLocation()
  }, [])

  return {
    ...state,
    requestLocation,
    clearLocation: () => {
      localStorage.removeItem("userLocation")
      setState({
        location: null,
        loading: false,
        error: null,
        hasPermission: false,
      })
    },
  }
}
