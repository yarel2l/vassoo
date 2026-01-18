import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAnalyticsData() {
    console.log('--- Analytics Data Audit ---')

    // 1. Orders
    const { count: orderCount, error: orderErr } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

    console.log('Total Orders:', orderCount || 0)

    const { data: orders } = await supabase
        .from('orders')
        .select('created_at, total, status')
        .order('created_at', { ascending: false })
        .limit(10)

    console.log('Recent Orders Sample:', orders)

    // 2. Revenue Shares (Platform Profit)
    const { count: shareCount } = await supabase
        .from('revenue_shares')
        .select('*', { count: 'exact', head: true })

    console.log('Revenue Share Records:', shareCount || 0)

    // 3. Profiles (User Growth)
    const { count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    console.log('Total Profiles:', profileCount || 0)

    // 4. Stores (Store Growth)
    const { count: storeCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true })

    console.log('Total Stores:', storeCount || 0)

    console.log('--- Audit Finished ---')
}

checkAnalyticsData()
