import withPWA from 'next-pwa'

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  scope: '/driver',
  sw: 'sw-driver.js',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
      },
    },
    {
      urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-maps-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript - TODO: Fix all type errors and remove this
  typescript: {
    ignoreBuildErrors: true,
  },

  // Note: ESLint config moved to eslint.config.js in Next.js 16
  // The 'eslint' key is no longer supported in next.config.mjs

  // Images configuration for Next.js 16
  images: {
    unoptimized: true,
    // For production, configure remote patterns:
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: '**.supabase.co',
    //   },
    // ],
  },

  // Turbopack is now default in Next.js 16, no need for experimental flag
  // Empty config to acknowledge we're using Turbopack and silence webpack config warning
  turbopack: {},

  // Next.js 16: skipMiddlewareUrlNormalize renamed to skipProxyUrlNormalize
  // skipProxyUrlNormalize: false,

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

export default pwaConfig(nextConfig)
