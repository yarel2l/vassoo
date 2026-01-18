'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { DriversMap, DriversMapStats } from '@/components/dashboard/drivers-map'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useGoogleApi } from '@/hooks/use-google-api'
import { ArrowLeft, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

// Track if we've already initiated loading the Google Maps script
let googleMapsLoadInitiated = false

interface Driver {
    id: string
    name: string
    phone?: string
    isAvailable: boolean
    isActive: boolean
    isOnDelivery: boolean
    vehicleType?: string
    vehicleMake?: string
    vehiclePlate?: string
    currentLocation?: {
        lat: number
        lng: number
    }
    lastLocationUpdate?: string
    currentDeliveries: number
    completedToday: number
    performanceScore: number
}

interface ActiveDelivery {
    id: string
    orderId: string
    orderNumber: string
    status: string
    driverId: string
    driverName: string
    pickupLocation: {
        lat: number
        lng: number
        address: string
    }
    deliveryLocation: {
        lat: number
        lng: number
        address: string
    }
    customerName: string
    estimatedTime?: number
}

export default function DriversMapPage() {
    const { tenants } = useAuth()
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [companyLocation, setCompanyLocation] = useState<{ lat: number; lng: number } | undefined>()
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)
    const [googleMapsError, setGoogleMapsError] = useState<string | null>(null)
    
    // Use the centralized Google API hook
    const { config: googleConfig, isLoading: isLoadingConfig, isConfigured } = useGoogleApi()

    const deliveryTenant = tenants.find(t => t.tenant.type === 'delivery_company')
    const tenantId = deliveryTenant?.tenant.id

    // Check if Google Maps is already loaded (or wait for it)
    useEffect(() => {
        // Wait for config to load
        if (isLoadingConfig) return
        
        // Check if not configured
        if (!isConfigured || !googleConfig?.apiKey) {
            setGoogleMapsError('Google Maps API is not configured. Please configure it in Platform Settings.')
            return
        }

        // Check if already loaded
        if (typeof window !== 'undefined' && window.google?.maps) {
            setGoogleMapsLoaded(true)
            return
        }

        // Check if script is already loading/loaded in DOM
        const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
        
        if (existingScript || googleMapsLoadInitiated) {
            // Script exists - wait for it to finish loading
            const checkLoaded = setInterval(() => {
                if (window.google?.maps) {
                    setGoogleMapsLoaded(true)
                    clearInterval(checkLoaded)
                }
            }, 200)
            
            // Timeout after 15 seconds
            const timeout = setTimeout(() => {
                clearInterval(checkLoaded)
                if (!window.google?.maps) {
                    setGoogleMapsError('Google Maps is taking too long to load. Please refresh the page.')
                }
            }, 15000)
            
            return () => {
                clearInterval(checkLoaded)
                clearTimeout(timeout)
            }
        }

        // No existing script - we need to load it
        googleMapsLoadInitiated = true

        // Use a unique callback name that persists
        const callbackName = '__googleMapsInitCallback__'
        
        // Set up the callback (only if not already defined)
        if (!(window as any)[callbackName]) {
            ;(window as any)[callbackName] = () => {
                setGoogleMapsLoaded(true)
                // Dispatch event for other components that might be waiting
                window.dispatchEvent(new Event('google-maps-loaded'))
            }
        }

        // Load the script using recommended async pattern
        const script = document.createElement('script')
        script.id = 'google-maps-script'
        // Include 'marker' library for AdvancedMarkerElement support
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleConfig.apiKey}&libraries=places,marker&loading=async&callback=${callbackName}`
        script.async = true
        
        script.onerror = () => {
            googleMapsLoadInitiated = false
            setGoogleMapsError('Failed to load Google Maps. Please check the API key configuration.')
        }

        document.head.appendChild(script)
        
        // Also listen for the custom event in case callback fires before our state updates
        const handleGoogleMapsLoaded = () => {
            setGoogleMapsLoaded(true)
        }
        window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded)
        
        return () => {
            window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded)
        }
    }, [isLoadingConfig, isConfigured, googleConfig?.apiKey])

    // Helper function for fetch with retry
    const fetchWithRetry = async <T,>(
        fn: () => Promise<{ data: T | null; error: any }>,
        maxRetries = 3,
        delay = 1000
    ): Promise<{ data: T | null; error: any }> => {
        let lastError: any = null
        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await fn()
                if (!result.error) return result
                lastError = result.error
                // Only retry on network errors
                if (!result.error?.message?.includes('Failed to fetch')) {
                    return result
                }
            } catch (err) {
                lastError = err
            }
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
            }
        }
        return { data: null, error: lastError }
    }

    const fetchData = useCallback(async () => {
        if (!tenantId) return

        try {
            setIsLoading(true)
            const supabase = createClient()

            // Get company ID and location from settings (with retry)
            const { data: company, error: companyError } = await fetchWithRetry(() =>
                supabase
                    .from('delivery_companies')
                    .select('id, settings')
                    .eq('tenant_id', tenantId)
                    .single()
            )

            if (companyError) {
                console.error('Error fetching company:', companyError)
                toast({
                    title: 'Connection Error',
                    description: 'Could not connect to the server. Please check your connection and try again.',
                    variant: 'destructive',
                })
                return
            }

            if (!company) return

            // Set company location if available in settings
            if (company.settings?.lat && company.settings?.lng) {
                setCompanyLocation({
                    lat: company.settings.lat,
                    lng: company.settings.lng,
                })
            }

            // Fetch drivers with current location (join with profiles for name)
            // Use ST_X and ST_Y to extract coordinates from geography
            const { data: driversData, error: driversError } = await (supabase
                .from('delivery_drivers' as any)
                .select(`
                    id,
                    user_id,
                    phone,
                    is_available,
                    is_active,
                    is_on_delivery,
                    vehicle_type,
                    vehicle_make,
                    vehicle_plate,
                    current_location,
                    updated_at,
                    total_deliveries,
                    average_rating,
                    profiles!inner(full_name)
                `)
                .eq('delivery_company_id', company.id)
                .eq('is_active', true) as any)

            console.log('[DriversMap] Drivers query result:', { 
                driversData, 
                driversError,
                companyId: company.id,
                driversCount: driversData?.length 
            })

            if (driversError) throw driversError

            // If we have drivers with location in WKB format, we need to fetch coordinates separately
            // Use RPC to get parsed locations
            let driverLocations: Record<string, { lat: number; lng: number }> = {}
            
            if (driversData && driversData.length > 0) {
                const driverIds = driversData.map((d: any) => d.id)
                
                try {
                    // Query to get coordinates using PostGIS functions
                    const { data: locData, error: locError } = await supabase.rpc('get_driver_locations', {
                        driver_ids: driverIds
                    })
                    
                    if (locError) {
                        console.warn('[DriversMap] RPC get_driver_locations failed:', locError)
                    } else if (locData) {
                        locData.forEach((loc: any) => {
                            driverLocations[loc.id] = { lat: loc.lat, lng: loc.lng }
                        })
                    }
                } catch (rpcErr) {
                    console.warn('[DriversMap] RPC call failed:', rpcErr)
                }
                
                console.log('[DriversMap] Driver locations from RPC:', driverLocations)
            }

            // Transform drivers data
            const transformedDrivers: Driver[] = (driversData || []).map((d: any) => {
                // First check if we have coordinates from RPC
                let currentLocation = driverLocations[d.id]
                
                // Fallback: try to parse from current_location field
                if (!currentLocation && d.current_location) {
                    console.log('[DriversMap] Raw current_location:', d.current_location, typeof d.current_location)
                    
                    // Parse PostGIS point format - handle various formats
                    if (typeof d.current_location === 'object') {
                        if (d.current_location.coordinates) {
                            // GeoJSON format: { type: "Point", coordinates: [lng, lat] }
                            currentLocation = {
                                lng: d.current_location.coordinates[0],
                                lat: d.current_location.coordinates[1],
                            }
                        } else if (d.current_location.lat !== undefined && d.current_location.lng !== undefined) {
                            // Direct object format: { lat, lng }
                            currentLocation = {
                                lat: d.current_location.lat,
                                lng: d.current_location.lng,
                            }
                        }
                    } else if (typeof d.current_location === 'string') {
                        // Parse POINT(lng lat) format - WKT format from PostGIS
                        const match = d.current_location.match(/POINT\s*\(\s*([^\s]+)\s+([^\s)]+)\s*\)/)
                        if (match) {
                            currentLocation = {
                                lng: parseFloat(match[1]),
                                lat: parseFloat(match[2]),
                            }
                        }
                        // Note: WKB hex format cannot be parsed in JS, need RPC
                    }
                    
                    console.log('[DriversMap] Parsed location:', currentLocation)
                }

                return {
                    id: d.id,
                    name: d.profiles?.full_name || 'Unknown Driver',
                    phone: d.phone,
                    isAvailable: d.is_available,
                    isActive: d.is_active,
                    isOnDelivery: d.is_on_delivery,
                    vehicleType: d.vehicle_type,
                    vehicleMake: d.vehicle_make,
                    vehiclePlate: d.vehicle_plate,
                    currentLocation,
                    lastLocationUpdate: d.updated_at,
                    currentDeliveries: 0, // Will be calculated from deliveries
                    completedToday: d.total_deliveries || 0,
                    performanceScore: d.average_rating || 1.0,
                }
            })
            
            console.log('[DriversMap] Transformed drivers:', transformedDrivers.map(d => ({
                name: d.name,
                isAvailable: d.isAvailable,
                hasLocation: !!d.currentLocation,
                location: d.currentLocation
            })))

            // Fetch active deliveries (join with delivery_drivers -> profiles for driver name)
            const { data: deliveriesData, error: deliveriesError } = await (supabase
                .from('deliveries' as any)
                .select(`
                    id,
                    order_id,
                    status,
                    driver_id,
                    pickup_location,
                    pickup_address,
                    dropoff_location,
                    dropoff_address,
                    delivery_drivers!inner(user_id, profiles!inner(full_name)),
                    orders!inner(order_number, guest_name, profiles(full_name))
                `)
                .eq('delivery_company_id', company.id)
                .in('status', ['assigned', 'picked_up', 'in_transit']) as any)

            if (!deliveriesError && deliveriesData) {
                const activeDeliveriesTransformed: ActiveDelivery[] = deliveriesData.map((d: any) => {
                    let pickupLocation = { lat: 0, lng: 0 }
                    let dropoffLocation = { lat: 0, lng: 0 }

                    // Parse locations
                    if (d.pickup_location?.coordinates) {
                        pickupLocation = {
                            lng: d.pickup_location.coordinates[0],
                            lat: d.pickup_location.coordinates[1],
                        }
                    }
                    if (d.dropoff_location?.coordinates) {
                        dropoffLocation = {
                            lng: d.dropoff_location.coordinates[0],
                            lat: d.dropoff_location.coordinates[1],
                        }
                    }

                    // Parse address from JSONB
                    const pickupAddr = typeof d.pickup_address === 'object' ? d.pickup_address?.address || '' : d.pickup_address || ''
                    const dropoffAddr = typeof d.dropoff_address === 'object' ? d.dropoff_address?.address || '' : d.dropoff_address || ''

                    return {
                        id: d.id,
                        orderId: d.order_id,
                        orderNumber: d.orders?.order_number || 'Unknown',
                        status: d.status,
                        driverId: d.driver_id,
                        driverName: d.delivery_drivers?.profiles?.full_name || 'Unknown',
                        pickupLocation: {
                            ...pickupLocation,
                            address: pickupAddr,
                        },
                        deliveryLocation: {
                            ...dropoffLocation,
                            address: dropoffAddr,
                        },
                        customerName: d.orders?.guest_name || d.orders?.profiles?.full_name || 'Unknown',
                    }
                })

                setActiveDeliveries(activeDeliveriesTransformed)

                // Update driver's current deliveries count
                const driverDeliveryCounts: Record<string, number> = {}
                activeDeliveriesTransformed.forEach(d => {
                    driverDeliveryCounts[d.driverId] = (driverDeliveryCounts[d.driverId] || 0) + 1
                })

                setDrivers(transformedDrivers.map(driver => ({
                    ...driver,
                    currentDeliveries: driverDeliveryCounts[driver.id] || 0,
                })))
            } else {
                setDrivers(transformedDrivers)
            }

        } catch (err) {
            console.error('Error fetching map data:', err)
            toast({
                title: 'Error',
                description: 'Failed to load map data',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    // Initial fetch and auto-refresh
    useEffect(() => {
        fetchData()
        // Auto-refresh every 30 seconds as fallback
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [fetchData])

    // Real-time subscription for driver location updates
    useEffect(() => {
        if (!tenantId) return

        const supabase = createClient()
        
        // Subscribe to driver location updates
        const driverChannel = supabase
            .channel('driver-locations')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'delivery_drivers',
                },
                (payload) => {
                    console.log('[Realtime] Driver location update:', payload)
                    // Refresh data when a driver's location changes
                    fetchData()
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] Driver channel status:', status)
            })

        // Subscribe to delivery status changes
        const deliveryChannel = supabase
            .channel('delivery-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'deliveries',
                },
                (payload) => {
                    console.log('[Realtime] Delivery update:', payload)
                    fetchData()
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] Delivery channel status:', status)
            })

        return () => {
            supabase.removeChannel(driverChannel)
            supabase.removeChannel(deliveryChannel)
        }
    }, [tenantId, fetchData])

    if (!tenantId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-gray-400">No delivery company found</p>
            </div>
        )
    }

    if (googleMapsError) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/delivery/drivers">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Live Drivers Map</h1>
                        <p className="text-gray-400 mt-1">Real-time view of all active drivers and deliveries</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-900 rounded-lg border border-gray-800">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                    <p className="text-gray-300 text-center max-w-md">{googleMapsError}</p>
                    <Link href="/dashboard/platform/settings" className="mt-4">
                        <Button variant="outline" className="border-gray-700">
                            Go to Platform Settings
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    if (!googleMapsLoaded) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/delivery/drivers">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Live Drivers Map</h1>
                        <p className="text-gray-400 mt-1">Real-time view of all active drivers and deliveries</p>
                    </div>
                </div>
                <div className="flex items-center justify-center min-h-[400px] bg-gray-900 rounded-lg border border-gray-800">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-gray-400">Loading Google Maps...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/delivery/drivers">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Live Drivers Map</h1>
                        <p className="text-gray-400 mt-1">Real-time view of all active drivers and deliveries</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="border-gray-800 text-gray-300 hover:bg-gray-800"
                    onClick={() => fetchData()}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                </Button>
            </div>

            {/* Summary Stats */}
            <DriversMapStats drivers={drivers} deliveries={activeDeliveries} />

            {/* Map Component */}
            <DriversMap
                drivers={drivers}
                activeDeliveries={activeDeliveries}
                companyLocation={companyLocation}
                onDriverClick={(driver) => {
                    toast({
                        title: driver.name,
                        description: `${driver.currentDeliveries} active deliveries • ${driver.isAvailable ? 'Available' : 'Busy'}`,
                    })
                }}
                onDeliveryClick={(delivery) => {
                    toast({
                        title: `Order ${delivery.orderNumber}`,
                        description: `${delivery.status} • Driver: ${delivery.driverName}`,
                    })
                }}
                onRefresh={fetchData}
                isLoading={isLoading}
            />
        </div>
    )
}
