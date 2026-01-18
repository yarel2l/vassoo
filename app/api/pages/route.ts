import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * GET /api/pages
 * Get all published pages grouped by category (public endpoint)
 */
export async function GET(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = supabase
        .from('page_content')
        .select('slug, title, category')
        .eq('is_published', true)
        .order('title')

    if (category) {
        query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by category if no specific category was requested
    if (!category) {
        const grouped = {
            about: data?.filter(p => p.category === 'about') || [],
            support: data?.filter(p => p.category === 'support') || [],
            legal: data?.filter(p => p.category === 'legal') || []
        }
        return NextResponse.json(grouped)
    }

    return NextResponse.json(data)
}
