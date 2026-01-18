import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

// Create admin client with service role key
const supabaseAdmin: SupabaseClient | null = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : null

export async function POST(request: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: 'Server not configured' },
                { status: 500 }
            )
        }

        const { email, password, fullName, role } = await request.json()

        // Basic validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            )
        }

        // Validate role if provided
        const validRoles = ['customer', 'driver', 'store_admin', 'delivery_admin']
        const userRole = role && validRoles.includes(role) ? role : 'customer'

        // Create user with admin API (bypasses email domain restrictions)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true, // Auto-confirm email for admin-created users
            user_metadata: {
                full_name: fullName,
            },
        })

        if (authError) {
            console.error('Admin create user error:', authError)
            
            // Handle duplicate email
            if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
                return NextResponse.json(
                    { error: 'This email is already registered in the system' },
                    { status: 409 }
                )
            }
            
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            )
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'Failed to create user' },
                { status: 500 }
            )
        }

        // Create/update profile with role
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email: email.trim().toLowerCase(),
                full_name: fullName || null,
                role: userRole, // Set the role (customer, driver, etc.)
            })

        if (profileError) {
            console.error('Profile creation error:', profileError)
            // Don't fail the request, user was created successfully
        }

        return NextResponse.json({
            success: true,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                role: userRole,
            },
        })
    } catch (error) {
        console.error('Create user API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
