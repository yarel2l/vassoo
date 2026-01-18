import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
        console.error('Proxy: auth.getUser() error:', userError)
    }
    if (user) {
        console.log('Proxy: Authenticated user:', user.email, user.id)
    } else {
        console.log('Proxy: No authenticated user found')
    }

    // Protected routes
    const protectedPaths = [
        '/dashboard',
        '/account',
        '/checkout',
        '/orders',
        '/dashboard/platform',
    ]

    const isProtectedPath = protectedPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    )

    if (isProtectedPath && !user) {
        // Redirect to login with return URL
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('returnUrl', request.nextUrl.pathname)
        return NextResponse.redirect(url)
    }

    // Auth pages when logged in
    const authPaths = ['/login', '/register']
    const isAuthPath = authPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    )

    if (isAuthPath && user) {
        // Redirect to home or dashboard
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    // Platform Admin security check
    if (request.nextUrl.pathname.startsWith('/dashboard/platform') && user) {
        console.log('Proxy: Direct platform admin access check for:', user.email)

        // Use a service role client for this check to bypass any RLS bottlenecks
        // This is safe because we are ONLY checking for the verified user.id we got from auth.getUser()
        const adminSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return [] },
                    setAll() { },
                }
            }
        )

        const { data: admin, error } = await adminSupabase
            .from('platform_admins')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle()

        if (error) {
            console.error('Proxy: Platform admin check error:', error)
        }
        console.log('Proxy: Platform admin query data:', admin)

        if (!admin) {
            console.log('Proxy: Access denied to /dashboard/platform, redirecting to home')
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }
        return supabaseResponse
    }

    // Store Dashboard access check - Allow platform admins or users with store tenants
    if (request.nextUrl.pathname.startsWith('/dashboard/store') && user) {
        console.log('Proxy: Store dashboard access check for:', user.email)

        // Check if platform admin first
        const adminSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return [] },
                    setAll() { },
                }
            }
        )

        const { data: admin } = await adminSupabase
            .from('platform_admins')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle()

        if (admin) {
            console.log('Proxy: Platform admin accessing store dashboard - allowed')
            return supabaseResponse
        }

        // Check if user has store tenant
        const { data: storeMembership } = await supabase
            .from('tenant_memberships')
            .select(`
                tenant:tenants!inner (
                    type
                )
            `)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('tenants.type', 'owner_store')
            .limit(1)

        if (!storeMembership || storeMembership.length === 0) {
            console.log('Proxy: No store access, redirecting to onboarding')
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'
            return NextResponse.redirect(url)
        }

        return supabaseResponse
    }

    // Delivery Dashboard access check - Allow platform admins or users with delivery tenants
    if (request.nextUrl.pathname.startsWith('/dashboard/delivery') && user) {
        console.log('Proxy: Delivery dashboard access check for:', user.email)

        // Check if platform admin first
        const adminSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return [] },
                    setAll() { },
                }
            }
        )

        const { data: admin } = await adminSupabase
            .from('platform_admins')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle()

        if (admin) {
            console.log('Proxy: Platform admin accessing delivery dashboard - allowed')
            return supabaseResponse
        }

        // Check if user has delivery tenant
        const { data: deliveryMembership } = await supabase
            .from('tenant_memberships')
            .select(`
                tenant:tenants!inner (
                    type
                )
            `)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('tenants.type', 'delivery_company')
            .limit(1)

        if (!deliveryMembership || deliveryMembership.length === 0) {
            console.log('Proxy: No delivery access, redirecting to onboarding')
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'
            return NextResponse.redirect(url)
        }

        return supabaseResponse
    }

    // Dashboard routing based on role/tenant
    if (request.nextUrl.pathname === '/dashboard' && user) {
        console.log('Proxy: Routing root /dashboard for:', user.email)

        // 1. MUST check platform admin first
        const { data: admin, error: adminError } = await supabase
            .from('platform_admins')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle()

        if (adminError) console.error('Proxy: Dashboard admin check error:', adminError)

        if (admin) {
            console.log('Proxy: Admin found, redirecting to platform dashboard')
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard/platform'
            return NextResponse.redirect(url)
        }

        // 2. Check tenant memberships
        const { data: memberships, error: memError } = await supabase
            .from('tenant_memberships')
            .select(`
                tenant:tenants (
                    type
                )
            `)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)

        if (memError) console.error('Proxy: Membership check error:', memError)

        if (memberships && memberships.length > 0) {
            const tenantType = (memberships[0].tenant as { type?: string })?.type
            const url = request.nextUrl.clone()

            if (tenantType === 'owner_store') {
                console.log('Proxy: Store owner found, redirecting to /dashboard/store')
                url.pathname = '/dashboard/store'
            } else if (tenantType === 'delivery_company') {
                console.log('Proxy: Delivery partner found, redirecting to /dashboard/delivery')
                url.pathname = '/dashboard/delivery'
            } else {
                url.pathname = '/onboarding'
            }

            return NextResponse.redirect(url)
        }

        // 3. Fallback to onboarding
        console.log('Proxy: No roles found, redirecting to onboarding')
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
    }


    // Age verification check for alcohol products
    // This is handled on the client side for better UX

    return supabaseResponse
}
