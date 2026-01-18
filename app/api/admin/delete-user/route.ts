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

export async function DELETE(request: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: 'Server not configured' },
                { status: 500 }
            )
        }

        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        // 1. Delete tenant memberships
        const { error: membershipError } = await supabaseAdmin
            .from('tenant_memberships')
            .delete()
            .eq('user_id', userId)

        if (membershipError) {
            console.error('Error deleting memberships:', membershipError)
            // Continue anyway, these might not exist
        }

        // 2. Delete platform admin record if exists
        const { error: adminError } = await supabaseAdmin
            .from('platform_admins')
            .delete()
            .eq('user_id', userId)

        if (adminError) {
            console.error('Error deleting platform admin:', adminError)
            // Continue anyway
        }

        // 3. Delete delivery driver record if exists
        const { error: driverError } = await supabaseAdmin
            .from('delivery_drivers')
            .delete()
            .eq('user_id', userId)

        if (driverError) {
            console.error('Error deleting driver profile:', driverError)
            // Continue anyway
        }

        // 4. Delete profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId)

        if (profileError) {
            console.error('Error deleting profile:', profileError)
            // Continue to delete auth user anyway
        }

        // 5. Delete auth user (this is the critical one)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (authError) {
            console.error('Error deleting auth user:', authError)
            return NextResponse.json(
                { error: `Failed to delete user authentication: ${authError.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'User and all associated data deleted successfully',
        })
    } catch (error) {
        console.error('Delete user API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
