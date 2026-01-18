'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type NotificationPermissionState = 'default' | 'granted' | 'denied'

interface PushSubscriptionData {
    endpoint: string
    keys: {
        p256dh: string
        auth: string
    }
}

export function usePushNotifications(userId?: string) {
    const [permission, setPermission] = useState<NotificationPermissionState>('default')
    const [isSupported, setIsSupported] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()

    // Check support on mount
    useEffect(() => {
        const supported = 'Notification' in window && 
            'serviceWorker' in navigator && 
            'PushManager' in window

        setIsSupported(supported)

        if (supported) {
            setPermission(Notification.permission as NotificationPermissionState)
        }
    }, [])

    // Get existing subscription
    useEffect(() => {
        const getSubscription = async () => {
            if (!isSupported) return

            try {
                const registration = await navigator.serviceWorker.ready
                const existingSub = await registration.pushManager.getSubscription()
                setSubscription(existingSub)
            } catch (error) {
                console.error('Error getting subscription:', error)
            }
        }

        getSubscription()
    }, [isSupported])

    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            console.warn('Push notifications not supported')
            return false
        }

        try {
            const result = await Notification.requestPermission()
            setPermission(result as NotificationPermissionState)
            return result === 'granted'
        } catch (error) {
            console.error('Error requesting permission:', error)
            return false
        }
    }, [isSupported])

    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported || permission !== 'granted' || !userId) {
            return false
        }

        setIsLoading(true)

        try {
            const registration = await navigator.serviceWorker.ready

            // Get VAPID public key from environment
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidPublicKey) {
                console.error('VAPID public key not configured')
                return false
            }

            // Subscribe to push
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            })

            setSubscription(sub)

            // Save subscription to database
            const subJson = sub.toJSON()
            const subscriptionData: PushSubscriptionData = {
                endpoint: subJson.endpoint!,
                keys: {
                    p256dh: subJson.keys!.p256dh,
                    auth: subJson.keys!.auth,
                },
            }

            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: userId,
                    subscription: subscriptionData,
                    updated_at: new Date().toISOString(),
                })

            if (error) {
                console.error('Error saving subscription:', error)
            }

            return true
        } catch (error) {
            console.error('Error subscribing to push:', error)
            return false
        } finally {
            setIsLoading(false)
        }
    }, [isSupported, permission, userId, supabase])

    const unsubscribe = useCallback(async (): Promise<boolean> => {
        if (!subscription || !userId) return false

        setIsLoading(true)

        try {
            await subscription.unsubscribe()
            setSubscription(null)

            // Remove from database
            await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', userId)

            return true
        } catch (error) {
            console.error('Error unsubscribing:', error)
            return false
        } finally {
            setIsLoading(false)
        }
    }, [subscription, userId, supabase])

    const showLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
        if (permission !== 'granted') return

        try {
            new Notification(title, {
                icon: '/icons/driver-icon-192.png',
                badge: '/icons/driver-icon-72.png',
                ...options,
            })
        } catch (error) {
            // Fallback for mobile browsers
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    icon: '/icons/driver-icon-192.png',
                    badge: '/icons/driver-icon-72.png',
                    ...options,
                })
            })
        }
    }, [permission])

    return {
        isSupported,
        permission,
        isSubscribed: !!subscription,
        isLoading,
        requestPermission,
        subscribe,
        unsubscribe,
        showLocalNotification,
    }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
}
