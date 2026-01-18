'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useRealtimeOrders } from '@/hooks/use-realtime-orders'
import { toast } from '@/hooks/use-toast'

interface OrderNotification {
    id: string
    type: 'new_order' | 'order_update' | 'new_delivery' | 'delivery_update'
    title: string
    message: string
    orderId?: string
    orderNumber?: string
    deliveryId?: string
    timestamp: Date
    isRead: boolean
}

interface OrderNotificationContextType {
    notifications: OrderNotification[]
    unreadCount: number
    pendingOrdersCount: number
    pendingDeliveriesCount: number
    isConnected: boolean
    connectionError: string | null
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    clearNotifications: () => void
    soundEnabled: boolean
    setSoundEnabled: (enabled: boolean) => void
}

const OrderNotificationContext = createContext<OrderNotificationContextType | null>(null)

export function useOrderNotifications() {
    const context = useContext(OrderNotificationContext)
    if (!context) {
        throw new Error('useOrderNotifications must be used within OrderNotificationProvider')
    }
    return context
}

interface OrderNotificationProviderProps {
    children: React.ReactNode
    storeId?: string
    deliveryCompanyId?: string
    onPendingCountChange?: (count: number) => void
}

// Notification sound URL (you can replace with your own sound file)
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

export function OrderNotificationProvider({
    children,
    storeId,
    deliveryCompanyId,
    onPendingCountChange,
}: OrderNotificationProviderProps) {
    const [notifications, setNotifications] = useState<OrderNotification[]>([])
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
    const [pendingDeliveriesCount, setPendingDeliveriesCount] = useState(0)
    const [soundEnabled, setSoundEnabled] = useState(true)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const audioAvailable = useRef<boolean>(true)

    // Initialize audio element
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio(NOTIFICATION_SOUND_URL)
            audioRef.current.volume = 0.5
            
            // Test if audio file exists
            audioRef.current.addEventListener('error', () => {
                audioAvailable.current = false
                console.info('Notification sound file not found, using Web Audio API fallback')
            })
            
            // Preload the audio
            audioRef.current.load()
        }
    }, [])

    const playNotificationSound = useCallback(async () => {
        if (!soundEnabled) return
        
        if (audioAvailable.current && audioRef.current) {
            try {
                audioRef.current.currentTime = 0
                await audioRef.current.play()
            } catch (err) {
                console.warn('Could not play notification sound:', err)
                // Fallback to Web Audio API beep
                await createBeepSound()
            }
        } else {
            // Use Web Audio API beep as fallback
            await createBeepSound()
        }
    }, [soundEnabled])

    const addNotification = useCallback((notification: Omit<OrderNotification, 'id' | 'timestamp' | 'isRead'>) => {
        const newNotification: OrderNotification = {
            ...notification,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            isRead: false,
        }

        setNotifications((prev) => [newNotification, ...prev].slice(0, 50)) // Keep last 50
        playNotificationSound()

        // Show toast notification
        toast({
            title: notification.title,
            description: notification.message,
        })
    }, [playNotificationSound])

    // Handle new orders (for stores)
    const handleNewOrder = useCallback((order: any) => {
        addNotification({
            type: 'new_order',
            title: '🔔 New Order!',
            message: `Order #${order.order_number} - $${Number(order.total).toFixed(2)}`,
            orderId: order.id,
            orderNumber: order.order_number,
        })
        setPendingOrdersCount((prev) => prev + 1)
    }, [addNotification])

    // Handle order updates (for stores)
    const handleOrderUpdate = useCallback((order: any) => {
        // Only notify on significant status changes
        if (['cancelled', 'completed'].includes(order.status)) {
            addNotification({
                type: 'order_update',
                title: order.status === 'cancelled' ? '❌ Order Cancelled' : '✅ Order Completed',
                message: `Order #${order.order_number}`,
                orderId: order.id,
                orderNumber: order.order_number,
            })
        }
    }, [addNotification])

    // Handle new deliveries (for delivery companies)
    const handleNewDelivery = useCallback((delivery: any) => {
        addNotification({
            type: 'new_delivery',
            title: '🚚 New Delivery!',
            message: `Delivery #${delivery.id.slice(0, 8)} assigned`,
            deliveryId: delivery.id,
        })
        setPendingDeliveriesCount((prev) => prev + 1)
    }, [addNotification])

    // Handle delivery updates (for delivery companies)
    const handleDeliveryUpdate = useCallback((delivery: any) => {
        if (delivery.status === 'delivered') {
            addNotification({
                type: 'delivery_update',
                title: '✅ Delivery Completed',
                message: `Delivery #${delivery.id.slice(0, 8)}`,
                deliveryId: delivery.id,
            })
            setPendingDeliveriesCount((prev) => Math.max(0, prev - 1))
        }
    }, [addNotification])

    const { isConnected, connectionError } = useRealtimeOrders({
        storeId,
        deliveryCompanyId,
        onNewOrder: handleNewOrder,
        onOrderUpdate: handleOrderUpdate,
        onNewDelivery: handleNewDelivery,
        onDeliveryUpdate: handleDeliveryUpdate,
        enabled: !!(storeId || deliveryCompanyId),
    })

    // Notify parent of pending count changes
    useEffect(() => {
        const totalPending = pendingOrdersCount + pendingDeliveriesCount
        onPendingCountChange?.(totalPending)
    }, [pendingOrdersCount, pendingDeliveriesCount, onPendingCountChange])

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

    const value: OrderNotificationContextType = {
        notifications,
        unreadCount,
        pendingOrdersCount,
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
        <OrderNotificationContext.Provider value={value}>
            {children}
        </OrderNotificationContext.Provider>
    )
}
