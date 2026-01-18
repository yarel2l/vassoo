import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Types for role information
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

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        console.log('[API /auth/session] User:', user?.email, user?.id)

        if (error || !user) {
            console.log('[API /auth/session] No user or error:', error)
            return NextResponse.json({ user: null, profile: null, isAdmin: false, roles: null }, { status: 200 })
        }

        // Use admin client for checks to bypass RLS
        const adminSupabase = createAdminClient()

        // Get all role-related data in parallel
        const [profileRes, adminRes, driverRes, membershipsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            adminSupabase.from('platform_admins').select('id, role').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
            adminSupabase.from('delivery_drivers').select('id, delivery_company_id, is_active').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
            adminSupabase.from('tenant_memberships').select(`
                id,
                role,
                tenant:tenants (
                    id,
                    name,
                    type
                )
            `).eq('user_id', user.id).eq('is_active', true)
        ])

        // Build complete roles object
        const roles: UserRoles = {
            primary: 'customer',
            isPlatformAdmin: !!adminRes.data,
            isDriver: !!driverRes.data,
            driverInfo: driverRes.data ? {
                id: driverRes.data.id,
                companyId: driverRes.data.delivery_company_id,
                isActive: driverRes.data.is_active
            } : null,
            tenantMemberships: (membershipsRes.data || [])
                .filter((m: any) => m.tenant)
                .map((m: any) => ({
                    tenantId: m.tenant.id,
                    tenantName: m.tenant.name,
                    tenantType: m.tenant.type,
                    role: m.role
                }))
        }

        // Determine primary role with priority
        if (adminRes.data) {
            roles.primary = 'platform_admin'
        } else if (driverRes.data) {
            roles.primary = 'driver'
        } else if (roles.tenantMemberships.some(m => m.tenantType === 'delivery_company')) {
            roles.primary = 'delivery_staff'
        } else if (roles.tenantMemberships.some(m => m.tenantType === 'owner_store')) {
            roles.primary = 'store_staff'
        }

        // Add calculated role to profile for backwards compatibility
        const profileWithRole = profileRes.data ? {
            ...profileRes.data,
            role: roles.primary
        } : null

        console.log('[API /auth/session] Roles:', {
            primary: roles.primary,
            isPlatformAdmin: roles.isPlatformAdmin,
            isDriver: roles.isDriver,
            tenantCount: roles.tenantMemberships.length
        })

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                user_metadata: user.user_metadata
            },
            profile: profileWithRole,
            isAdmin: roles.isPlatformAdmin,
            roles // Full roles information
        }, { status: 200 })
    } catch (error) {
        console.error('[API /auth/session] Error:', error)
        return NextResponse.json({ user: null, profile: null, isAdmin: false, roles: null }, { status: 200 })
    }
}
