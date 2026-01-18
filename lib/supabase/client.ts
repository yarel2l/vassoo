import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Singleton pattern - only create one client per browser session
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
    // For SSR/server-side, always create a new client
    if (typeof window === 'undefined') {
        console.log('[Supabase] Server-side: creating fresh client')
        return createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }

    // For client-side, use singleton
    if (clientInstance) {
        console.log('[Supabase] Returning existing client instance')
        return clientInstance
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('[Supabase] Creating new client, URL:', url ? url.substring(0, 30) + '...' : 'MISSING')
    console.log('[Supabase] Creating new client, KEY:', key ? 'present (' + key.length + ' chars)' : 'MISSING')

    if (!url || !key) {
        throw new Error('[Supabase] Missing environment variables!')
    }

    clientInstance = createBrowserClient<Database>(url, key)
    return clientInstance
}

// Deprecated - use createClient() instead
export function getSupabaseClient() {
    return createClient()
}
