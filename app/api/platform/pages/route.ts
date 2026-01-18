import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/platform/pages
 * Get all pages (admin) or filter by category
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient()

    // Check if user is platform admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isAdmin } = await supabase.rpc('is_platform_admin')
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = supabase
        .from('page_content')
        .select('*')
        .order('category')
        .order('title')

    if (category) {
        query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

/**
 * POST /api/platform/pages
 * Create a new page
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isAdmin } = await supabase.rpc('is_platform_admin')
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { slug, title, content, category, excerpt, meta_title, meta_description, is_published } = body

    if (!slug || !title || !category) {
        return NextResponse.json(
            { error: 'slug, title, and category are required' },
            { status: 400 }
        )
    }

    const { data, error } = await supabase
        .from('page_content')
        .insert({
            slug,
            title,
            content: content || '',
            category,
            excerpt,
            meta_title,
            meta_description,
            is_published: is_published || false,
            published_at: is_published ? new Date().toISOString() : null,
            created_by: user.id,
            updated_by: user.id
        })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
}
