'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useStoreDashboard } from '@/contexts/store-dashboard-context'
import { createClient } from '@/lib/supabase/client'
import { LocationForm } from '../components/location-form'
import { Loader2, MapPin } from 'lucide-react'

export default function NewLocationPage() {
    const { isLoading: authLoading } = useAuth()
    const { currentStore, isLoading: storeLoading } = useStoreDashboard()
    const [storeId, setStoreId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const tenantId = currentStore?.id

    const fetchStoreId = useCallback(async () => {
        if (!tenantId) {
            setIsLoading(false)
            return
        }

        try {
            const supabase = createClient()
            const { data: stores } = await supabase
                .from('stores')
                .select('id')
                .eq('tenant_id', tenantId)
                .limit(1)

            if (stores && stores.length > 0) {
                setStoreId(stores[0].id)
            }
        } catch (err) {
            console.error('Error fetching store:', err)
        } finally {
            setIsLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        fetchStoreId()
    }, [fetchStoreId])

    if (authLoading || storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        )
    }

    if (!storeId) {
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

    return <LocationForm storeId={storeId} mode="create" />
}
