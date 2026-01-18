import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/platform/pages/[id]
 * Get a single page by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isAdmin } = await supabase.rpc('is_platform_admin')
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
        .from('page_content')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

/**
 * PUT /api/platform/pages/[id]
 * Update a page
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const { id } = await params
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

    // Get current page to check publish status change
    const { data: currentPage } = await supabase
        .from('page_content')
        .select('is_published')
        .eq('id', id)
        .single()

    const updateData: Record<string, unknown> = {
        updated_by: user.id,
        updated_at: new Date().toISOString()
    }

    if (slug !== undefined) updateData.slug = slug
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (category !== undefined) updateData.category = category
    if (excerpt !== undefined) updateData.excerpt = excerpt
    if (meta_title !== undefined) updateData.meta_title = meta_title
    if (meta_description !== undefined) updateData.meta_description = meta_description

    if (is_published !== undefined) {
        updateData.is_published = is_published
        // Set published_at when first published
        if (is_published && !currentPage?.is_published) {
            updateData.published_at = new Date().toISOString()
        }
    }

    const { data, error } = await supabase
        .from('page_content')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: 'A page with this slug already exists' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

/**
 * DELETE /api/platform/pages/[id]
 * Delete a page
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isAdmin } = await supabase.rpc('is_platform_admin')
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
        .from('page_content')
        .delete()
        .eq('id', id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
