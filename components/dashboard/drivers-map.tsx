'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Truck,
    User,
    MapPin,
    Phone,
    Clock,
    Package,
    Navigation,
    RefreshCw,
    ChevronRight,
    Layers,
    List,
    Eye,
    EyeOff,
    Car,
    Bike,
    Bus,
    Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

// Declare google maps types for TypeScript
declare global {
    interface Window {
        google?: typeof window.google
    }
}
declare const google: any

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

interface DriversMapProps {
    drivers: Driver[]
    activeDeliveries: ActiveDelivery[]
    companyLocation?: {
        lat: number
        lng: number
    }
    onDriverClick?: (driver: Driver) => void
    onDeliveryClick?: (delivery: ActiveDelivery) => void
    onRefresh?: () => void
    isLoading?: boolean
}

// Map marker colors by status
const statusColors = {
    available: '#22c55e', // green
    on_delivery: '#3b82f6', // blue
    unavailable: '#6b7280', // gray
    pickup: '#f59e0b', // amber
    delivery: '#8b5cf6', // purple
}

// Vehicle type to SVG path mapping (Lucide icons for cross-platform compatibility)
const getVehicleSvgPath = (vehicleType?: string): string => {
    switch (vehicleType?.toLowerCase()) {
        case 'motorcycle':
        case 'scooter':
        case 'bicycle':
            // Bike icon path from Lucide
            return 'M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 0h1a4 4 0 0 0 4-4V8h3l3 6h3a2 2 0 1 0 0-4h-1l-2-4h-4l-1 2H6'
        case 'van':
        case 'bus':
            // Bus icon path from Lucide
            return 'M8 6v6m7-6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3m11 0H8m10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-13 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'
        case 'truck':
            // Truck icon path from Lucide
            return 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2m10 0H9m5 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-9 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm13-6h-3m-8 0V9h11l1 3M3 9h3'
        case 'car':
        default:
            // Car icon path from Lucide
            return 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2m15 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-13 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'
    }
}

// Get React icon component for vehicle type (for use in UI)
const getVehicleIcon = (vehicleType?: string, className: string = 'h-5 w-5') => {
    switch (vehicleType?.toLowerCase()) {
        case 'motorcycle':
        case 'scooter':
        case 'bicycle':
            return <Bike className={className} />
        case 'van':
        case 'bus':
            return <Bus className={className} />
        case 'truck':
            return <Truck className={className} />
        case 'car':
        default:
            return <Car className={className} />
    }
}

