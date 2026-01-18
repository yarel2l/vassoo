import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Check if user needs age verification
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('age_verified')
                    .eq('id', user.id)
                    .single()

                // If not age verified, redirect to verification page
                if (!profile?.age_verified) {
                    return NextResponse.redirect(`${origin}/verify-age?returnUrl=${encodeURIComponent(next)}`)
                }
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // URL to redirect to after an error
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
