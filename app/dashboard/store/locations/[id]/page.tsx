'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { LocationForm } from '../components/location-form'
import { BusinessHours, defaultBusinessHours } from '../components/business-hours-editor'
import { Loader2, MapPin, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StoreLocation {
    id: string
    store_id: string
    name: string
    address_line1: string
    address_line2?: string
    city: string
    state: string
    zip_code: string
    country: string
    phone?: string
    coordinates?: { lat: number; lng: number }
    business_hours: BusinessHours
    timezone: string
    is_pickup_available: boolean
    is_delivery_available: boolean
    coverage_radius_miles: number
    is_active: boolean
    is_primary: boolean
}

export default function EditLocationPage() {
    const params = useParams()
    const router = useRouter()
    const locationId = params.id as string

    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [storeId, setStoreId] = useState<string | null>(null)
    const [location, setLocation] = useState<StoreLocation | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const tenantId = currentStore?.id

    const fetchData = useCallback(async () => {
        if (!tenantId || !locationId) {
            setIsLoading(false)
            return
        }

        try {
            const supabase = createClient()

            // Get store for this tenant
            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (!stores || stores.length === 0) {
                setError('Store not found')
                setIsLoading(false)
                return
            }

            setStoreId(stores[0].id)

            // Fetch the location
            const { data: locationData, error: locationError } = await supabase
                .from('store_locations')
                .select('*')
                .eq('id', locationId)
                .eq('store_id', stores[0].id)
                .single()

            if (locationError || !locationData) {
                setError('Location not found')
                setIsLoading(false)
                return
            }

            // Parse coordinates if stored as geography
            let coordinates: { lat: number; lng: number } | undefined

            // If coordinates exist, try to parse them
            // PostGIS stores as geography but returns as object or string
            if (locationData.coordinates) {
                // If it's already an object with lat/lng
                if (typeof locationData.coordinates === 'object' && 'lat' in locationData.coordinates) {
                    coordinates = locationData.coordinates as { lat: number; lng: number }
                }
                // If we need to extract from PostGIS string format "POINT(lng lat)"
                else if (typeof locationData.coordinates === 'string') {
                    const match = locationData.coordinates.match(/POINT\(([^ ]+) ([^)]+)\)/)
                    if (match) {
                        coordinates = {
                            lng: parseFloat(match[1]),
                            lat: parseFloat(match[2]),
                        }
                    }
                }
            }

            const transformedLocation: StoreLocation = {
                id: locationData.id,
                store_id: locationData.store_id,
                name: locationData.name,
                address_line1: locationData.address_line1 || '',
                address_line2: locationData.address_line2 || '',
                city: locationData.city || '',
                state: locationData.state || '',
                zip_code: locationData.zip_code || '',
                country: locationData.country || 'US',
                phone: (locationData as Record<string, unknown>).phone as string | undefined,
                coordinates,
                business_hours: (locationData.business_hours as unknown as BusinessHours) || defaultBusinessHours,
                timezone: locationData.timezone || 'America/New_York',
                is_pickup_available: locationData.is_pickup_available ?? true,
                is_delivery_available: locationData.is_delivery_available ?? true,
                coverage_radius_miles: locationData.coverage_radius_miles || 10,
                is_active: locationData.is_active ?? true,
                is_primary: locationData.is_primary ?? false,
            }

            setLocation(transformedLocation)
        } catch (err) {
            console.error('Error fetching location:', err)
            setError('Failed to load location')
        } finally {
            setIsLoading(false)
        }
    }, [tenantId, locationId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading location...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                    <h3 className="text-lg font-medium text-white mb-2">{error}</h3>
                    <p className="text-gray-400 mb-4">The location could not be found or loaded.</p>
                    <Button
                        onClick={() => router.push('/dashboard/store/locations')}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        Back to Locations
                    </Button>
                </div>
            </div>
        )
    }

    if (!storeId || !location) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No store found</h3>
                    <p className="text-gray-400">Please select a store from the sidebar</p>
                </div>
            </div>
        )
    }

    return <LocationForm location={location} storeId={storeId} mode="edit" />
}