// Create marker icon based on vehicle type with SVG icon
const createVehicleMarkerIcon = (color: string, vehicleType?: string, isMoving: boolean = false) => {
    const iconPath = getVehicleSvgPath(vehicleType)
    
    // SVG with animation pulse for moving drivers
    const pulseAnimation = isMoving ? `
        <animate attributeName="r" values="22;26;22" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite"/>
    ` : ''
    
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="56" viewBox="0 0 48 56">
            <!-- Pulse effect for moving drivers -->
            ${isMoving ? `<circle cx="24" cy="24" r="22" fill="${color}" opacity="0.3">${pulseAnimation}</circle>` : ''}
            
            <!-- Drop shadow -->
            <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.4"/>
                </filter>
            </defs>
            
            <!-- Pin shape -->
            <path d="M24 52 C24 52 40 34 40 22 C40 13.163 32.837 6 24 6 C15.163 6 8 13.163 8 22 C8 34 24 52 24 52Z" 
                  fill="${color}" 
                  filter="url(#shadow)"
                  stroke="white" 
                  stroke-width="2"/>
            
            <!-- Vehicle icon inside (scaled and centered) -->
            <g transform="translate(12, 10) scale(1)">
                <path d="${iconPath}" 
                      fill="none" 
                      stroke="white" 
                      stroke-width="2" 
                      stroke-linecap="round" 
                      stroke-linejoin="round"/>
            </g>
        </svg>
    `
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

// Custom SVG icon for pickup location (store)
const createPickupMarkerIcon = () => {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <defs>
                <filter id="shadow2" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
                </filter>
            </defs>
            <!-- Pin shape -->
            <path d="M16 38 C16 38 28 26 28 16 C28 9.373 22.627 4 16 4 C9.373 4 4 9.373 4 16 C4 26 16 38 16 38Z" 
                  fill="#f59e0b" 
                  filter="url(#shadow2)"
                  stroke="white" 
                  stroke-width="1.5"/>
            <!-- Store icon -->
            <g transform="translate(8, 8)">
                <rect x="1" y="6" width="14" height="8" fill="white" rx="1"/>
                <path d="M0 6 L8 1 L16 6" stroke="white" stroke-width="2" fill="none"/>
                <rect x="6" y="9" width="4" height="5" fill="#f59e0b"/>
            </g>
        </svg>
    `
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

// Custom SVG icon for delivery location (house/destination)
const createDeliveryMarkerIcon = () => {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
            <defs>
                <filter id="shadow3" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
                </filter>
            </defs>
            <!-- Pin shape -->
            <path d="M16 38 C16 38 28 26 28 16 C28 9.373 22.627 4 16 4 C9.373 4 4 9.373 4 16 C4 26 16 38 16 38Z" 
                  fill="#8b5cf6" 
                  filter="url(#shadow3)"
                  stroke="white" 
                  stroke-width="1.5"/>
            <!-- Flag/destination icon -->
            <g transform="translate(9, 7)">
                <rect x="2" y="0" width="2" height="14" fill="white"/>
                <path d="M4 0 L14 3 L4 6 Z" fill="white"/>
            </g>
        </svg>
    `
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

// Helper to create HTML element for advanced marker
const createAdvancedMarkerContent = (svgDataUrl: string, size: number = 48): HTMLElement => {
    const div = document.createElement('div')
    div.style.width = `${size}px`
    div.style.height = `${size + 8}px`
    div.style.cursor = 'pointer'
    
    const img = document.createElement('img')
    img.src = svgDataUrl
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.objectFit = 'contain'
    
    div.appendChild(img)
    return div
}

// Helper to create label element for advanced marker
const createLabelContent = (text: string): HTMLElement => {
    const div = document.createElement('div')
    div.style.color = '#ffffff'
    div.style.fontSize = '10px'
    div.style.fontWeight = 'bold'
    div.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)'
    div.style.whiteSpace = 'nowrap'
    div.textContent = text
    return div
}

export function DriversMap({
    drivers,
    activeDeliveries,
    companyLocation,
    onDriverClick,
    onDeliveryClick,
    onRefresh,
    isLoading,
}: DriversMapProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const [mapInstance, setMapInstance] = useState<any>(null)
    const [markers, setMarkers] = useState<any[]>([])
    const [polylines, setPolylines] = useState<any[]>([])
    const [showDrivers, setShowDrivers] = useState(true)
    const [showDeliveries, setShowDeliveries] = useState(true)
    const [showRoutes, setShowRoutes] = useState(true)
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
    const [googleLoaded, setGoogleLoaded] = useState(false)
    const [useAdvancedMarkers, setUseAdvancedMarkers] = useState(false)

    // Check if Google Maps is loaded - with better detection
    useEffect(() => {
        const checkGoogle = () => {
            if (typeof window !== 'undefined' && window.google?.maps) {
                setGoogleLoaded(true)
                // Check if AdvancedMarkerElement is available
                if (window.google.maps.marker?.AdvancedMarkerElement) {
                    setUseAdvancedMarkers(true)
                    console.log('[DriversMap] AdvancedMarkerElement available')
                } else {
                    console.log('[DriversMap] Using legacy Marker (AdvancedMarkerElement not available)')
                }
                return true
            }
            return false
        }
        
        // Check immediately
        if (checkGoogle()) return
        
        // Poll for Google Maps to load
        const interval = setInterval(() => {
            if (checkGoogle()) {
                clearInterval(interval)
            }
        }, 200)
        
        // Also listen for custom event
        const handleGoogleMapsLoaded = () => {
            checkGoogle()
        }
        window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded)
        
        // Timeout after 15 seconds
        const timeout = setTimeout(() => {
            clearInterval(interval)
        }, 15000)
        
        return () => {
            clearInterval(interval)
            clearTimeout(timeout)
            window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded)
        }
    }, [])

    // Initialize Google Map
    useEffect(() => {
        if (!mapRef.current || mapInstance || !googleLoaded) return

        const initMap = async () => {
            // Check if Google Maps is loaded
            if (!window.google?.maps) {
                return
            }

            const center = companyLocation || { lat: 40.7128, lng: -74.0060 } // Default to NYC

            // Map ID is required for AdvancedMarkerElement
            // Get from env or use a demo map ID (create one at https://console.cloud.google.com/google/maps-apis/studio/maps)
            const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID'

            try {
                const map = new window.google.maps.Map(mapRef.current!, {
                    center,
                    zoom: 13,
                    mapId, // Required for AdvancedMarkerElement
                    styles: [
                    // Dark mode map style
                    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                    {
                        featureType: 'administrative.locality',
                        elementType: 'labels.text.fill',
                        stylers: [{ color: '#d59563' }],
                    },
                    {
                        featureType: 'poi',
                        elementType: 'labels.text.fill',
                        stylers: [{ color: '#d59563' }],
                    },
                    {
                        featureType: 'poi.park',
                        elementType: 'geometry',
                        stylers: [{ color: '#263c3f' }],
                    },
                    {
                        featureType: 'poi.park',
                        elementType: 'labels.text.fill',
                        stylers: [{ color: '#6b9a76' }],
                    },
                    {
                        featureType: 'road',
                        elementType: 'geometry',
                        stylers: [{ color: '#38414e' }],
                    },
                    {
                        featureType: 'road',
                        elementType: 'geometry.stroke',
                        stylers: [{ color: '#212a37' }],
                    },
                    {
                        featureType: 'road',
                        elementType: 'labels.text.fill',
                        stylers: [{ color: '#9ca5b3' }],
                    },
                    {
                        featureType: 'road.highway',
                        elementType: 'geometry',
                        stylers: [{ color: '#746855' }],
                    },
                    {
                        featureType: 'road.highway',
                        elementType: 'geometry.stroke',
                        stylers: [{ color: '#1f2835' }],
                    },
                    {
                        featureType: 'road.highway',
                        elementType: 'labels.text.fill',
                        stylers: [{ color: '#f3d19c' }],
                    },
                    {
                        featureType: 'transit',
                        elementType: 'geometry',
                        stylers: [{ color: '#2f3948' }],
                    },
                    {
                        featureType: 'transit.station',
                        elementType: 'labels.text.fill',
                        stylers: [{ color: '#d59563' }],
                    },
                    {
                        featureType: 'water',
                        elementType: 'geometry',
                        stylers: [{ color: '#17263c' }],
                    },
                    {
                        featureType: 'water',
                        elementType: 'labels.text.fill',
                        stylers: [{ color: '#515c6d' }],
                    },
                    {
                        featureType: 'water',
                        elementType: 'labels.text.stroke',
                        stylers: [{ color: '#17263c' }],
                    },
                ],
                disableDefaultUI: true,
                zoomControl: true,
                fullscreenControl: true,
            })

                setMapInstance(map)
            } catch (error) {
                console.error('[DriversMap] Error initializing map:', error)
            }
        }

        initMap()
    }, [companyLocation, mapInstance, googleLoaded])

    // Update markers when data changes
    useEffect(() => {
        if (!mapInstance) return

        // Clear existing markers - handle both legacy and advanced markers
        markers.forEach(marker => {
            if ('setMap' in marker) {
                (marker as google.maps.Marker).setMap(null)
            } else if ('map' in marker) {
                (marker as any).map = null
            }
        })
        polylines.forEach(polyline => polyline.setMap(null))

        const newMarkers: (google.maps.Marker | google.maps.marker.AdvancedMarkerElement)[] = []
        const newPolylines: google.maps.Polyline[] = []

        // Add driver markers with custom truck icons
        if (showDrivers) {
            drivers.forEach(driver => {
                if (!driver.currentLocation) return

                const color = driver.isOnDelivery
                    ? statusColors.on_delivery
                    : driver.isAvailable
                        ? statusColors.available
                        : statusColors.unavailable

                let marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement
                let label: google.maps.Marker | google.maps.marker.AdvancedMarkerElement

                if (useAdvancedMarkers && window.google?.maps?.marker?.AdvancedMarkerElement) {
                    // Use AdvancedMarkerElement (new API)
                    const markerContent = createAdvancedMarkerContent(
                        createVehicleMarkerIcon(color, driver.vehicleType, driver.isOnDelivery),
                        driver.name
                    )
                    
                    marker = new window.google.maps.marker.AdvancedMarkerElement({
                        position: driver.currentLocation,
                        map: mapInstance,
                        content: markerContent,
                        title: driver.name,
                        zIndex: driver.isOnDelivery ? 150 : 100,
                    })

                    // Add click listener for AdvancedMarkerElement
                    marker.addListener('click', () => {
                        setSelectedDriver(driver)
                        onDriverClick?.(driver)
                    })

                    // Add name label below the marker
                    const labelContent = createLabelContent(driver.name.split(' ')[0])
                    label = new window.google.maps.marker.AdvancedMarkerElement({
                        position: {
                            lat: driver.currentLocation.lat - 0.0012,
                            lng: driver.currentLocation.lng,
                        },
                        map: mapInstance,
                        content: labelContent,
                        zIndex: 99,
                    })
                } else {
                    // Fallback to legacy Marker API
                    marker = new window.google.maps.Marker({
                        position: driver.currentLocation,
                        map: mapInstance,
                        icon: {
                            url: createVehicleMarkerIcon(color, driver.vehicleType, driver.isOnDelivery),
                            scaledSize: new window.google.maps.Size(48, 56),
                            anchor: new window.google.maps.Point(24, 52),
                        },
                        title: driver.name,
                        zIndex: driver.isOnDelivery ? 150 : 100,
                        optimized: false,
                    })

                    marker.addListener('click', () => {
                        setSelectedDriver(driver)
                        onDriverClick?.(driver)
                    })

                    label = new window.google.maps.Marker({
                        position: {
                            lat: driver.currentLocation.lat - 0.0012,
                            lng: driver.currentLocation.lng,
                        },
                        map: mapInstance,
                        icon: {
                            path: 'M 0,0',
                            labelOrigin: new window.google.maps.Point(0, 0),
                        },
                        label: {
                            text: driver.name.split(' ')[0],
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: 'bold',
                        },
                        zIndex: 99,
                    })
                }

                newMarkers.push(marker, label)
            })
        }

        // Add delivery markers and routes with custom icons
        if (showDeliveries) {
            activeDeliveries.forEach(delivery => {
                let pickupMarker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement
                let deliveryMarker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement

                if (useAdvancedMarkers && window.google?.maps?.marker?.AdvancedMarkerElement) {
                    // Use AdvancedMarkerElement for pickup
                    const pickupContent = createAdvancedMarkerContent(
                        createPickupMarkerIcon(),
                        `Pickup: ${delivery.pickupLocation.address}`,
                        32, 40
                    )
                    pickupMarker = new window.google.maps.marker.AdvancedMarkerElement({
                        position: delivery.pickupLocation,
                        map: mapInstance,
                        content: pickupContent,
                        title: `Pickup: ${delivery.pickupLocation.address}`,
                        zIndex: 50,
                    })

                    // Use AdvancedMarkerElement for delivery
                    const deliveryContent = createAdvancedMarkerContent(
                        createDeliveryMarkerIcon(),
                        `Delivery: ${delivery.customerName}`,
                        32, 40
                    )
                    deliveryMarker = new window.google.maps.marker.AdvancedMarkerElement({
                        position: delivery.deliveryLocation,
                        map: mapInstance,
                        content: deliveryContent,
                        title: `Delivery: ${delivery.customerName}`,
                        zIndex: 50,
                    })

                    deliveryMarker.addListener('click', () => {
                        onDeliveryClick?.(delivery)
                    })
                } else {
                    // Fallback to legacy Marker API
                    pickupMarker = new window.google.maps.Marker({
                        position: delivery.pickupLocation,
                        map: mapInstance,
                        icon: {
                            url: createPickupMarkerIcon(),
                            scaledSize: new window.google.maps.Size(32, 40),
                            anchor: new window.google.maps.Point(16, 40),
                        },
                        title: `Pickup: ${delivery.pickupLocation.address}`,
                        zIndex: 50,
                    })

                    deliveryMarker = new window.google.maps.Marker({
                        position: delivery.deliveryLocation,
                        map: mapInstance,
                        icon: {
                            url: createDeliveryMarkerIcon(),
                            scaledSize: new window.google.maps.Size(32, 40),
                            anchor: new window.google.maps.Point(16, 40),
                        },
                        title: `Delivery: ${delivery.customerName}`,
                        zIndex: 50,
                    })

                    deliveryMarker.addListener('click', () => {
                        onDeliveryClick?.(delivery)
                    })
                }

                newMarkers.push(pickupMarker, deliveryMarker)

                // Draw animated route line (Polylines don't have a deprecated warning)
                if (showRoutes) {
                    const routeLine = new window.google.maps.Polyline({
                        path: [
                            delivery.pickupLocation,
                            delivery.deliveryLocation,
                        ],
                        geodesic: true,
                        strokeColor: statusColors.delivery,
                        strokeOpacity: 0.8,
                        strokeWeight: 3,
                        icons: [{
                            icon: {
                                path: 'M 0,-1 0,1',
                                strokeOpacity: 1,
                                scale: 3,
                            },
                            offset: '0',
                            repeat: '15px',
                        }],
                        map: mapInstance,
                    })
                    newPolylines.push(routeLine)
                }
            })
        }

        setMarkers(newMarkers as any)
        setPolylines(newPolylines)

        return () => {
            newMarkers.forEach(marker => marker.setMap(null))
            newPolylines.forEach(polyline => polyline.setMap(null))
        }
    }, [mapInstance, drivers, activeDeliveries, showDrivers, showDeliveries, showRoutes])

    // Fit bounds to show all markers
    const fitBounds = useCallback(() => {
        if (!mapInstance) return

        const bounds = new window.google.maps.LatLngBounds()

        drivers.forEach(driver => {
            if (driver.currentLocation) {
                bounds.extend(driver.currentLocation)
            }
        })

        activeDeliveries.forEach(delivery => {
            bounds.extend(delivery.pickupLocation)
            bounds.extend(delivery.deliveryLocation)
        })

        if (!bounds.isEmpty()) {
            mapInstance.fitBounds(bounds, 50)
        }
    }, [mapInstance, drivers, activeDeliveries])

    // Get driver status badge
    const getDriverStatus = (driver: Driver) => {
        if (driver.isOnDelivery) {
            return <Badge className="bg-blue-500/20 text-blue-400">On Delivery</Badge>
        }
        if (driver.isAvailable) {
            return <Badge className="bg-green-500/20 text-green-400">Available</Badge>
        }
        return <Badge className="bg-gray-500/20 text-gray-400">Unavailable</Badge>
    }

    // Driver list view
    const renderDriverList = () => (
        <ScrollArea className="h-[500px]">
            <div className="space-y-2 p-2">
                {drivers.map(driver => (
                    <Card
                        key={driver.id}
                        className={cn(
                            'bg-gray-800/50 border-gray-700 hover:border-gray-600 cursor-pointer transition-all',
                            selectedDriver?.id === driver.id && 'border-blue-500'
                        )}
                        onClick={() => {
                            setSelectedDriver(driver)
                            onDriverClick?.(driver)
                        }}
                    >
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        'h-10 w-10 rounded-full flex items-center justify-center',
                                        driver.isOnDelivery
                                            ? 'bg-blue-500/20'
                                            : driver.isAvailable
                                                ? 'bg-green-500/20'
                                                : 'bg-gray-500/20'
                                    )}>
                                        <User className={cn(
                                            'h-5 w-5',
                                            driver.isOnDelivery
                                                ? 'text-blue-400'
                                                : driver.isAvailable
                                                    ? 'text-green-400'
                                                    : 'text-gray-400'
                                        )} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{driver.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {driver.vehicleType || 'Vehicle'} • {driver.currentDeliveries} active
                                        </p>
                                    </div>
                                </div>
                                {getDriverStatus(driver)}
                            </div>
                            
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                <div className="bg-gray-900/50 rounded p-2">
                                    <p className="text-lg font-bold text-white">{driver.currentDeliveries}</p>
                                    <p className="text-xs text-gray-500">Active</p>
                                </div>
                                <div className="bg-gray-900/50 rounded p-2">
                                    <p className="text-lg font-bold text-green-400">{driver.completedToday}</p>
                                    <p className="text-xs text-gray-500">Today</p>
                                </div>
                                <div className="bg-gray-900/50 rounded p-2">
                                    <p className="text-lg font-bold text-amber-400">{driver.performanceScore.toFixed(1)}</p>
                                    <p className="text-xs text-gray-500">Score</p>
                                </div>
                            </div>

                            {driver.lastLocationUpdate && (
                                <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Last seen {formatDistanceToNow(new Date(driver.lastLocationUpdate), { addSuffix: true })}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {drivers.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                        <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No drivers registered</p>
                    </div>
                )}
            </div>
        </ScrollArea>
    )

    return (
        <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                            <Navigation className="h-5 w-5 text-blue-400" />
                            Live Drivers Map
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            Real-time driver locations and active deliveries
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
                            <Button
                                variant={viewMode === 'map' ? 'default' : 'ghost'}
                                size="sm"
                                className={viewMode === 'map' ? 'bg-blue-600' : 'text-gray-400'}
                                onClick={() => setViewMode('map')}
                            >
                                <Layers className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                className={viewMode === 'list' ? 'bg-blue-600' : 'text-gray-400'}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-700"
                            onClick={() => {
                                onRefresh?.()
                                fitBounds()
                            }}
                            disabled={isLoading}
                        >
                            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                        </Button>
                    </div>
                </div>

                {/* Map Controls */}
                {viewMode === 'map' && (
                    <div className="flex items-center gap-4 mt-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'text-xs',
                                showDrivers ? 'text-green-400' : 'text-gray-500'
                            )}
                            onClick={() => setShowDrivers(!showDrivers)}
                        >
                            {showDrivers ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                            Drivers ({drivers.filter(d => d.currentLocation).length})
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'text-xs',
                                showDeliveries ? 'text-purple-400' : 'text-gray-500'
                            )}
                            onClick={() => setShowDeliveries(!showDeliveries)}
                        >
                            {showDeliveries ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                            Deliveries ({activeDeliveries.length})
                        </Button>
                        {/* Show warning if there are drivers without GPS location */}
                        {drivers.filter(d => !d.currentLocation && d.isAvailable).length > 0 && (
                            <span className="text-xs text-yellow-400 ml-2">
                                ⚠️ {drivers.filter(d => !d.currentLocation && d.isAvailable).length} without GPS
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'text-xs',
                                showRoutes ? 'text-blue-400' : 'text-gray-500'
                            )}
                            onClick={() => setShowRoutes(!showRoutes)}
                        >
                            {showRoutes ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                            Routes
                        </Button>
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-0">
                {viewMode === 'map' ? (
                    <div className="relative">
                        {/* Google Map Container */}
                        <div
                            ref={mapRef}
                            className="h-[500px] w-full rounded-b-lg"
                            style={{ minHeight: '500px' }}
                        />

                        {/* Map Legend */}
                        <div className="absolute bottom-4 left-4 bg-gray-900/90 p-3 rounded-lg border border-gray-700">
                            <p className="text-xs font-semibold text-gray-400 mb-2">Legend</p>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="h-3 w-3 rounded-full bg-green-500" />
                                    <span className="text-gray-300">Available Driver</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                                    <span className="text-gray-300">On Delivery</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="h-3 w-3 rounded-full bg-gray-500" />
                                    <span className="text-gray-300">Unavailable</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="h-0 w-0 border-l-4 border-r-4 border-b-6 border-transparent border-b-amber-500" />
                                    <span className="text-gray-300">Pickup Point</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="h-0 w-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-purple-500" />
                                    <span className="text-gray-300">Delivery Point</span>
                                </div>
                            </div>
                        </div>

                        {/* Selected Driver Panel */}
                        {selectedDriver && (
                            <div className="absolute top-4 right-16 w-72 bg-gray-900/95 p-4 rounded-lg border border-gray-700 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {getVehicleIcon(selectedDriver.vehicleType, 'h-6 w-6 text-blue-400')}
                                        <h4 className="font-semibold text-white">{selectedDriver.name}</h4>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => setSelectedDriver(null)}
                                    >
                                        ×
                                    </Button>
                                </div>
                                {getDriverStatus(selectedDriver)}
                                
                                <div className="mt-3 space-y-2 text-sm">
                                    {selectedDriver.phone && (
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <Phone className="h-4 w-4 text-gray-500" />
                                            {selectedDriver.phone}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Package className="h-4 w-4 text-gray-500" />
                                        {selectedDriver.currentDeliveries} active deliveries
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Truck className="h-4 w-4 text-gray-500" />
                                        {selectedDriver.completedToday} completed today
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Google Maps not loaded fallback */}
                        {typeof window.google === 'undefined' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90 rounded-b-lg">
                                <div className="text-center">
                                    <MapPin className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">Google Maps API not loaded</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Configure your API key to enable map view
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    renderDriverList()
                )}
            </CardContent>
        </Card>
    )
}

// Summary stats component for the map
export function DriversMapStats({ drivers, deliveries }: { drivers: Driver[], deliveries: ActiveDelivery[] }) {
    const available = drivers.filter(d => d.isAvailable && !d.isOnDelivery).length
    const onDelivery = drivers.filter(d => d.isOnDelivery).length
    const unavailable = drivers.filter(d => !d.isAvailable && !d.isOnDelivery).length
    const activeDeliveries = deliveries.length

    return (
        <div className="grid grid-cols-4 gap-4 mb-4">
            <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{available}</p>
                    <p className="text-xs text-green-400/70">Available</p>
                </CardContent>
            </Card>
            <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-blue-400">{onDelivery}</p>
                    <p className="text-xs text-blue-400/70">On Delivery</p>
                </CardContent>
            </Card>
            <Card className="bg-gray-500/10 border-gray-500/30">
                <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-gray-400">{unavailable}</p>
                    <p className="text-xs text-gray-400/70">Unavailable</p>
                </CardContent>
            </Card>
            <Card className="bg-purple-500/10 border-purple-500/30">
                <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-purple-400">{activeDeliveries}</p>
                    <p className="text-xs text-purple-400/70">Active Routes</p>
                </CardContent>
            </Card>
        </div>
    )
}
