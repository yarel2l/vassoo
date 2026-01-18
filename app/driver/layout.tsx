'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
    Package, 
    MapPin, 
    User, 
    Wifi, 
    WifiOff,
    Bell,
    Menu,
    Navigation
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useDriverLocation } from '@/hooks/use-driver-location'
import { createClient } from '@/lib/supabase/client'
import { DriverNotificationProvider } from '@/contexts/driver-notification-context'
import { DriverNotificationBell } from '@/components/notifications/driver-notification-bell'

interface DriverLayoutProps {
    children: ReactNode
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/driver/login']

export default function DriverLayout({ children }: DriverLayoutProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { user, profile, isLoading, isDriver } = useAuth()
    const [isOnline, setIsOnline] = useState(true)
    const [isDriverOnline, setIsDriverOnline] = useState(false)
    const [isLoadingDriverStatus, setIsLoadingDriverStatus] = useState(true)

    // Check if current route is public (doesn't require auth)
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route)

    // Use location tracking hook - only active when driver is online and authenticated
    const { 
        currentLocation, 
        isTracking, 
        error: locationError,
        lastUpdateTime,
        permissionStatus,
        requestPermission
    } = useDriverLocation(user?.id || null, {
        enableTracking: isDriverOnline && !isPublicRoute,
        updateInterval: 5000, // Update every 5 seconds
        minDistanceChange: 10, // Only update if moved 10+ meters
        highAccuracy: true,
        timeout: 30000, // 30 seconds for slow devices
        maxRetries: 3,
    })

    // Update driver availability status in database
    useEffect(() => {
        async function updateDriverStatus() {
            if (!user?.id || isLoadingDriverStatus) return
            
            const supabase = createClient()
            const { data, error } = await supabase
                .from('delivery_drivers')
                .update({ 
                    is_available: isDriverOnline,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)
                .select()
            
            console.log('[DriverLayout] Update status result:', { data, error, userId: user.id, isDriverOnline })
            
            // Also persist to localStorage for quick recovery
            localStorage.setItem('driver_online_status', isDriverOnline ? 'true' : 'false')
        }
        
        updateDriverStatus()
    }, [isDriverOnline, user?.id, isLoadingDriverStatus])

    // Fetch driver status from database on mount
    useEffect(() => {
        async function fetchDriverStatus() {
            if (!user?.id) {
                setIsLoadingDriverStatus(false)
                return
            }
            
            const supabase = createClient()
            const { data, error } = await supabase
                .from('delivery_drivers')
                .select('id, is_available, user_id')
                .eq('user_id', user.id)
                .single()
            
            console.log('[DriverLayout] Fetch status result:', { data, error, userId: user.id })
            
            if (data) {
                setIsDriverOnline(data.is_available ?? false)
            } else {
                // Fallback to localStorage
                const cached = localStorage.getItem('driver_online_status')
                if (cached === 'true') {
                    setIsDriverOnline(true)
                }
            }
            
            setIsLoadingDriverStatus(false)
        }
        
        fetchDriverStatus()
    }, [user?.id])

    // Check network status
    useEffect(() => {
        setIsOnline(navigator.onLine)
        
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Redirect if not driver (only for protected routes)
    useEffect(() => {
        if (!isPublicRoute && !isLoading && (!user || !isDriver)) {
            router.push('/driver/login')
        }
    }, [user, isDriver, isLoading, router, isPublicRoute])

    // For public routes (login), render children directly without driver layout
    if (isPublicRoute) {
        return <>{children}</>
    }

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        )
    }

    // If not authenticated or not a driver, don't render (redirect will happen)
    if (!user || !isDriver) {
        return null
    }

    const navItems = [
        { href: '/driver', icon: Package, label: 'Deliveries' },
        { href: '/driver/map', icon: MapPin, label: 'Map' },
        { href: '/driver/profile', icon: User, label: 'Profile' },
    ]

    return (
        <DriverNotificationProvider driverId={user.id}>
            <div className="min-h-screen bg-gray-950 text-white flex flex-col">
                {/* Top Header */}
                <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">Vassoo Driver</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-400">
                                    {profile?.full_name || 'Driver'}
                                </p>
                                {/* GPS indicator */}
                                {isDriverOnline && (
                                    <div className={cn(
                                        "flex items-center gap-1",
                                        isTracking && currentLocation ? "text-green-400" : 
                                        permissionStatus === 'denied' ? "text-red-400" :
                                        locationError ? "text-yellow-400" : "text-gray-400"
                                    )}>
                                        <Navigation className="h-3 w-3" />
                                        <span className="text-[10px]">
                                            {isTracking && currentLocation ? 'GPS' : 
                                             permissionStatus === 'denied' ? 'Denied' :
                                             locationError ? 'No GPS' : '...'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Network Offline Indicator */}
                        {!isOnline && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full">
                                <WifiOff className="h-3 w-3 text-yellow-400" />
                                <span className="text-xs text-yellow-400">Offline</span>
                            </div>
                        )}
                        
                        {/* Driver Online Toggle */}
                        <button
                            onClick={() => setIsDriverOnline(!isDriverOnline)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                                isDriverOnline 
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                                    : "bg-gray-800 text-gray-400 border border-gray-700"
                            )}
                        >
                            <div className={cn(
                                "w-2 h-2 rounded-full",
                                isDriverOnline ? "bg-green-400 animate-pulse" : "bg-gray-500"
                            )} />
                            {isDriverOnline ? 'Online' : 'Offline'}
                        </button>
                        
                        {/* Notifications */}
                        <DriverNotificationBell />
                    </div>
                </div>
            </header>

            {/* Location Error Banner */}
            {isDriverOnline && locationError && (
                <div className={cn(
                    "px-4 py-2 flex items-center justify-between",
                    permissionStatus === 'denied' 
                        ? "bg-red-500/20 border-b border-red-500/30" 
                        : "bg-yellow-500/20 border-b border-yellow-500/30"
                )}>
                    <div className="flex items-center gap-2">
                        <Navigation className={cn(
                            "h-4 w-4",
                            permissionStatus === 'denied' ? "text-red-400" : "text-yellow-400"
                        )} />
                        <span className={cn(
                            "text-xs",
                            permissionStatus === 'denied' ? "text-red-400" : "text-yellow-400"
                        )}>
                            {locationError}
                        </span>
                    </div>
                    {permissionStatus !== 'granted' && (
                        <button
                            onClick={() => requestPermission()}
                            className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full transition-colors"
                        >
                            Enable GPS
                        </button>
                    )}
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-20">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 safe-area-bottom">
                <div className="flex items-center justify-around py-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || 
                            (item.href !== '/driver' && pathname?.startsWith(item.href))
                        const Icon = item.icon
                        
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors",
                                    isActive 
                                        ? "text-blue-400" 
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                <Icon className="h-6 w-6" />
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
        </DriverNotificationProvider>
    )
}
