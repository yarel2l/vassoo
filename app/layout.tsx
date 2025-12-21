import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/components/language-provider"
import { CartProvider } from "@/contexts/cart-context"
import { FavoritesProvider } from "@/contexts/favorites-context"
import { OrdersProvider } from "@/contexts/orders-context"
import { Toaster } from "@/components/ui/toaster"
import OnboardingWrapper from "@/components/onboarding-wrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LiquorHub - Premium Spirits & Wine Marketplace",
  description:
    "Discover premium spirits, wines, and liquors from multiple stores with the best prices and deals. Compare offers, read reviews, and enjoy fast delivery.",
  keywords: "liquor, spirits, wine, whiskey, vodka, rum, gin, tequila, cognac, premium alcohol, online liquor store",
  authors: [{ name: "LiquorHub" }],
  creator: "LiquorHub",
  publisher: "LiquorHub",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://liquorhub.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://liquorhub.com",
    title: "LiquorHub - Premium Spirits & Wine Marketplace",
    description: "Discover premium spirits, wines, and liquors from multiple stores with the best prices and deals.",
    siteName: "LiquorHub",
  },
  twitter: {
    card: "summary_large_image",
    title: "LiquorHub - Premium Spirits & Wine Marketplace",
    description: "Discover premium spirits, wines, and liquors from multiple stores with the best prices and deals.",
    creator: "@liquorhub",
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
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
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
        </ThemeProvider>
      </body>
    </html>
  )
}
