import { NextResponse } from 'next/server'

/**
 * GET /api/debug/env-check
 * Debug endpoint to check environment variables availability
 * IMPORTANT: Remove this endpoint before going to production!
 */
export async function GET() {
    // Only show partial values for security
    const maskValue = (value: string | undefined) => {
        if (!value) return 'NOT SET'
        if (value.length <= 8) return '***'
        return value.substring(0, 4) + '...' + value.substring(value.length - 4)
    }

    const envStatus = {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
        
        // Public variables (should be available if set during build)
        NEXT_PUBLIC_SUPABASE_URL: {
            exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            masked: maskValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
        },
        NEXT_PUBLIC_SUPABASE_ANON_KEY: {
            exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            masked: maskValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        },
        NEXT_PUBLIC_APP_URL: {
            exists: !!process.env.NEXT_PUBLIC_APP_URL,
            masked: maskValue(process.env.NEXT_PUBLIC_APP_URL),
        },
        NEXT_PUBLIC_GOOGLE_MAP_ID: {
            exists: !!process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
            masked: maskValue(process.env.NEXT_PUBLIC_GOOGLE_MAP_ID),
        },
        NEXT_PUBLIC_GA_MEASUREMENT_ID: {
            exists: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
            masked: maskValue(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
        },
        
        // Server variables (now with NEXT_PUBLIC_ prefix for Amplify SSR)
        NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: {
            exists: !!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
            masked: maskValue(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY),
        },
        NEXT_PUBLIC_SETTINGS_ENCRYPTION_KEY: {
            exists: !!process.env.NEXT_PUBLIC_SETTINGS_ENCRYPTION_KEY,
            masked: maskValue(process.env.NEXT_PUBLIC_SETTINGS_ENCRYPTION_KEY),
        },

        // AWS Amplify specific
        AWS_REGION: {
            exists: !!process.env.AWS_REGION,
            value: process.env.AWS_REGION || 'NOT SET',
        },
        AWS_EXECUTION_ENV: {
            exists: !!process.env.AWS_EXECUTION_ENV,
            value: process.env.AWS_EXECUTION_ENV || 'NOT SET',
        },
    }

    return NextResponse.json(envStatus, { status: 200 })
}
