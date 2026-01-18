import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function debugAdmin() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const email = 'admin@vassoo.com'
    console.log(`Checking user: ${email}`)

    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
        console.error('Error listing users:', userError)
        return
    }

    const user = userData.users.find(u => u.email === email)
    if (!user) {
        console.error('User not found in Auth')
        return
    }

    console.log('User found in Auth:', user.id)

    const { data: adminData, error: adminError } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('user_id', user.id)

    if (adminError) {
        console.error('Error checking platform_admins:', adminError)
    } else {
        console.log('platform_admins row:', adminData)
    }

    const { data: memData, error: memError } = await supabase
        .from('tenant_memberships')
        .select(`
            id,
            role,
            is_active,
            tenant:tenants(name, type)
        `)
        .eq('user_id', user.id)

    if (memError) {
        console.error('Error checking tenant_memberships:', memError)
    } else {
        console.log('tenant_memberships row:', JSON.stringify(memData, null, 2))
    }
}

debugAdmin()
