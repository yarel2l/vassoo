'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

interface DriverNotification {
    id: string
    type: 'new_delivery' | 'delivery_cancelled' | 'delivery_reminder'
    title: string
    message: string
    deliveryId?: string
    orderId?: string
    orderNumber?: string
    timestamp: Date
    isRead: boolean
}

interface DriverNotificationContextType {
    notifications: DriverNotification[]
    unreadCount: number
    pendingDeliveriesCount: number
    isConnected: boolean
    connectionError: string | null
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    clearNotifications: () => void
    soundEnabled: boolean
    setSoundEnabled: (enabled: boolean) => void
}

const DriverNotificationContext = createContext<DriverNotificationContextType | null>(null)

export function useDriverNotifications() {
    const context = useContext(DriverNotificationContext)
    if (!context) {
        throw new Error('useDriverNotifications must be used within DriverNotificationProvider')
    }
    return context
}

interface DriverNotificationProviderProps {
    children: React.ReactNode
    driverId?: string
}

// Notification sound URL
const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3'

// Create a beep sound using Web Audio API as fallback
function createBeepSound(): Promise<void> {
    return new Promise((resolve) => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 880 // A5 note
            oscillator.type = 'sine'

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.5)

            setTimeout(() => {
                audioContext.close()
                resolve()
            }, 500)
        } catch (err) {
            console.warn('Web Audio API not supported:', err)
            resolve()
        }
    })
}

export function DriverNotificationProvider({
    children,
    driverId,
}: DriverNotificationProviderProps) {
    const [notifications, setNotifications] = useState<DriverNotification[]>([])
    const [pendingDeliveriesCount, setPendingDeliveriesCount] = useState(0)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [isConnected, setIsConnected] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const audioAvailable = useRef<boolean>(true)

    // Initialize audio element
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio(NOTIFICATION_SOUND_URL)
            audioRef.current.volume = 0.5
            
            audioRef.current.addEventListener('error', () => {
                audioAvailable.current = false
            })
            
            audioRef.current.load()
            
            // Load sound preference from localStorage
            const savedSoundEnabled = localStorage.getItem('driver_sound_enabled')
            if (savedSoundEnabled !== null) {
                setSoundEnabled(savedSoundEnabled === 'true')
            }
        }
    }, [])

    // Save sound preference
    useEffect(() => {
        localStorage.setItem('driver_sound_enabled', soundEnabled ? 'true' : 'false')
    }, [soundEnabled])

    const playNotificationSound = useCallback(async () => {
        if (!soundEnabled) return
        
        if (audioAvailable.current && audioRef.current) {
            try {
                audioRef.current.currentTime = 0
                await audioRef.current.play()
            } catch (err) {
                await createBeepSound()
            }
        } else {
            await createBeepSound()
        }
    }, [soundEnabled])

    const addNotification = useCallback((notification: Omit<DriverNotification, 'id' | 'timestamp' | 'isRead'>) => {
        const newNotification: DriverNotification = {
            ...notification,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            isRead: false,
        }

        setNotifications((prev) => [newNotification, ...prev].slice(0, 50))
        playNotificationSound()

        toast({
            title: notification.title,
            description: notification.message,
        })
    }, [playNotificationSound])

    // Fetch initial pending deliveries count
    useEffect(() => {
        async function fetchPendingDeliveries() {
            if (!driverId) return
            
            const supabase = createClient()
            
            // First get the driver record
            const { data: driver } = await supabase
                .from('delivery_drivers')
                .select('id')
                .eq('user_id', driverId)
                .single()
            
            if (!driver) return
            
            // Count pending deliveries for this driver
            const { count } = await supabase
                .from('deliveries')
                .select('*', { count: 'exact', head: true })
                .eq('driver_id', driver.id)
                .in('status', ['assigned', 'picked_up', 'in_transit'])
            
            setPendingDeliveriesCount(count || 0)
        }
        
        fetchPendingDeliveries()
    }, [driverId])

    // Subscribe to realtime delivery updates for this driver
    useEffect(() => {
        if (!driverId) {
            setIsConnected(false)
            return
        }

        const supabase = createClient()
        
        // First get the driver's delivery_driver record ID
        async function setupSubscription() {
            const { data: driver } = await supabase
                .from('delivery_drivers')
                .select('id')
                .eq('user_id', driverId)
                .single()
            
            if (!driver) {
                setConnectionError('Driver record not found')
                return
            }

            const channel = supabase
                .channel(`driver-deliveries-${driver.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'deliveries',
                        filter: `driver_id=eq.${driver.id}`,
                    },
                    async (payload) => {
                        console.log('[DriverNotification] New delivery assigned:', payload)
                        
                        // Fetch order details
                        const { data: delivery } = await supabase
                            .from('deliveries')
                            .select(`
                                id,
                                pickup_address,
                                dropoff_address,
                                orders(order_number)
                            `)
                            .eq('id', payload.new.id)
                            .single()
                        
                        const orderNumber = (delivery?.orders as any)?.order_number || 'Unknown'
                        
                        addNotification({
                            type: 'new_delivery',
                            title: '🚚 New Delivery Assigned!',
                            message: `Order #${orderNumber} is ready for pickup`,
                            deliveryId: payload.new.id,
                            orderId: payload.new.order_id,
                            orderNumber,
                        })
                        
                        setPendingDeliveriesCount((prev) => prev + 1)
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'deliveries',
                        filter: `driver_id=eq.${driver.id}`,
                    },
                    (payload) => {
                        console.log('[DriverNotification] Delivery updated:', payload)
                        
                        // Handle cancellation
                        if (payload.new.status === 'cancelled' && payload.old.status !== 'cancelled') {
                            addNotification({
                                type: 'delivery_cancelled',
                                title: '❌ Delivery Cancelled',
                                message: `A delivery has been cancelled`,
                                deliveryId: payload.new.id,
                            })
                            setPendingDeliveriesCount((prev) => Math.max(0, prev - 1))
                        }
                        
                        // Handle completion
                        if (payload.new.status === 'delivered' && payload.old.status !== 'delivered') {
                            setPendingDeliveriesCount((prev) => Math.max(0, prev - 1))
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('[DriverNotification] Subscription status:', status)
                    if (status === 'SUBSCRIBED') {
                        setIsConnected(true)
                        setConnectionError(null)
                    } else if (status === 'CHANNEL_ERROR') {
                        setIsConnected(false)
                        setConnectionError('Failed to connect to notifications')
                    } else if (status === 'TIMED_OUT') {
                        setIsConnected(false)
                        setConnectionError('Connection timed out')
                    }
                })

            return () => {
                supabase.removeChannel(channel)
            }
        }
        
        const cleanup = setupSubscription()
        
        return () => {
            cleanup.then(fn => fn?.())
        }
    }, [driverId, addNotification])

    const markAsRead = useCallback((id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        )
    }, [])

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    }, [])

    const clearNotifications = useCallback(() => {
        setNotifications([])
    }, [])

    const unreadCount = notifications.filter((n) => !n.isRead).length

    const value: DriverNotificationContextType = {
        notifications,
        unreadCount,
        pendingDeliveriesCount,
        isConnected,
        connectionError,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        soundEnabled,
        setSoundEnabled,
    }

    return (
        <DriverNotificationContext.Provider value={value}>
            {children}
        </DriverNotificationContext.Provider>
    )
}
