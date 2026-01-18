import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/components/language-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { LocationProvider } from "@/contexts/location-context"
import { CartProvider } from "@/contexts/cart-context"
import { FavoritesProvider } from "@/contexts/favorites-context"
import { OrdersProvider } from "@/contexts/orders-context"
import { Toaster } from "@/components/ui/toaster"
import OnboardingWrapper from "@/components/onboarding-wrapper"
import { GoogleAnalytics } from "@/components/google-analytics"
import { getPlatformSEOSettings } from "@/lib/services/seo-settings"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
})

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPlatformSEOSettings()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const fullTitle = `${seo.platformName} - ${seo.platformTagline}`

  return {
    title: fullTitle,
    description: seo.platformDescription,
    keywords: "liquor, spirits, wine, whiskey, vodka, rum, gin, tequila, cognac, premium alcohol, online liquor store",
    authors: [{ name: seo.platformName }],
    creator: seo.platformName,
    publisher: seo.platformName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: baseUrl,
      title: fullTitle,
      description: seo.platformDescription,
      siteName: seo.platformName,
      // Note: opengraph-image.tsx automatically generates the OG image
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: seo.platformDescription,
      creator: `@${seo.platformName.toLowerCase()}`,
      // Note: twitter-image.tsx automatically generates the Twitter image
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
      ],
      apple: '/apple-icon.png',
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <GoogleAnalytics />
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <LocationProvider>
              <LanguageProvider>
                <CartProvider>
                  <FavoritesProvider>
                    <OrdersProvider>
                      <OnboardingWrapper>{children}</OnboardingWrapper>
                      <Toaster />
                    </OrdersProvider>
                  </FavoritesProvider>
                </CartProvider>
              </LanguageProvider>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

