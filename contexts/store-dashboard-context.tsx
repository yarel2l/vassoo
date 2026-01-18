'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { createClient } from '@/lib/supabase/client'

interface Store {
    id: string
    tenant_id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    email: string | null
    phone: string | null
    is_active: boolean
    average_rating: number | null
    total_reviews: number
}

interface StoreTenant {
    id: string
    name: string
    slug: string
    status: string
    store?: Store
}

interface StoreDashboardContextType {
    // Available stores for the current user
    availableStores: StoreTenant[]
    // Currently selected store
    currentStore: StoreTenant | null
    currentStoreId: string | null
    // Loading state
    isLoading: boolean
    // Select a different store
    selectStore: (tenantId: string) => void
    // Refresh stores list
    refreshStores: () => Promise<void>
}

const StoreDashboardContext = createContext<StoreDashboardContextType | undefined>(undefined)

export function StoreDashboardProvider({ children }: { children: ReactNode }) {
    const { user, tenants, isPlatformAdmin, activeTenantId, setActiveTenantId, isLoading: authLoading } = useAuth()
    const [availableStores, setAvailableStores] = useState<StoreTenant[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const supabase = typeof window !== 'undefined' ? createClient() : null

    // Fetch stores based on user role
    const fetchStores = useCallback(async () => {
        console.log('[StoreDashboard] fetchStores called', {
            hasSupabase: !!supabase,
            hasUser: !!user,
            isPlatformAdmin,
            tenantsCount: tenants.length
        })

        if (!supabase || !user) {
            console.log('[StoreDashboard] No supabase or user, clearing stores')
            setAvailableStores([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)

        try {
            if (isPlatformAdmin) {
                console.log('[StoreDashboard] Fetching ALL stores for platform admin...')
                // Platform admin: fetch ALL store tenants (simple query first, then fetch store details)
                const { data: allTenants, error } = await supabase
                    .from('tenants')
                    .select('id, name, slug, status')
                    .eq('type', 'owner_store')
                    .order('name')

                console.log('[StoreDashboard] Admin query result:', {
                    data: allTenants,
                    error,
                    count: allTenants?.length
                })

                if (error) {
                    console.error('[StoreDashboard] Error fetching all stores:', error)
                    setAvailableStores([])
                } else {
                    // De-duplicate by tenant name to avoid repeated entries (handles DB duplicates)
                    const uniqueTenants = Array.from(
                        new Map((allTenants || []).map(t => [t.name, t])).values()
                    )
                    const stores: StoreTenant[] = uniqueTenants.map(t => ({
                        id: t.id,
                        name: t.name,
                        slug: t.slug,
                        status: t.status || 'pending',
                        store: undefined // We can fetch store details later if needed
                    }))
                    console.log('[StoreDashboard] Setting availableStores for admin:', stores)
                    setAvailableStores(stores)
                }
            } else {
                // Regular user: fetch only their store tenants
                console.log('[StoreDashboard] Fetching stores for regular user...', { tenants })
                const storeTenantIds = tenants
                    .filter(t => t.tenant?.type === 'owner_store')
                    .map(t => t.tenant.id)

                console.log('[StoreDashboard] Store tenant IDs:', storeTenantIds)

                if (storeTenantIds.length === 0) {
                    console.log('[StoreDashboard] No store tenant IDs found')
                    setAvailableStores([])
                } else {
                    const { data: userTenants, error } = await supabase
                        .from('tenants')
                        .select('id, name, slug, status')
                        .in('id', storeTenantIds)
                        .order('name')

                    console.log('[StoreDashboard] User query result:', {
                        data: userTenants,
                        error
                    })

                    if (error) {
                        console.error('[StoreDashboard] Error fetching user stores:', error)
                        setAvailableStores([])
                    } else {
                        // De-duplicate by tenant ID to avoid repeated entries
                        const uniqueTenants = Array.from(
                            new Map((userTenants || []).map(t => [t.id, t])).values()
                        )
                        const stores: StoreTenant[] = uniqueTenants.map(t => ({
                            id: t.id,
                            name: t.name,
                            slug: t.slug,
                            status: t.status || 'pending',
                            store: undefined
                        }))
                        console.log('[StoreDashboard] Setting availableStores for user:', stores)
                        setAvailableStores(stores)
                    }
                }
            }
        } catch (err) {
            console.error('[StoreDashboard] Exception:', err)
            setAvailableStores([])
        } finally {
            setIsLoading(false)
        }
    }, [supabase, user, isPlatformAdmin, tenants])

    // Fetch stores when auth changes
    useEffect(() => {
        if (!authLoading) {
            fetchStores()
        }
    }, [authLoading, fetchStores])

    // Auto-select first store if none selected
    useEffect(() => {
        if (availableStores.length > 0 && !activeTenantId) {
            console.log('[StoreDashboard] Auto-selecting first store:', availableStores[0].id)
            setActiveTenantId(availableStores[0].id)
        }
    }, [availableStores, activeTenantId, setActiveTenantId])

    // Get current store based on activeTenantId
    const currentStore = availableStores.find(s => s.id === activeTenantId) || availableStores[0] || null
    const currentStoreId = currentStore?.store?.id || null

    // Select a store
    const selectStore = useCallback((tenantId: string) => {
        setActiveTenantId(tenantId)
    }, [setActiveTenantId])

    const value: StoreDashboardContextType = {
        availableStores,
        currentStore,
        currentStoreId,
        isLoading: isLoading || authLoading,
        selectStore,
        refreshStores: fetchStores,
    }

    return (
        <StoreDashboardContext.Provider value={value}>
            {children}
        </StoreDashboardContext.Provider>
    )
}

export function useStoreDashboard() {
    const context = useContext(StoreDashboardContext)
    if (context === undefined) {
        throw new Error('useStoreDashboard must be used within a StoreDashboardProvider')
    }
    return context
}
