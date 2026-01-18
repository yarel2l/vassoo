'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeOrder {
    id: string
    order_number: string
    customer_id: string
    store_id: string
    status: string
    fulfillment_type: 'delivery' | 'pickup'
    total: number
    created_at: string
}

interface RealtimeDelivery {
    id: string
    order_id: string
    delivery_company_id: string
    driver_id: string | null
    status: string
    created_at: string
}

interface UseRealtimeOrdersOptions {
    storeId?: string
    deliveryCompanyId?: string
    onNewOrder?: (order: RealtimeOrder) => void
    onOrderUpdate?: (order: RealtimeOrder) => void
    onNewDelivery?: (delivery: RealtimeDelivery) => void
    onDeliveryUpdate?: (delivery: RealtimeDelivery) => void
    enabled?: boolean
}

export function useRealtimeOrders({
    storeId,
    deliveryCompanyId,
    onNewOrder,
    onOrderUpdate,
    onNewDelivery,
    onDeliveryUpdate,
    enabled = true,
}: UseRealtimeOrdersOptions) {
    const channelRef = useRef<RealtimeChannel | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [connectionError, setConnectionError] = useState<string | null>(null)

    const setupChannel = useCallback(() => {
        if (!enabled || (!storeId && !deliveryCompanyId)) {
            return
        }

        const supabase = createClient()
        
        // Create a unique channel name
        const channelName = storeId 
            ? `store-orders-${storeId}` 
            : `delivery-orders-${deliveryCompanyId}`

        // Clean up existing channel
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
        }

        const channel = supabase.channel(channelName)

        // Subscribe to orders for stores
        if (storeId) {
            channel
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'orders',
                        filter: `store_id=eq.${storeId}`,
                    },
                    (payload) => {
                        console.log('🔔 New order received:', payload.new)
                        onNewOrder?.(payload.new as RealtimeOrder)
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'orders',
                        filter: `store_id=eq.${storeId}`,
                    },
                    (payload) => {
                        console.log('📝 Order updated:', payload.new)
                        onOrderUpdate?.(payload.new as RealtimeOrder)
                    }
                )
        }

        // Subscribe to deliveries for delivery companies
        if (deliveryCompanyId) {
            channel
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'deliveries',
                        filter: `delivery_company_id=eq.${deliveryCompanyId}`,
                    },
                    (payload) => {
                        console.log('🔔 New delivery received:', payload.new)
                        onNewDelivery?.(payload.new as RealtimeDelivery)
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'deliveries',
                        filter: `delivery_company_id=eq.${deliveryCompanyId}`,
                    },
                    (payload) => {
                        console.log('📝 Delivery updated:', payload.new)
                        onDeliveryUpdate?.(payload.new as RealtimeDelivery)
                    }
                )
        }

        channel.subscribe((status) => {
            console.log(`Realtime channel ${channelName} status:`, status)
            if (status === 'SUBSCRIBED') {
                setIsConnected(true)
                setConnectionError(null)
            } else if (status === 'CHANNEL_ERROR') {
                setIsConnected(false)
                setConnectionError('Failed to connect to realtime updates')
            } else if (status === 'TIMED_OUT') {
                setIsConnected(false)
                setConnectionError('Connection timed out')
            }
        })

        channelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
        }
    }, [storeId, deliveryCompanyId, onNewOrder, onOrderUpdate, onNewDelivery, onDeliveryUpdate, enabled])

    useEffect(() => {
        const cleanup = setupChannel()
        return () => {
            cleanup?.()
        }
    }, [setupChannel])

    return {
        isConnected,
        connectionError,
        reconnect: setupChannel,
    }
}
