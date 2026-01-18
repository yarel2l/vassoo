'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type TenantMembership = {
    id: string
    role: 'owner' | 'admin' | 'manager' | 'employee'
    tenant: {
        id: string
        name: string
        slug: string
        type: 'owner_store' | 'delivery_company'
        status: 'pending' | 'active' | 'suspended' | 'inactive'
    }
}

// Complete roles information from session
interface UserRoles {
    primary: 'customer' | 'driver' | 'store_staff' | 'delivery_staff' | 'platform_admin'
    isPlatformAdmin: boolean
    isDriver: boolean
    driverInfo: { id: string; companyId: string; isActive: boolean } | null
    tenantMemberships: Array<{
        tenantId: string
        tenantName: string
        tenantType: 'owner_store' | 'delivery_company'
        role: 'owner' | 'admin' | 'manager' | 'employee'
    }>
}

// Simplified user type for our needs
interface SimpleUser {
    id: string
    email: string | undefined
    user_metadata?: Record<string, unknown>
}

interface AuthContextType {
    user: SimpleUser | null
    profile: Profile | null
    tenants: TenantMembership[]
    roles: UserRoles | null
    isLoading: boolean
    isAgeVerified: boolean
    isPlatformAdmin: boolean
    isDriver: boolean
    activeTenantId: string | null
    setActiveTenantId: (id: string | null) => void
    currentTenant: TenantMembership | null
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
    signOut: () => void
    refreshAuth: () => Promise<void>
    verifyAge: (birthDate: string) => Promise<{ error: Error | null }>
    refreshTenants: () => Promise<void>
}


