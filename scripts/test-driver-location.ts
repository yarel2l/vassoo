// Script to test driver location fetch
// Run with: npx tsx scripts/test-driver-location.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testDriverLocation() {
    // Use service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Test 1: Fetch ALL drivers (no filters)
    console.log('\n=== Test 1: Fetch ALL drivers ===')
    const { data: drivers, error: driversError } = await supabase
        .from('delivery_drivers')
        .select('id, user_id, is_available, is_active, current_location, profiles(full_name, email)')
    
    if (driversError) {
        console.error('Error fetching drivers:', driversError)
    } else {
        console.log('Drivers found:', drivers?.length)
        drivers?.forEach(d => {
            console.log('---')
            console.log('Driver ID:', d.id)
            console.log('User ID:', d.user_id)
            console.log('Name:', (d.profiles as any)?.full_name)
            console.log('Email:', (d.profiles as any)?.email)
            console.log('is_active:', d.is_active)
            console.log('is_available:', d.is_available)
            console.log('current_location:', d.current_location)
            console.log('current_location type:', typeof d.current_location)
        })
    }
    
    // Test 2: Try the RPC function
    console.log('\n=== Test 2: Test RPC function (dry run) ===')
    // First, get a driver user_id
    if (drivers && drivers.length > 0) {
        const testUserId = drivers[0].user_id
        console.log('Testing with user_id:', testUserId)
        
        const { data: rpcResult, error: rpcError } = await supabase
            .rpc('update_driver_location', {
                p_user_id: testUserId,
                p_longitude: -122.4194,
                p_latitude: 37.7749,
                p_heading: 90
            })
        
        if (rpcError) {
            console.error('RPC Error:', rpcError)
        } else {
            console.log('RPC Result:', rpcResult)
        }
        
        // Fetch again to see the updated location
        console.log('\n=== Test 3: Fetch updated location ===')
        const { data: updatedDriver } = await supabase
            .from('delivery_drivers')
            .select('id, current_location')
            .eq('user_id', testUserId)
            .single()
        
        console.log('Updated driver location:', updatedDriver)
        console.log('Location type:', typeof updatedDriver?.current_location)
        
        if (updatedDriver?.current_location) {
            // Try to parse it
            const loc = updatedDriver.current_location
            if (typeof loc === 'object') {
                console.log('Location as object:', JSON.stringify(loc, null, 2))
            } else if (typeof loc === 'string') {
                console.log('Location as string:', loc)
                // Try to parse WKT
                const match = loc.match(/POINT\s*\(\s*([^\s]+)\s+([^\s)]+)\s*\)/)
                if (match) {
                    console.log('Parsed WKT:', { lng: parseFloat(match[1]), lat: parseFloat(match[2]) })
                }
            }
        }
    }
}

testDriverLocation().catch(console.error)
