import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

const supabase: SupabaseClient | null = supabaseUrl && supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

/**
 * Link guest orders to a newly registered user
 * This is called after a guest user creates an account post-checkout
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      )
    }

    const { email, orderId } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('Error finding user:', userError)
      return NextResponse.json(
        { error: 'Failed to find user' },
        { status: 500 }
      )
    }

    const user = users.users.find(u => u.email === email)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If a specific order ID is provided, link just that order
    if (orderId) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ customer_id: user.id })
        .eq('id', orderId)
        .is('customer_id', null) // Only update if not already linked

      if (updateError) {
        console.error('Error linking order:', updateError)
        return NextResponse.json(
          { error: 'Failed to link order' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Order linked successfully',
        linkedOrders: 1
      })
    }

    // Otherwise, link all guest orders with this email
    const { data: linkedOrders, error: linkError } = await supabase
      .from('orders')
      .update({ customer_id: user.id })
      .eq('customer_email', email)
      .is('customer_id', null) // Only update orders without a customer_id
      .select('id')

    if (linkError) {
      console.error('Error linking orders:', linkError)
      return NextResponse.json(
        { error: 'Failed to link orders' },
        { status: 500 }
      )
    }

    const linkedCount = linkedOrders?.length || 0

    // Also save the shipping address from the most recent order as the user's default address
    if (linkedCount > 0) {
      // Get the most recent order to use its shipping address
      const { data: recentOrder } = await supabase
        .from('orders')
        .select('delivery_address')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (recentOrder?.delivery_address) {
        const address = recentOrder.delivery_address as {
          name?: string
          street?: string
          city?: string
          state?: string
          zip_code?: string
          country?: string
          phone?: string
        }

        // Check if user already has this address saved
        const { data: existingAddress } = await supabase
          .from('user_addresses')
          .select('id')
          .eq('user_id', user.id)
          .eq('street', address.street || '')
          .eq('city', address.city || '')
          .maybeSingle()

        if (!existingAddress && address.street) {
          // Save as new address
          await supabase
            .from('user_addresses')
            .insert({
              user_id: user.id,
              label: 'Home',
              name: address.name || '',
              street: address.street,
              city: address.city || '',
              state: address.state || '',
              zip_code: address.zip_code || '',
              country: address.country || 'United States',
              phone: address.phone || '',
              is_default: true
            })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${linkedCount} order(s) linked to your account`,
      linkedOrders: linkedCount
    })

  } catch (error) {
    console.error('Error in link-guest API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
