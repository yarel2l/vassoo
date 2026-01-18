import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupSettings() {
    console.log('Setting up platform_settings table...')

    // Create table using RPC or raw SQL if enabled
    // Since we don't have a direct SQL runner via JS client without an RPC, 
    // and we don't have a DB URL, we can't easily create a table from here
    // UNLESS there is an existing migration system or we use the SQL editor.

    console.warn('Note: Table creation via standard Supabase JS client requires an RPC function.')
    console.warn('I will attempt to check if the table exists by querying it.')

    const { error } = await supabase.from('platform_settings').select('id').limit(1)

    if (error && error.code === '42P01') {
        console.error('Table platform_settings does not exist. Please run the following SQL in Supabase SQL Editor:')
        console.log(`
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    default_currency TEXT DEFAULT 'USD',
    default_language TEXT DEFAULT 'en-US',
    platform_name TEXT DEFAULT 'Vassoo Marketplace',
    maintenance_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.platform_settings (id, default_currency, default_language, platform_name)
VALUES (1, 'USD', 'en-US', 'Vassoo Marketplace')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow platform admins to manage settings" ON public.platform_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
    );
        `)
    } else if (error) {
        console.error('Error checking table:', error.message)
    } else {
        console.log('Table platform_settings already exists.')
    }
}

setupSettings()
