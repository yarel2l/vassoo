import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

interface RouteParams {
    params: Promise<{ slug: string[] }>
}

/**
 * GET /api/pages/[...slug]
 * Get published page content by slug (public endpoint)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { slug } = await params
    const fullSlug = slug.join('/')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase
        .from('page_content')
        .select('title, content, excerpt, meta_title, meta_description, updated_at')
        .eq('slug', fullSlug)
        .eq('is_published', true)
        .single()

    if (error) {
        if (error.code === 'PGRST116') {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}
