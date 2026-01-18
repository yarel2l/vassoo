import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        const supabase = await createClient()

        // Sign out server-side (this clears the cookies)
        const { error } = await supabase.auth.signOut()

        if (error) {
            console.error('[API /auth/logout] Error:', error)
        }

        // Return success - the client will handle the redirect
        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.error('[API /auth/logout] Exception:', error)
        return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 })
    }
}
