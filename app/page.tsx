"use client"

import { useEffect, useRef } from "react"
import Navbar from "@/components/navbar"
import HeroSection from "@/components/hero-section"
import FlashSales from "@/components/flash-sales"
import HomePromotions from "@/components/home-promotions"
import HomeMixMatch from "@/components/home-mix-match"
import FeaturedProducts from "@/components/featured-products"
import Footer from "@/components/footer"
import MobileBottomNav from "@/components/mobile-bottom-nav"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FlashSales />
      <HomePromotions />
      <HomeMixMatch />
      <FeaturedProducts />
      <Footer />
      <MobileBottomNav />
    </main>
  )
}
