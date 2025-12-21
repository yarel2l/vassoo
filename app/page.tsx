"use client"

import { useEffect } from "react"
import Navbar from "@/components/navbar"
import HeroSection from "@/components/hero-section"
import FeaturedProducts from "@/components/featured-products"
import Footer from "@/components/footer"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import { useGeolocation } from "@/hooks/use-geolocation"
import { toast } from "@/hooks/use-toast"

export default function Home() {
  const { location, loading, error, hasPermission } = useGeolocation()

  useEffect(() => {
    if (location && !loading) {
      const locationText =
        location.city && location.state ? `${location.city}, ${location.state}` : location.country || "Unknown location"

      toast({
        title: "Location detected",
        description: `Showing products available in ${locationText}`,
        duration: 3000,
      })
    }

    if (error && !hasPermission) {
      toast({
        title: "Location access needed",
        description: "Enable location to see local products, taxes, and delivery options",
        variant: "destructive",
        duration: 5000,
      })
    }
  }, [location, loading, error, hasPermission])

  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturedProducts />
      <Footer />
      <MobileBottomNav />
    </main>
  )
}