const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SimpleUser | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [tenants, setTenants] = useState<TenantMembership[]>([])
    const [roles, setRoles] = useState<UserRoles | null>(null)
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
    const [activeTenantId, setActiveTenantIdState] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Supabase client (only for data operations, not auth)
    const supabase = typeof window !== 'undefined' ? createClient() : null

    // Helper to change active tenant and persist it
    const setActiveTenantId = useCallback((id: string | null) => {
        setActiveTenantIdState(id)
        if (id) {
            localStorage.setItem('vassoo_active_tenant_id', id)
        } else {
            localStorage.removeItem('vassoo_active_tenant_id')
        }
    }, [])

    // Fetch auth state from server API
    const fetchAuthState = useCallback(async () => {
        console.log('[Auth] Fetching auth state from API...')

        try {
            const response = await fetch('/api/auth/session', {
                credentials: 'include',
                cache: 'no-store'
            })

            if (!response.ok) {
                console.log('[Auth] API response not ok:', response.status)
                return null
            }

            const data = await response.json()
            console.log('[Auth] API response:', data.user?.email || 'no user')
            return data
        } catch (error) {
            console.error('[Auth] Failed to fetch auth state:', error)
            return null
        }
    }, [])

    // Fetch tenants for a user
    const fetchTenants = useCallback(async (userId: string) => {
        if (!supabase) return []

        const { data } = await supabase
            .from('tenant_memberships')
            .select(`
                id,
                role,
                tenant:tenants (
                    id,
                    name,
                    slug,
                    type,
                    status
                )
            `)
            .eq('user_id', userId)
            .eq('is_active', true)

        const memberships = (data || []) as unknown as TenantMembership[]

        // De-duplicate by tenant ID to avoid showing same tenant multiple times
        const uniqueByTenant = Array.from(
            new Map(memberships.filter(m => m.tenant).map(m => [m.tenant.id, m])).values()
        )

        return uniqueByTenant
    }, [supabase])

    // Initialize auth state
    const refreshAuth = useCallback(async () => {
        setIsLoading(true)

        const authData = await fetchAuthState()

        if (authData?.user) {
            setUser({
                id: authData.user.id,
                email: authData.user.email,
                user_metadata: authData.user.user_metadata
            })
            setProfile(authData.profile || null)
            setIsPlatformAdmin(authData.isAdmin || false)
            setRoles(authData.roles || null)

            // Fetch tenants
            const userTenants = await fetchTenants(authData.user.id)
            setTenants(userTenants)

            // Restore active tenant from localStorage
            const savedTenantId = localStorage.getItem('vassoo_active_tenant_id')
            if (savedTenantId) {
                setActiveTenantIdState(savedTenantId)
            }
        } else {
            setUser(null)
            setProfile(null)
            setTenants([])
            setRoles(null)
            setIsPlatformAdmin(false)
        }

        setIsLoading(false)
    }, [fetchAuthState, fetchTenants])

    // Initialize on mount
    useEffect(() => {
        refreshAuth()
    }, [refreshAuth])

    // Sign in - uses Supabase client then refreshes
    const signIn = async (email: string, password: string) => {
        console.log('[Auth] signIn called')

        if (!supabase) {
            return { error: new Error('Not initialized') }
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                console.error('[Auth] signIn error:', error.message)
                return { error }
            }

            console.log('[Auth] signIn successful, refreshing auth state...')
            // Refresh auth state after successful login
            await refreshAuth()

            return { error: null }
        } catch (err) {
            console.error('[Auth] signIn exception:', err)
            return { error: err as Error }
        }
    }

    // Sign up - uses Supabase client
    const signUp = async (email: string, password: string, fullName: string) => {
        console.log('[Auth] signUp called')

        if (!supabase) {
            return { error: new Error('Not initialized') }
        }

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            })

            if (error) {
                console.error('[Auth] signUp error:', error.message)
            }

            return { error }
        } catch (err) {
            console.error('[Auth] signUp exception:', err)
            return { error: err as Error }
        }
    }

    // Sign out - calls server API and redirects
    const signOut = () => {
        console.log('[Auth] signOut called')

        // Clear state immediately for instant UI feedback
        setUser(null)
        setProfile(null)
        setTenants([])
        setRoles(null)
        setIsPlatformAdmin(false)
        setActiveTenantIdState(null)
        localStorage.removeItem('vassoo_active_tenant_id')

        // Call server-side logout (don't await - just fire and redirect)
        fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        }).then(() => {
            console.log('[Auth] Server logout completed')
        }).catch((err) => {
            console.error('[Auth] Server logout error:', err)
        })

        // Redirect immediately
        console.log('[Auth] Redirecting to home...')
        window.location.href = '/'
    }

    // Verify age - updates profile
    const verifyAge = async (birthDate: string): Promise<{ error: Error | null }> => {
        if (!user || !supabase) {
            return { error: new Error('Not authenticated') }
        }

        const birth = new Date(birthDate)
        const today = new Date()
        const age = today.getFullYear() - birth.getFullYear()
        const monthDiff = today.getMonth() - birth.getMonth()

        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())
            ? age - 1
            : age

        if (actualAge < 21) {
            return { error: new Error('You must be at least 21 years old') }
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                birth_date: birthDate,
                age_verified: true,
                age_verified_at: new Date().toISOString(),
            })
            .eq('id', user.id)

        if (!error) {
            await refreshAuth()
        }

        return { error }
    }

    // Refresh tenants only
    const refreshTenants = async () => {
        if (!user) return
        const userTenants = await fetchTenants(user.id)
        setTenants(userTenants)
    }

    // Computed values
    const isAgeVerified = profile?.age_verified ?? false
    const isDriver = roles?.isDriver ?? false
    const currentTenant = tenants.find(t => t.tenant?.id === activeTenantId) ?? tenants[0] ?? null

    const value: AuthContextType = {
        user,
        profile,
        tenants,
        roles,
        isLoading,
        isAgeVerified,
        isPlatformAdmin,
        isDriver,
        activeTenantId,
        setActiveTenantId,
        currentTenant,
        signIn,
        signUp,
        signOut,
        refreshAuth,
        verifyAge,
        refreshTenants,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
