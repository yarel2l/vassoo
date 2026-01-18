'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { 
    Navigation2,
    Phone,
    MapPin,
    Store,
    Truck,
    RefreshCw,
    Layers,
    Target,
    AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'
import { useGoogleApi } from '@/hooks/use-google-api'

// Track if we've already initiated loading the Google Maps script
let googleMapsLoadInitiated = false

// Declare google maps types
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        google?: any
    }
}

interface Delivery {
    id: string
    status: string
    pickup_address: string
    delivery_address: string
    pickup_lat?: number
    pickup_lng?: number
    delivery_lat?: number
    delivery_lng?: number
    customer_name: string
    store_name: string
    order_number?: string
}

export default function DriverMapPage() {
    const { user } = useAuth()
    const [deliveries, setDeliveries] = useState<Delivery[]>([])
    const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [googleMapsError, setGoogleMapsError] = useState<string | null>(null)
    const mapRef = useRef<HTMLDivElement>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef = useRef<any[]>([])
    const supabase = createClient()
    
    // Use centralized Google API config
    const { config: googleConfig, isLoading: isLoadingConfig, isConfigured } = useGoogleApi()

    // Get current location
    useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setCurrentLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    })
                },
                (error) => {
                    console.error('Error getting location:', error)
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            )

            return () => navigator.geolocation.clearWatch(watchId)
        }
    }, [])

    // Fetch deliveries
    const fetchDeliveries = useCallback(async () => {
        if (!user) return

        try {
            const { data, error } = await supabase
                .from('deliveries')
                .select(`
                    *,
                    orders (
                        order_number,
                        store:stores(name),
                        customer:profiles(full_name)
                    )
                `)
                .eq('driver_id', user.id)
                .in('status', ['assigned', 'picked_up', 'in_transit'])

            if (error) throw error

            const formatted = (data || []).map(d => ({
                id: d.id,
                status: d.status,
                pickup_address: d.pickup_address || '',
                delivery_address: d.delivery_address || '',
                pickup_lat: d.pickup_lat,
                pickup_lng: d.pickup_lng,
                delivery_lat: d.delivery_lat,
                delivery_lng: d.delivery_lng,
                customer_name: d.orders?.customer?.full_name || 'Customer',
                store_name: d.orders?.store?.name || 'Store',
                order_number: d.orders?.order_number,
            }))

            setDeliveries(formatted)
            if (formatted.length > 0 && !selectedDelivery) {
                setSelectedDelivery(formatted[0])
            }
        } catch (error) {
            console.error('Error fetching deliveries:', error)
        } finally {
            setIsLoading(false)
        }
    }, [user, selectedDelivery, supabase])

    useEffect(() => {
        fetchDeliveries()
    }, [fetchDeliveries])

    // Load Google Maps with centralized API key
    useEffect(() => {
        // Wait for config to load
        if (isLoadingConfig) return
        
        // Check if not configured
        if (!isConfigured || !googleConfig?.apiKey) {
            setGoogleMapsError('Google Maps API is not configured. Please contact support.')
            return
        }

        // Check if already loaded
        if (typeof window !== 'undefined' && window.google?.maps) {
            setMapLoaded(true)
            return
        }

        // Check if script is already loading/loaded in DOM
        const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
        
        if (existingScript || googleMapsLoadInitiated) {
            // Script exists - wait for it to finish loading
            const checkLoaded = setInterval(() => {
                if (window.google?.maps) {
                    setMapLoaded(true)
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
                setMapLoaded(true)
                // Dispatch event for other components that might be waiting
                window.dispatchEvent(new Event('google-maps-loaded'))
            }
        }

        // Load the script using recommended async pattern
        const script = document.createElement('script')
        script.id = 'google-maps-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${googleConfig.apiKey}&libraries=places,marker&loading=async&callback=${callbackName}`
        script.async = true
        
        script.onerror = () => {
            googleMapsLoadInitiated = false
            setGoogleMapsError('Failed to load Google Maps. Please check your connection.')
        }

        document.head.appendChild(script)
        
        // Also listen for the custom event in case callback fires before our state updates
        const handleGoogleMapsLoaded = () => {
            setMapLoaded(true)
        }
        window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded)
        
        return () => {
            window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded)
        }
    }, [isLoadingConfig, isConfigured, googleConfig?.apiKey])

    // Initialize map
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return

        const defaultCenter = currentLocation || { lat: 40.7128, lng: -74.0060 }

        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 14,
            styles: [
                { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                {
                    featureType: 'road',
                    elementType: 'geometry',
                    stylers: [{ color: '#2d2d44' }],
                },
                {
                    featureType: 'road',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#8a8a8a' }],
                },
                {
                    featureType: 'water',
                    elementType: 'geometry',
                    stylers: [{ color: '#0e1626' }],
                },
            ],
            disableDefaultUI: true,
            zoomControl: true,
        })
    }, [mapLoaded, currentLocation])

    // Update markers
    useEffect(() => {
        if (!mapInstanceRef.current || !mapLoaded) return

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null))
        markersRef.current = []

        // Add current location marker
        if (currentLocation) {
            const driverMarker = new window.google.maps.Marker({
                position: currentLocation,
                map: mapInstanceRef.current,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#3b82f6',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                },
                title: 'Your Location',
            })
            markersRef.current.push(driverMarker)

            // Center on current location
            mapInstanceRef.current.setCenter(currentLocation)
        }

        // Add delivery markers
        deliveries.forEach(delivery => {
            // Pickup marker
            if (delivery.pickup_lat && delivery.pickup_lng) {
                const pickupMarker = new window.google.maps.Marker({
                    position: { lat: delivery.pickup_lat, lng: delivery.pickup_lng },
                    map: mapInstanceRef.current!,
                    icon: {
                        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                        scale: 6,
                        fillColor: '#f59e0b',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                    title: `Pickup: ${delivery.store_name}`,
                })
                pickupMarker.addListener('click', () => setSelectedDelivery(delivery))
                markersRef.current.push(pickupMarker)
            }

            // Delivery marker
            if (delivery.delivery_lat && delivery.delivery_lng) {
                const deliveryMarker = new window.google.maps.Marker({
                    position: { lat: delivery.delivery_lat, lng: delivery.delivery_lng },
                    map: mapInstanceRef.current!,
                    icon: {
                        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                        scale: 6,
                        fillColor: '#22c55e',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                    title: `Deliver: ${delivery.customer_name}`,
                })
                deliveryMarker.addListener('click', () => setSelectedDelivery(delivery))
                markersRef.current.push(deliveryMarker)
            }
        })
    }, [deliveries, currentLocation, mapLoaded])

    const centerOnLocation = () => {
        if (currentLocation && mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(currentLocation)
            mapInstanceRef.current.setZoom(16)
        }
    }

    const getNavigationUrl = () => {
        if (!selectedDelivery) return '#'
        const destination = selectedDelivery.status === 'assigned'
            ? selectedDelivery.pickup_address
            : selectedDelivery.delivery_address
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    }

    return (
        <div className="h-[calc(100vh-140px)] relative">
            {/* Map Container */}
            <div ref={mapRef} className="absolute inset-0" />

            {/* Loading Overlay */}
            {(isLoading || (!mapLoaded && !googleMapsError)) && (
                <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                </div>
            )}
            
            {/* Google Maps Error */}
            {googleMapsError && (
                <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
                    <div className="text-center p-6 max-w-sm">
                        <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                        <p className="text-white font-medium mb-2">Map unavailable</p>
                        <p className="text-sm text-gray-400">{googleMapsError}</p>
                        <Button
                            variant="outline"
                            className="mt-4 border-gray-700"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                        </Button>
                    </div>
                </div>
            )}

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Button
                    size="icon"
                    className="bg-gray-900/90 hover:bg-gray-800 border border-gray-700"
                    onClick={centerOnLocation}
                >
                    <Target className="h-5 w-5" />
                </Button>
                <Button
                    size="icon"
                    className="bg-gray-900/90 hover:bg-gray-800 border border-gray-700"
                    onClick={() => fetchDeliveries()}
                >
                    <RefreshCw className="h-5 w-5" />
                </Button>
            </div>

            {/* Delivery Selector (Top) */}
            {deliveries.length > 0 && (
                <div className="absolute top-4 left-4 right-16">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {deliveries.map(delivery => (
                            <button
                                key={delivery.id}
                                onClick={() => setSelectedDelivery(delivery)}
                                className={cn(
                                    "flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    "border backdrop-blur-sm",
                                    selectedDelivery?.id === delivery.id
                                        ? "bg-blue-600 border-blue-500 text-white"
                                        : "bg-gray-900/80 border-gray-700 text-gray-300"
                                )}
                            >
                                #{delivery.order_number?.slice(-4) || delivery.id.slice(0, 4)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Selected Delivery Info (Bottom) */}
            {selectedDelivery && (
                <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-mono font-bold text-white">
                                    #{selectedDelivery.order_number || selectedDelivery.id.slice(0, 8)}
                                </p>
                                <Badge 
                                    variant="outline" 
                                    className={cn(
                                        "text-xs mt-1",
                                        selectedDelivery.status === 'assigned' && "text-blue-400 border-blue-500/30",
                                        selectedDelivery.status === 'picked_up' && "text-purple-400 border-purple-500/30",
                                        selectedDelivery.status === 'in_transit' && "text-indigo-400 border-indigo-500/30"
                                    )}
                                >
                                    {selectedDelivery.status === 'assigned' && 'Pick Up'}
                                    {selectedDelivery.status === 'picked_up' && 'Ready to Deliver'}
                                    {selectedDelivery.status === 'in_transit' && 'In Transit'}
                                </Badge>
                            </div>
                            <Truck className="h-8 w-8 text-blue-400" />
                        </div>

                        {/* Current Destination */}
                        <div className={cn(
                            "flex items-start gap-3 p-3 rounded-lg",
                            selectedDelivery.status === 'assigned' 
                                ? "bg-amber-500/10" 
                                : "bg-green-500/10"
                        )}>
                            {selectedDelivery.status === 'assigned' ? (
                                <Store className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            ) : (
                                <MapPin className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-white">
                                    {selectedDelivery.status === 'assigned' 
                                        ? selectedDelivery.store_name 
                                        : selectedDelivery.customer_name}
                                </p>
                                <p className="text-sm text-gray-400 truncate">
                                    {selectedDelivery.status === 'assigned' 
                                        ? selectedDelivery.pickup_address 
                                        : selectedDelivery.delivery_address}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                asChild
                            >
                                <a 
                                    href={getNavigationUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Navigation2 className="h-5 w-5 mr-2" />
                                    Navigate
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                className="border-gray-700"
                                asChild
                            >
                                <a href={`/driver/delivery/${selectedDelivery.id}`}>
                                    Details
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State - Floating message that doesn't block map interaction */}
            {!isLoading && deliveries.length === 0 && (
                <div className="absolute bottom-24 left-4 right-4 pointer-events-none">
                    <div className="bg-gray-900/90 backdrop-blur border border-gray-700 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                            <Truck className="h-6 w-6 text-gray-500" />
                            <div className="text-left">
                                <p className="text-gray-300 font-medium">No active deliveries</p>
                                <p className="text-xs text-gray-500">
                                    Your delivery locations will appear here
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
