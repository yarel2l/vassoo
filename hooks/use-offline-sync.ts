'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OfflineAction {
    id: string
    type: 'status_update'
    table: string
    data: Record<string, unknown>
    timestamp: number
}

const STORAGE_KEY = 'vassoo_offline_queue'

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(true)
    const [pendingActions, setPendingActions] = useState<OfflineAction[]>([])
    const [isSyncing, setIsSyncing] = useState(false)
    const supabase = createClient()

    // Load pending actions from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                setPendingActions(JSON.parse(stored))
            }
        } catch (error) {
            console.error('Error loading offline queue:', error)
        }
    }, [])

    // Save pending actions to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingActions))
        } catch (error) {
            console.error('Error saving offline queue:', error)
        }
    }, [pendingActions])

    // Monitor online status
    useEffect(() => {
        setIsOnline(navigator.onLine)

        const handleOnline = () => {
            setIsOnline(true)
        }

        const handleOffline = () => {
            setIsOnline(false)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Sync when coming back online
    useEffect(() => {
        if (isOnline && pendingActions.length > 0 && !isSyncing) {
            syncPendingActions()
        }
    }, [isOnline, pendingActions.length])

    const syncPendingActions = async () => {
        if (pendingActions.length === 0 || isSyncing) return

        setIsSyncing(true)
        const actionsToSync = [...pendingActions]
        const failedActions: OfflineAction[] = []

        for (const action of actionsToSync) {
            try {
                if (action.type === 'status_update') {
                    const { error } = await supabase
                        .from(action.table)
                        .update(action.data)
                        .eq('id', action.data.id)

                    if (error) {
                        console.error('Sync error:', error)
                        failedActions.push(action)
                    }
                }
            } catch (error) {
                console.error('Error syncing action:', error)
                failedActions.push(action)
            }
        }

        setPendingActions(failedActions)
        setIsSyncing(false)
    }

    const queueAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
        const newAction: OfflineAction = {
            ...action,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        }
        setPendingActions(prev => [...prev, newAction])
    }, [])

    const updateDeliveryStatus = useCallback(async (
        deliveryId: string,
        newStatus: string,
        additionalData?: Record<string, unknown>
    ) => {
        const data = {
            id: deliveryId,
            status: newStatus,
            ...additionalData,
        }

        // If online, try direct update
        if (isOnline) {
            try {
                const { error } = await supabase
                    .from('deliveries')
                    .update(data)
                    .eq('id', deliveryId)

                if (error) throw error
                return { success: true, offline: false }
            } catch (error) {
                console.error('Direct update failed, queueing:', error)
            }
        }

        // Queue for later sync
        queueAction({
            type: 'status_update',
            table: 'deliveries',
            data,
        })

        return { success: true, offline: true }
    }, [isOnline, supabase, queueAction])

    return {
        isOnline,
        pendingActions,
        pendingCount: pendingActions.length,
        isSyncing,
        queueAction,
        updateDeliveryStatus,
        syncNow: syncPendingActions,
    }
}
